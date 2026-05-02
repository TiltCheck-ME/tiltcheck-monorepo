// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// /rain — Channel airdrop powered by JustTheTip escrow flow

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  TextChannel,
  Message,
  ComponentType,
} from 'discord.js';
import type { Command } from '../types.js';
import { findUserByDiscordId } from '@tiltcheck/db';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const COMMUNITY_WALLET = 'DLP9VYyuLze7VZ7oMG6S77YT3BxZZBDJniTFx1NeDcem';
const MAX_RAIN_SOL = 10;
const MAX_CLAIMANTS = 15;
const ESCROW_DIR = path.join(process.cwd(), 'tmp', 'rain-escrow');
const FUNDING_POLL_MS = 5000;
const FUNDING_POLL_ATTEMPTS = 30;
const CLAIM_DURATION_MS = 60_000;

const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed',
);

function getEncKey(): Buffer {
  const pw = process.env.DISCORD_TOKEN || 'rain-default-key';
  return crypto.createHash('sha256').update(pw).digest();
}

function encryptSecret(hex: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncKey(), iv);
  const enc = Buffer.concat([cipher.update(hex, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function saveEscrow(record: Record<string, unknown>): void {
  try {
    fs.mkdirSync(ESCROW_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(ESCROW_DIR, `${record.id}.json`),
      JSON.stringify(record),
    );
  } catch {}
}

function deleteEscrow(id: string): void {
  try {
    const fp = path.join(ESCROW_DIR, `${id}.json`);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch {}
}

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const amountSol = interaction.options.getNumber('amount', true);
  const channel = interaction.channel as TextChannel;

  if (amountSol <= 0 || amountSol > MAX_RAIN_SOL) {
    await interaction.reply({ content: `[!] Amount must be 0.01–${MAX_RAIN_SOL} SOL.`, ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  // 1. Create escrow
  const escrow = Keypair.generate();
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
  const escrowId = `rain-${interaction.guildId}-${Date.now()}`;

  saveEscrow({
    id: escrowId,
    pubkey: escrow.publicKey.toBase58(),
    encryptedSecret: encryptSecret(Buffer.from(escrow.secretKey).toString('hex')),
    totalLamports: lamports,
    hostDiscordId: interaction.user.id,
    guildId: interaction.guildId ?? '',
    channelId: interaction.channelId,
    startedAt: Date.now(),
  });

  const payUrl = `solana:${escrow.publicKey.toBase58()}?amount=${amountSol.toFixed(4)}&label=DegenRain&message=TiltCheck+Rain+Drop`;

  const fundEmbed = new EmbedBuilder()
    .setColor(0xd946ef)
    .setTitle('[RAIN — FUND ESCROW]')
    .setDescription(
      `**${amountSol.toFixed(4)} SOL** rain for up to **${MAX_CLAIMANTS}** degens.\n\n` +
      `**Escrow:** \`${escrow.publicKey.toBase58()}\`\n` +
      `Fund within 2.5 minutes to start the claim window.`,
    )
    .setFooter({ text: 'Non-custodial. Escrow exists only for this rain.' });

  const fundBtn = new ButtonBuilder().setLabel('FUND').setStyle(ButtonStyle.Link).setURL(payUrl);
  await interaction.editReply({
    embeds: [fundEmbed],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(fundBtn)],
  });

  // 2. Poll for funding
  let funded = false;
  for (let i = 0; i < FUNDING_POLL_ATTEMPTS; i++) {
    const bal = await connection.getBalance(escrow.publicKey).catch(() => 0);
    if (bal >= lamports) { funded = true; break; }
    await new Promise((r) => setTimeout(r, FUNDING_POLL_MS));
  }

  if (!funded) {
    deleteEscrow(escrowId);
    await interaction.editReply({ content: '[!] Funding timed out. Rain cancelled.', components: [] });
    return;
  }

  await interaction.editReply({ content: '[OK] Funded. Rain dropping...', components: [] });

  // 3. Post claim message with button
  const claimBtn = new ButtonBuilder()
    .setCustomId(`rain-claim:${escrowId}`)
    .setLabel('CLAIM RAIN')
    .setStyle(ButtonStyle.Success);

  const trapBtn = new ButtonBuilder()
    .setCustomId(`rain-trap:${escrowId}`)
    .setLabel('BOT/COLLECTOR CLAIM')
    .setStyle(ButtonStyle.Danger);

  const rainEmbed = new EmbedBuilder()
    .setColor(0xd946ef)
    .setTitle('[RAIN DROP]')
    .setDescription(
      `<@${interaction.user.id}> is making it rain **${amountSol.toFixed(4)} SOL**.\n\n` +
      `First **${MAX_CLAIMANTS}** degens to claim split the pot equally.\n` +
      `You have **60 seconds**. Linked wallets only.`,
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });

  const rainMsg: Message = await channel.send({
    embeds: [rainEmbed],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(claimBtn, trapBtn)],
  });

  // 4. Collect claims
  const claimants = new Set<string>();
  const trapTripped = new Set<string>();

  const collector = rainMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: CLAIM_DURATION_MS,
  });

  collector.on('collect', async (btn) => {
    if (btn.user.bot) { await btn.deferUpdate(); return; }

    if (btn.customId.startsWith('rain-trap:')) {
      trapTripped.add(btn.user.id);
      claimants.delete(btn.user.id);
      await btn.reply({ content: '[BLOCKED] Collector tripwire triggered. No payout.', ephemeral: true });
      return;
    }

    if (btn.customId.startsWith('rain-claim:')) {
      if (trapTripped.has(btn.user.id)) {
        await btn.reply({ content: '[BLOCKED] Already flagged as collector.', ephemeral: true });
        return;
      }
      if (btn.user.id === interaction.user.id) {
        await btn.reply({ content: '[!] Host cannot claim own rain.', ephemeral: true });
        return;
      }
      if (claimants.size >= MAX_CLAIMANTS) {
        await btn.reply({ content: '[!] Rain is full. Better luck next time.', ephemeral: true });
        return;
      }
      if (claimants.has(btn.user.id)) {
        await btn.reply({ content: '[!] Already claimed.', ephemeral: true });
        return;
      }

      claimants.add(btn.user.id);
      await btn.reply({ content: `[CLAIMED] You're in. ${claimants.size}/${MAX_CLAIMANTS}`, ephemeral: true });
    }
  });

  await new Promise<void>((resolve) => collector.on('end', () => resolve()));

  // 5. Payout
  await rainMsg.edit({ components: [] });

  if (claimants.size === 0) {
    // Refund host
    const host = await findUserByDiscordId(interaction.user.id).catch(() => null);
    if (host?.wallet_address) {
      try {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: escrow.publicKey,
            toPubkey: new PublicKey(host.wallet_address),
            lamports,
          }),
        );
        await sendAndConfirmTransaction(connection, tx, [escrow]);
        await channel.send({ embeds: [new EmbedBuilder().setColor(0xef4444).setTitle('[RAIN — NO TAKERS]').setDescription('Nobody claimed. Funds refunded to host.')] });
      } catch {
        await channel.send('[!] Refund failed. Contact admin with escrow: `' + escrow.publicKey.toBase58() + '`');
      }
    } else {
      await channel.send({ embeds: [new EmbedBuilder().setColor(0xef4444).setTitle('[RAIN — NO TAKERS]').setDescription('Nobody claimed. Host has no linked wallet — funds sent to community wallet.')] });
      try {
        const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: escrow.publicKey, toPubkey: new PublicKey(COMMUNITY_WALLET), lamports }));
        await sendAndConfirmTransaction(connection, tx, [escrow]);
      } catch {}
    }
    deleteEscrow(escrowId);
    return;
  }

  const sharePerUser = Math.floor(lamports / claimants.size);
  const transaction = new Transaction();
  const lines: string[] = [];
  let totalPaid = 0;

  for (const uid of claimants) {
    const user = await findUserByDiscordId(uid).catch(() => null);
    const dest = user?.wallet_address ?? COMMUNITY_WALLET;
    const linked = !!user?.wallet_address;

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: escrow.publicKey,
        toPubkey: new PublicKey(dest),
        lamports: sharePerUser,
      }),
    );
    totalPaid += sharePerUser;
    lines.push(linked ? `<@${uid}> — **${(sharePerUser / LAMPORTS_PER_SOL).toFixed(4)} SOL**` : `<@${uid}> — sent to community (no wallet)`);
  }

  // Dust to community
  const dust = lamports - totalPaid;
  if (dust > 0) {
    transaction.add(SystemProgram.transfer({ fromPubkey: escrow.publicKey, toPubkey: new PublicKey(COMMUNITY_WALLET), lamports: dust }));
  }

  try {
    const sig = await sendAndConfirmTransaction(connection, transaction, [escrow]);
    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('[RAIN — COMPLETE]')
      .setDescription(
        `**${claimants.size} degens** split **${amountSol.toFixed(4)} SOL**:\n${lines.join('\n')}\n\n[Solscan](https://solscan.io/tx/${sig})`,
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[/rain] Payout failed:', err);
    await channel.send(`[!] Payout failed. Escrow: \`${escrow.publicKey.toBase58()}\``);
  }

  deleteEscrow(escrowId);
}

export const rain: Command = {
  data: new SlashCommandBuilder()
    .setName('rain')
    .setDescription('Airdrop SOL to the channel. First claimants split the pot.')
    .addNumberOption((opt) =>
      opt.setName('amount').setDescription('SOL to rain (max 10)').setRequired(true).setMinValue(0.01).setMaxValue(MAX_RAIN_SOL),
    ),
  execute,
};
