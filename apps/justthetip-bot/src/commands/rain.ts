// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-15

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  VoiceBasedChannel,
  Message,
} from 'discord.js';
import type { MessageCreateOptions, MessagePayload } from 'discord.js';
import type { Command } from '../types.js';
import { findUserByDiscordId } from '@tiltcheck/db';
import { parseAmountNL } from '@tiltcheck/natural-language-parser';
import { getUsdPriceSync } from '@tiltcheck/utils';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
} from '@solana/web3.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
const COLLECTOR_TRIPWIRE_LABEL = 'BOT/COLLECTOR CLAIM';
const ESCROW_DIR = path.join(process.cwd(), 'tmp', 'rain-escrow');
const FUNDING_POLL_ATTEMPTS = 30;
const FUNDING_POLL_INTERVAL_MS = 5000;
const MAX_RAIN_RECIPIENTS = 15;

type ParsedAmount = {
  totalSol: number;
  amountLamports: number;
};

type SendableChannel = {
  send: (options: string | MessagePayload | MessageCreateOptions) => Promise<Message>;
};

interface EscrowRecord {
  id: string;
  mode: 'voice' | 'channel';
  pubkey: string;
  encryptedSecret: string;
  totalLamports: number;
  hostDiscordId: string;
  guildId: string;
  channelId: string;
  startedAt: number;
}

type HostUser = Awaited<ReturnType<typeof findUserByDiscordId>>;

async function refundEscrowToHost(
  hostDiscordId: string,
  escrow: Keypair,
  amountLamports: number
): Promise<{ refunded: boolean; signature?: string; reason?: string }> {
  const host = await findUserByDiscordId(hostDiscordId);
  if (!host?.wallet_address) {
    return {
      refunded: false,
      reason: 'the host has no linked wallet for refund',
    };
  }

  const refundTransaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: escrow.publicKey,
      toPubkey: new PublicKey(host.wallet_address),
      lamports: amountLamports,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, refundTransaction, [escrow]);
  return {
    refunded: true,
    signature,
  };
}

