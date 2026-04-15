// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-14

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  VoiceBasedChannel,
} from 'discord.js';
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

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');

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

export const juice: Command = {
  data: new SlashCommandBuilder()
    .setName('juice')
    .setDescription('Tip everyone else in your current voice channel equally.')
    .addStringOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Total amount to split, like "1 SOL" or "$25"')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: '[VOICE ONLY] `/juice` only works inside a server voice channel.',
        ephemeral: true,
      });
      return;
    }

    const amountRaw = interaction.options.getString('amount', true);
    await interaction.deferReply();

    const voiceChannel = getVoiceChannel(interaction);
    if (!voiceChannel) {
      await interaction.editReply({
        content: '[NO VOICE ROOM] Join the voice channel you want to juice first.',
      });
      return;
    }

    const parseResult = parseAmountNL(amountRaw);
    if (!parseResult.success || !parseResult.data) {
      await interaction.editReply({ content: '[INVALID INPUT] Use "$10" or "0.5 SOL".' });
      return;
    }

    let totalSol = parseResult.data.value;
    if (parseResult.data.currency === 'USD') {
      try {
        const price = getUsdPriceSync('SOL');
        totalSol = parseResult.data.value / price;
      } catch {
        await interaction.editReply({ content: '[PRICE FEED DOWN] Specify the amount in SOL.' });
        return;
      }
    }

    const escrow = Keypair.generate();
    const amountLamports = Math.floor(totalSol * LAMPORTS_PER_SOL);
    const lockedVoiceChannelId = voiceChannel.id;
    const lockedVoiceChannelName = voiceChannel.name;
    const solanaPayUrl = `solana:${escrow.publicKey.toBase58()}?amount=${totalSol.toFixed(4)}&label=Voice+Juice&message=Fund+the+voice+room+tip`;

    const fundBtn = new ButtonBuilder()
      .setLabel('[FUND VOICE JUICE]')
      .setStyle(ButtonStyle.Link)
      .setURL(solanaPayUrl);

    const fundRow = new ActionRowBuilder<ButtonBuilder>().addComponents(fundBtn);

    const fundEmbed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('[JUICE THE ROOM]')
      .setDescription(
        `You're lining up **${totalSol.toFixed(4)} SOL** for everyone else in **${lockedVoiceChannelName}**.\n\n` +
        `Fund the escrow to lock it in.\n\n**Escrow Address:** \`${escrow.publicKey.toBase58()}\`\n\n` +
        `When funding lands, the bot snapshots that same voice room and splits the juice equally across linked wallets.`
      )
      .setFooter({ text: 'Juice = direct room split. Rain = channel airdrop.' });

    await interaction.editReply({ embeds: [fundEmbed], components: [fundRow] });

    let isFunded = false;
    for (let i = 0; i < 30; i++) {
      const balance = await connection.getBalance(escrow.publicKey).catch(() => 0);
      if (balance >= amountLamports) {
        isFunded = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (!isFunded) {
      await interaction.editReply({
        content: '[FUNDING TIMEOUT] Escrow was not funded in time. Juice cancelled.',
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

    if (recipientsInVoice.length === 0) {
      try {
        const refund = await refundEscrowToHost(interaction.user.id, escrow, amountLamports);
        if (refund.refunded) {
          await interaction.channel?.send(
            `[JUICE DEAD] Nobody else was still in **${lockedVoiceChannelName}** when the escrow landed. ` +
            `Refunded the host.\n\n**Tx:** https://solscan.io/tx/${refund.signature}`
          );
        } else {
          await interaction.channel?.send(
            `[JUICE DEAD] Nobody else was still in **${lockedVoiceChannelName}**, and refund failed because ${refund.reason ?? 'the host wallet is unavailable'}.`
          );
        }
      } catch (error) {
        console.error('[Juice] Refund error after empty room:', error);
        await interaction.channel?.send('[REFUND FAILED] Voice juice could not refund the empty-room escrow.');
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
          await interaction.channel?.send(
            `[NO ELIGIBLE JUICE] Nobody in **${lockedVoiceChannelName}** had a linked wallet. Refunded the host.\n\n` +
            `**Tx:** https://solscan.io/tx/${refund.signature}`
          );
        } else {
          await interaction.channel?.send(
            `[NO ELIGIBLE JUICE] Nobody in **${lockedVoiceChannelName}** had a linked wallet, and refund failed because ${refund.reason ?? 'the host wallet is unavailable'}.`
          );
        }
      } catch (error) {
        console.error('[Juice] Refund error after wallet filter:', error);
        await interaction.channel?.send('[REFUND FAILED] Voice juice had no eligible wallets and could not refund the host.');
      }
      return;
    }

    const lamportsPerUser = Math.floor(amountLamports / payoutRecipients.length);
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
      const paidList = payoutRecipients
        .map((recipient) => `<@${recipient.discordId}> — **${(lamportsPerUser / LAMPORTS_PER_SOL).toFixed(4)} SOL**`)
        .join('\n');
      const skippedLine = skippedRecipients.length > 0
        ? `\n\n**Skipped (no linked wallet):** ${skippedRecipients.map((id) => `<@${id}>`).join(', ')}`
        : '';

      await interaction.channel?.send(
        `**[JUICE SENT]** ${interaction.user} juiced **${lockedVoiceChannelName}**.\n\n` +
        `${paidList}${skippedLine}\n\n**Tx:** https://solscan.io/tx/${signature}`
      );
    } catch (error) {
      console.error('[Juice] Payout error:', error);
      await interaction.channel?.send(
        `[PAYOUT FAILED] Voice juice could not distribute funds. Escrow still holds the balance: \`${escrow.publicKey.toBase58()}\``
      );
    }
  },
};