function getEncryptionPassword(): string | null {
  const candidates = [
    process.env.RAIN_ESCROW_SECRET,
    process.env.JTT_DISCORD_BOT_TOKEN,
    process.env.DISCORD_TOKEN,
    process.env.DISCORD_BOT_TOKEN,
    process.env.JWT_SECRET,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function encryptSecret(hexKey: string): string {
  const password = getEncryptionPassword();
  if (!password) {
    throw new Error('RAIN_ESCROW_SECRET, JTT_DISCORD_BOT_TOKEN, DISCORD_TOKEN, DISCORD_BOT_TOKEN, or JWT_SECRET must be set for rain escrow encryption.');
  }
  const key = crypto.createHash('sha256').update(password).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(hexKey, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function getEscrowEncryptionError(): string | null {
  if (getEncryptionPassword()) {
    return null;
  }

  return '[ESCROW FAILED] Set `RAIN_ESCROW_SECRET`, `JTT_DISCORD_BOT_TOKEN`, `DISCORD_TOKEN`, `DISCORD_BOT_TOKEN`, or `JWT_SECRET` before using `/rain`.';
}

function saveEscrowRecord(record: EscrowRecord): boolean {
  try {
    fs.mkdirSync(ESCROW_DIR, { recursive: true });
    fs.writeFileSync(path.join(ESCROW_DIR, `${record.id}.json`), JSON.stringify(record), 'utf8');
    return true;
  } catch (error) {
    console.error('[Rain] Failed to persist escrow record:', error);
    return false;
  }
}

function deleteEscrowRecord(id: string): void {
  try {
    const filePath = path.join(ESCROW_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('[Rain] Failed to delete escrow record:', error);
  }
}

export function recoverOrphanedRainEscrows(): void {
  try {
    if (!fs.existsSync(ESCROW_DIR)) return;
    const files = fs.readdirSync(ESCROW_DIR).filter((file) => file.endsWith('.json'));
    if (files.length === 0) return;
    console.warn(`[rain] WARNING: ${files.length} orphaned escrow(s) found in ${ESCROW_DIR}`);
    console.warn('[rain] Review these files manually. Funds may be recoverable via the encrypted keypairs.');
    files.forEach((file) => console.warn(`  - ${file}`));
  } catch (_error) {
    // Non-fatal on startup.
  }
}

function getVoiceChannel(interaction: ChatInputCommandInteraction): VoiceBasedChannel | null {
  const member = interaction.member;
  if (!member || typeof member !== 'object' || !('voice' in member)) {
    return null;
  }

  const voiceState = member.voice;
  if (!voiceState || typeof voiceState !== 'object' || !('channel' in voiceState)) {
    return null;
  }

  return voiceState.channel as VoiceBasedChannel | null;
}

function getSendableChannel(interaction: ChatInputCommandInteraction): SendableChannel | null {
  const channel = interaction.channel;
  if (!channel || !('send' in channel) || typeof channel.send !== 'function') {
    return null;
  }

  return channel as SendableChannel;
}

async function parseRequestedAmount(
  interaction: ChatInputCommandInteraction,
  amountRaw: string,
): Promise<ParsedAmount | null> {
  const parseResult = parseAmountNL(amountRaw);
  if (!parseResult.success || !parseResult.data) {
    await interaction.editReply({ content: '[INVALID INPUT] Use "$10" or "0.5 SOL".' });
    return null;
  }

  let totalSol = parseResult.data.value;
  if (parseResult.data.currency === 'USD') {
    try {
      const price = getUsdPriceSync('SOL');
      totalSol = parseResult.data.value / price;
    } catch {
      await interaction.editReply({ content: '[PRICE FEED DOWN] Specify the amount in SOL.' });
      return null;
    }
  }

  return {
    totalSol,
    amountLamports: Math.floor(totalSol * LAMPORTS_PER_SOL),
  };
}

async function announceCollectorBlock(channel: SendableChannel | null, userId: string): Promise<void> {
  await channel?.send(
    `[ANTI-COLLECTOR] <@${userId}> tripped the rain collector check and is blocked from this payout. ` +
    `Channel rain is for actual people, not script-fed wallet farming.`
  ).catch(() => {});
}

function buildEscrowFailureMessage(prefix: string, reason: string, escrow: Keypair, escrowId: string): string {
  return `${prefix} ${reason} Escrow still holds the balance: \`${escrow.publicKey.toBase58()}\`\nSession ID: \`${escrowId}\``;
}

async function requireRefundableHost(
  interaction: ChatInputCommandInteraction,
  hostDiscordId: string,
): Promise<HostUser> {
  const host = await findUserByDiscordId(hostDiscordId).catch(() => null);
  if (!host?.wallet_address) {
    await interaction.editReply({
      content: '[LINK REQUIRED] Link your wallet before using `/rain` so failed payouts can be refunded safely.',
    });
    return null;
  }

  return host;
}

async function waitForFunding(
  escrow: Keypair,
  targetLamports: number,
): Promise<{ funded: boolean; balance: number }> {
  let balance = 0;

  for (let i = 0; i < FUNDING_POLL_ATTEMPTS; i++) {
    balance = await connection.getBalance(escrow.publicKey).catch(() => 0);
    if (balance >= targetLamports) {
      return { funded: true, balance };
    }
    await new Promise((resolve) => setTimeout(resolve, FUNDING_POLL_INTERVAL_MS));
  }

  return { funded: false, balance };
}

async function executeVoiceRain(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({
      content: '[VOICE ONLY] `/rain voice` only works inside a server voice channel.',
      ephemeral: true,
    });
    return;
  }

  const amountRaw = interaction.options.getString('amount', true);
  await interaction.deferReply();
  const channel = getSendableChannel(interaction);

  const voiceChannel = getVoiceChannel(interaction);
  if (!voiceChannel) {
    await interaction.editReply({
      content: '[NO VOICE ROOM] Join the voice channel you want to rain on first.',
    });
    return;
  }

  const parsedAmount = await parseRequestedAmount(interaction, amountRaw);
  if (!parsedAmount) return;

  const host = await requireRefundableHost(interaction, interaction.user.id);
  if (!host) return;

  const encryptionError = getEscrowEncryptionError();
  if (encryptionError) {
    await interaction.editReply({ content: encryptionError });
    return;
  }

  const initialRecipients = [...voiceChannel.members.values()]
    .filter((member) => !member.user.bot && member.id !== interaction.user.id);
  if (initialRecipients.length === 0) {
    await interaction.editReply({
      content: '[EMPTY ROOM] Nobody else is in the voice room yet. Wait for the room to fill before using `/rain voice`.',
    });
    return;
  }

  if (initialRecipients.length > MAX_RAIN_RECIPIENTS) {
    await interaction.editReply({
      content: `[ROOM TOO LARGE] \`/rain voice\` currently supports up to ${MAX_RAIN_RECIPIENTS} recipients per payout.`,
    });
    return;
  }

  const { totalSol, amountLamports } = parsedAmount;
  if (amountLamports < initialRecipients.length) {
    await interaction.editReply({
      content: `[AMOUNT TOO SMALL] Raise the amount so each of the ${initialRecipients.length} current recipients can receive at least 1 lamport.`,
    });
    return;
  }

  const escrow = Keypair.generate();
  const escrowId = `${interaction.guildId ?? 'guild'}-${interaction.channelId}-voice-${Date.now()}`;
  const lockedVoiceChannelId = voiceChannel.id;
  const lockedVoiceChannelName = voiceChannel.name;
  const solanaPayUrl = `solana:${escrow.publicKey.toBase58()}?amount=${totalSol.toFixed(4)}&label=Voice+Rain&message=Fund+the+voice+room+split`;

  if (!saveEscrowRecord({
    id: escrowId,
    mode: 'voice',
    pubkey: escrow.publicKey.toBase58(),
    encryptedSecret: encryptSecret(Buffer.from(escrow.secretKey).toString('hex')),
    totalLamports: amountLamports,
    hostDiscordId: interaction.user.id,
    guildId: interaction.guildId ?? '',
    channelId: interaction.channelId,
    startedAt: Date.now(),
  })) {
    await interaction.editReply({
      content: '[ESCROW FAILED] Could not persist the rain escrow safely, so funding was blocked.',
    });
    return;
  }

  const fundBtn = new ButtonBuilder()
    .setLabel('[FUND VOICE RAIN]')
    .setStyle(ButtonStyle.Link)
    .setURL(solanaPayUrl);

  const fundRow = new ActionRowBuilder<ButtonBuilder>().addComponents(fundBtn);

  const fundEmbed = new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle('[RAIN THE ROOM]')
    .setDescription(
      `You're lining up **${totalSol.toFixed(4)} SOL** for everyone else in **${lockedVoiceChannelName}**.\n\n` +
      `Fund the escrow to lock it in.\n\n**Escrow Address:** \`${escrow.publicKey.toBase58()}\`\n\n` +
      `When funding lands, the bot snapshots that same voice room and splits the rain equally across linked wallets.`
    )
    .setFooter({ text: 'Rain voice = direct room split. Rain channel = channel airdrop.' });

  await interaction.editReply({ embeds: [fundEmbed], components: [fundRow] });

  const fundingResult = await waitForFunding(escrow, amountLamports);
  if (!fundingResult.funded) {
    if (fundingResult.balance <= 0) {
      deleteEscrowRecord(escrowId);
    }
    await interaction.editReply({
      content: fundingResult.balance > 0
        ? buildEscrowFailureMessage('[FUNDING TIMEOUT]', 'Escrow was only partially funded before the timer expired.', escrow, escrowId)
        : '[FUNDING TIMEOUT] Escrow was not funded in time. Rain cancelled.',
      components: [],
    });
    return;
  }

  await interaction.editReply({
    content: `[LOCKED] Escrow funded. Locking recipients from **${lockedVoiceChannelName}** now...`,
    components: [],
  });

  const currentVoiceChannel = interaction.guild.channels.cache.get(lockedVoiceChannelId) as VoiceBasedChannel | null;
  const recipientsInVoice = [...(currentVoiceChannel?.members.values() ?? [])]
    .filter((member) => !member.user.bot && member.id !== interaction.user.id);

  if (recipientsInVoice.length > MAX_RAIN_RECIPIENTS) {
    try {
      const refund = await refundEscrowToHost(interaction.user.id, escrow, amountLamports);
      if (refund.refunded) {
        deleteEscrowRecord(escrowId);
        await channel?.send(
          `[RAIN ABORTED] ${recipientsInVoice.length} recipients were present when the escrow landed, which exceeds the current payout limit of ${MAX_RAIN_RECIPIENTS}. Refunded the host.\n\n**Tx:** https://solscan.io/tx/${refund.signature}`
        );
      } else {
        await channel?.send(
          buildEscrowFailureMessage('[RAIN ABORTED]', `Recipient count exceeded the payout limit and refund failed because ${refund.reason ?? 'the host wallet is unavailable'}.`, escrow, escrowId)
        );
      }
    } catch (error) {
      console.error('[Rain voice] Refund error after oversized room:', error);
      await channel?.send(buildEscrowFailureMessage('[REFUND FAILED]', 'Voice rain exceeded the payout limit and could not refund automatically.', escrow, escrowId));
    }
    return;
  }

  if (recipientsInVoice.length === 0) {
    try {
      const refund = await refundEscrowToHost(interaction.user.id, escrow, amountLamports);
      if (refund.refunded) {
        deleteEscrowRecord(escrowId);
        await channel?.send(
          `[RAIN DEAD] Nobody else was still in **${lockedVoiceChannelName}** when the escrow landed. ` +
          `Refunded the host.\n\n**Tx:** https://solscan.io/tx/${refund.signature}`
        );
      } else {
        await channel?.send(
          buildEscrowFailureMessage('[RAIN DEAD]', `Nobody else was still in **${lockedVoiceChannelName}**, and refund failed because ${refund.reason ?? 'the host wallet is unavailable'}.`, escrow, escrowId)
        );
      }
    } catch (error) {
      console.error('[Rain voice] Refund error after empty room:', error);
      await channel?.send(buildEscrowFailureMessage('[REFUND FAILED]', 'Voice rain could not refund the empty-room escrow.', escrow, escrowId));
    }
    return;
  }

  const payoutRecipients: Array<{ discordId: string; wallet: string }> = [];
  const skippedRecipients: string[] = [];

  for (const member of recipientsInVoice) {
    const user = await findUserByDiscordId(member.id).catch(() => null);
    if (user?.wallet_address) {
      payoutRecipients.push({ discordId: member.id, wallet: user.wallet_address });
    } else {
      skippedRecipients.push(member.id);
    }
  }

  if (payoutRecipients.length === 0) {
    try {
      const refund = await refundEscrowToHost(interaction.user.id, escrow, amountLamports);
      if (refund.refunded) {
        deleteEscrowRecord(escrowId);
        await channel?.send(
          `[NO ELIGIBLE RAIN] Nobody in **${lockedVoiceChannelName}** had a linked wallet. Refunded the host.\n\n` +
          `**Tx:** https://solscan.io/tx/${refund.signature}`
        );
      } else {
        await channel?.send(
          buildEscrowFailureMessage('[NO ELIGIBLE RAIN]', `Nobody in **${lockedVoiceChannelName}** had a linked wallet, and refund failed because ${refund.reason ?? 'the host wallet is unavailable'}.`, escrow, escrowId)
        );
      }
    } catch (error) {
      console.error('[Rain voice] Refund error after wallet filter:', error);
      await channel?.send(buildEscrowFailureMessage('[REFUND FAILED]', 'Voice rain had no eligible wallets and could not refund the host.', escrow, escrowId));
    }
    return;
  }

  const lamportsPerUser = Math.floor(amountLamports / payoutRecipients.length);
  if (lamportsPerUser <= 0) {
    try {
      const refund = await refundEscrowToHost(interaction.user.id, escrow, amountLamports);
      if (refund.refunded) {
        deleteEscrowRecord(escrowId);
        await channel?.send(
          `[RAIN TOO THIN] The funded amount was too small to split across ${payoutRecipients.length} recipients. Refunded the host.\n\n**Tx:** https://solscan.io/tx/${refund.signature}`
        );
      } else {
        await channel?.send(
          buildEscrowFailureMessage('[RAIN TOO THIN]', `The funded amount was too small to split across ${payoutRecipients.length} recipients, and refund failed because ${refund.reason ?? 'the host wallet is unavailable'}.`, escrow, escrowId)
        );
      }
    } catch (error) {
      console.error('[Rain voice] Refund error after zero-value split:', error);
      await channel?.send(buildEscrowFailureMessage('[REFUND FAILED]', 'Voice rain could not unwind a zero-value split.', escrow, escrowId));
    }
    return;
  }

  const dust = amountLamports - lamportsPerUser * payoutRecipients.length;
  const transaction = new Transaction();

  for (const recipient of payoutRecipients) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: escrow.publicKey,
        toPubkey: new PublicKey(recipient.wallet),
        lamports: lamportsPerUser,
      })
    );
  }

  if (dust > 0) {
    const refund = await findUserByDiscordId(interaction.user.id).catch(() => null);
    if (refund?.wallet_address) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: escrow.publicKey,
          toPubkey: new PublicKey(refund.wallet_address),
          lamports: dust,
        })
      );
    }
  }

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [escrow]);
    deleteEscrowRecord(escrowId);
    const paidList = payoutRecipients
      .map((recipient) => `<@${recipient.discordId}> — **${(lamportsPerUser / LAMPORTS_PER_SOL).toFixed(4)} SOL**`)
      .join('\n');
    const skippedLine = skippedRecipients.length > 0
      ? `\n\n**Skipped (no linked wallet):** ${skippedRecipients.map((id) => `<@${id}>`).join(', ')}`
      : '';

    await channel?.send(
      `**[RAIN SENT]** ${interaction.user} rained on **${lockedVoiceChannelName}**.\n\n` +
      `${paidList}${skippedLine}\n\n**Tx:** https://solscan.io/tx/${signature}`
    );
  } catch (error) {
    console.error('[Rain voice] Payout error:', error);
    await channel?.send(
      buildEscrowFailureMessage('[PAYOUT FAILED]', 'Voice rain could not distribute funds.', escrow, escrowId)
    );
  }
}

async function executeChannelRain(interaction: ChatInputCommandInteraction): Promise<void> {
  const amountRaw = interaction.options.getString('amount', true);
  const maxUsers = interaction.options.getInteger('users', true);
  const timeLimit = interaction.options.getInteger('time') || 60;

  await interaction.deferReply();
  const channel = getSendableChannel(interaction);

  const parsedAmount = await parseRequestedAmount(interaction, amountRaw);
  if (!parsedAmount) return;

  const host = await requireRefundableHost(interaction, interaction.user.id);
  if (!host) return;

  const encryptionError = getEscrowEncryptionError();
  if (encryptionError) {
    await interaction.editReply({ content: encryptionError });
    return;
  }

  const { totalSol, amountLamports } = parsedAmount;
  if (maxUsers > MAX_RAIN_RECIPIENTS) {
    await interaction.editReply({
      content: `[PAYOUT LIMIT] \`/rain channel\` currently supports up to ${MAX_RAIN_RECIPIENTS} recipients per payout.`,
    });
    return;
  }

  if (amountLamports < maxUsers) {
    await interaction.editReply({
      content: `[AMOUNT TOO SMALL] Raise the amount so each of the ${maxUsers} potential recipients can receive at least 1 lamport.`,
    });
    return;
  }

  const escrow = Keypair.generate();
  const escrowId = `${interaction.guildId ?? 'guild'}-${interaction.channelId}-channel-${Date.now()}`;
  const solanaPayUrl = `solana:${escrow.publicKey.toBase58()}?amount=${totalSol.toFixed(4)}&label=Channel+Rain&message=Fund+the+Escrow`;

  if (!saveEscrowRecord({
    id: escrowId,
    mode: 'channel',
    pubkey: escrow.publicKey.toBase58(),
    encryptedSecret: encryptSecret(Buffer.from(escrow.secretKey).toString('hex')),
    totalLamports: amountLamports,
    hostDiscordId: interaction.user.id,
    guildId: interaction.guildId ?? '',
    channelId: interaction.channelId,
    startedAt: Date.now(),
  })) {
    await interaction.editReply({
      content: '[ESCROW FAILED] Could not persist the rain escrow safely, so funding was blocked.',
    });
    return;
  }

  const fundBtn = new ButtonBuilder()
    .setLabel('[INITIALIZE CHANNEL RAIN]')
    .setStyle(ButtonStyle.Link)
    .setURL(solanaPayUrl);

  const fundRow = new ActionRowBuilder<ButtonBuilder>().addComponents(fundBtn);

  const fundEmbed = new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle('[INITIALIZE THE RAIN]')
    .setDescription(`To rain **${totalSol.toFixed(4)} SOL** on ${maxUsers} degens, you must fund the escrow. YOUR KEYS, YOUR PROBLEM.\n\n**Escrow Address:** \`${escrow.publicKey.toBase58()}\`\n\n*This escrow will be emptied immediately after the rain ends.*`)
    .setFooter({ text: 'JustTheTip: NON-CUSTODIAL' });

  await interaction.editReply({ embeds: [fundEmbed], components: [fundRow] });

  const fundingResult = await waitForFunding(escrow, amountLamports);
  if (!fundingResult.funded) {
    if (fundingResult.balance <= 0) {
      deleteEscrowRecord(escrowId);
    }
    await interaction.editReply({
      content: fundingResult.balance > 0
        ? buildEscrowFailureMessage('[FUNDING TIMEOUT]', 'Escrow was only partially funded before the timer expired.', escrow, escrowId)
        : '[FUNDING TIMEOUT] Escrow was not funded in time. Rain cancelled.',
      components: [],
    });
    return;
  }

  const rainEmbed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle('[CHANNEL RAIN LIVE]')
    .setDescription(
      `${interaction.user} is dropping **${totalSol.toFixed(4)} SOL**.\n\n` +
      `Click **CLAIM RAIN** to lock your slot.\n\n` +
      `**Limits:** Max ${maxUsers} users | **Time:** ${timeLimit}s\n` +
      `Collector scripts get clipped. Trip the wrong button and you're out.`
    )
    .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

  const claimButtonId = `rain:channel:claim:${interaction.id}`;
  const collectorTrapButtonId = `rain:channel:collector:${interaction.id}`;
  const claimRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(claimButtonId)
      .setLabel('CLAIM RAIN')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(collectorTrapButtonId)
      .setLabel(COLLECTOR_TRIPWIRE_LABEL)
      .setStyle(ButtonStyle.Danger)
  );

  const rainMessage = await channel?.send({
    embeds: [rainEmbed],
    components: [claimRow],
  }) as Message | undefined;

  if (!rainMessage) {
    await interaction.editReply({ content: '[CHANNEL MISSING] Could not open the channel rain collector.', components: [] });
    return;
  }

  const claimants = new Set<string>();
  const blockedClaimants = new Set<string>();
  const collector = rainMessage.createMessageComponentCollector({
    filter: (componentInteraction) =>
      componentInteraction.isButton() &&
      [claimButtonId, collectorTrapButtonId].includes(componentInteraction.customId) &&
      !componentInteraction.user.bot,
    time: timeLimit * 1000,
  });

  collector.on('collect', async (componentInteraction) => {
    if (componentInteraction.customId === collectorTrapButtonId) {
      claimants.delete(componentInteraction.user.id);
      const firstBlock = !blockedClaimants.has(componentInteraction.user.id);
      blockedClaimants.add(componentInteraction.user.id);
      await componentInteraction.reply({
        content: '[BLOCKED] Collector tripwire hit. This rain is human-only.',
        ephemeral: true,
      }).catch(() => {});

      if (firstBlock) {
        await announceCollectorBlock(channel, componentInteraction.user.id);
      }
      return;
    }

    if (blockedClaimants.has(componentInteraction.user.id)) {
      await componentInteraction.reply({
        content: '[BLOCKED] You already tripped the collector check on this rain.',
        ephemeral: true,
      }).catch(() => {});
      return;
    }

    if (claimants.has(componentInteraction.user.id)) {
      await componentInteraction.reply({
        content: '[ALREADY LOCKED] You already claimed this rain.',
        ephemeral: true,
      }).catch(() => {});
      return;
    }

    if (claimants.size >= maxUsers) {
      await componentInteraction.reply({
        content: '[RAIN FULL] No slots left.',
        ephemeral: true,
      }).catch(() => {});
      return;
    }

    claimants.add(componentInteraction.user.id);
    await componentInteraction.reply({
      content: 'Claim locked. Keep your wallet linked. Payout runs when the timer closes.',
      ephemeral: true,
    }).catch(() => {});

    if (claimants.size >= maxUsers) {
      collector.stop('filled');
    }
  });

  collector.on('end', async () => {
    await rainMessage.edit({ components: [] }).catch(() => {});
    const users = Array.from(claimants);

    if (users.length === 0) {
      try {
        const refund = await refundEscrowToHost(interaction.user.id, escrow, amountLamports);
        if (refund.refunded) {
          deleteEscrowRecord(escrowId);
          await channel?.send(
            `[RAIN DEAD] No one claimed. Refunded escrow to the host wallet.\n\n**Tx:** https://solscan.io/tx/${refund.signature}`
          );
        } else {
          await channel?.send(
            buildEscrowFailureMessage('[RAIN DEAD]', `No one claimed. Refund failed because ${refund.reason ?? 'the host wallet is unavailable'}.`, escrow, escrowId)
          );
        }
      } catch (err) {
        console.error('[Rain channel] Refund error:', err);
        await channel?.send(buildEscrowFailureMessage('[REFUND FAILED]', 'No one claimed the rain and escrow refund failed.', escrow, escrowId));
      }
      return;
    }

    await channel?.send(`[TIME] Timer ended. Processing ${users.length} claim${users.length === 1 ? '' : 's'}...`);

    const recipients: string[] = [];
    for (const uid of users) {
      const user = await findUserByDiscordId(uid).catch(() => null);
      if (user?.wallet_address) {
        recipients.push(user.wallet_address);
      }
    }

    if (recipients.length === 0) {
      try {
        const refund = await refundEscrowToHost(interaction.user.id, escrow, amountLamports);
        if (refund.refunded) {
          deleteEscrowRecord(escrowId);
          await channel?.send(
            `[NO ELIGIBLE CLAIMS] No claimants had linked wallets. Refunded escrow to the host wallet.\n\n**Tx:** https://solscan.io/tx/${refund.signature}`
          );
        } else {
          await channel?.send(
            buildEscrowFailureMessage('[NO ELIGIBLE CLAIMS]', `No claimants had linked wallets, and refund failed because ${refund.reason ?? 'the host wallet is unavailable'}.`, escrow, escrowId)
          );
        }
      } catch (err) {
        console.error('[Rain channel] Refund error after wallet filter:', err);
        await channel?.send(buildEscrowFailureMessage('[REFUND FAILED]', 'No claimant had a linked wallet and escrow refund failed.', escrow, escrowId));
      }
      return;
    }

    const lamportsPerUser = Math.floor(amountLamports / recipients.length);
    if (lamportsPerUser <= 0) {
      try {
        const refund = await refundEscrowToHost(interaction.user.id, escrow, amountLamports);
        if (refund.refunded) {
          deleteEscrowRecord(escrowId);
          await channel?.send(
            `[RAIN TOO THIN] The funded amount was too small to split across ${recipients.length} recipients. Refunded escrow to the host wallet.\n\n**Tx:** https://solscan.io/tx/${refund.signature}`
          );
        } else {
          await channel?.send(
            buildEscrowFailureMessage('[RAIN TOO THIN]', `The funded amount was too small to split across ${recipients.length} recipients, and refund failed because ${refund.reason ?? 'the host wallet is unavailable'}.`, escrow, escrowId)
          );
        }
      } catch (err) {
        console.error('[Rain channel] Refund error after zero-value split:', err);
        await channel?.send(buildEscrowFailureMessage('[REFUND FAILED]', 'Channel rain could not unwind a zero-value split.', escrow, escrowId));
      }
      return;
    }

    const transaction = new Transaction();

    recipients.forEach((addr) => {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: escrow.publicKey,
          toPubkey: new PublicKey(addr),
          lamports: lamportsPerUser,
        })
      );
    });

    try {
      const signature = await sendAndConfirmTransaction(connection, transaction, [escrow]);
      deleteEscrowRecord(escrowId);
      await channel?.send(`[DONE] **RAIN SECURED!**\nSent to ${recipients.length} wallets.\n\n**Tx:** https://solscan.io/tx/${signature}`);
    } catch (err) {
      console.error('[Rain channel] Payout error:', err);
      await channel?.send(buildEscrowFailureMessage('[PAYOUT FAILED]', 'Funds could not be distributed.', escrow, escrowId));
    }
  });
}

export const rain: Command = {
  data: new SlashCommandBuilder()
    .setName('rain')
    .setDescription('Run a voice-room split or a channel airdrop.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('voice')
        .setDescription('Split SOL equally across everyone else in your current voice channel.')
        .addStringOption((opt) =>
          opt
            .setName('amount')
            .setDescription('Total amount to split, like "1 SOL" or "$25"')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Run a live SOL airdrop in the current channel.')
        .addStringOption((opt) =>
          opt.setName('amount').setDescription('Total amount to drop (e.g. "1 SOL" or "$50")').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('users').setDescription('Maximum number of users who can claim').setRequired(true).setMaxValue(MAX_RAIN_RECIPIENTS)
        )
        .addIntegerOption((opt) =>
          opt.setName('time').setDescription('Time in seconds to collect claims (default 60)').setMinValue(10).setMaxValue(300)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const mode = interaction.options.getSubcommand();
    if (mode === 'voice') {
      await executeVoiceRain(interaction);
      return;
    }

    await executeChannelRain(interaction);
  },
};
