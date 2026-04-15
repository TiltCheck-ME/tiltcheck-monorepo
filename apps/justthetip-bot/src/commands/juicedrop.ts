// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Message } from 'discord.js';
import type { Command } from '../types.js';
import { findUserByDiscordId } from '@tiltcheck/db';
import { parseAmountNL } from '@tiltcheck/natural-language-parser';
import { getUsdPriceSync } from '@tiltcheck/utils';
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
const COLLECTOR_TRIPWIRE_LABEL = 'BOT/COLLECTOR CLAIM';

async function announceCollectorBlock(channel: any, userId: string): Promise<void> {
  await channel?.send(
    `[ANTI-COLLECTOR] <@${userId}> tripped the drop collector check and is blocked from this payout. ` +
    `Rain drops are for actual people, not script-fed wallet farming.`
  ).catch(() => {});
}

async function refundEscrowToHost(
  hostDiscordId: string,
  escrow: Keypair,
  amountLamports: number
): Promise<{ refunded: boolean; signature?: string; reason?: string }> {
  const host = await findUserByDiscordId(hostDiscordId);
  if (!host?.wallet_address) {
    return {
      refunded: false,
      reason: 'Host has no linked wallet for refund.',
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

export const juicedrop: Command = {
  data: new SlashCommandBuilder()
    .setName('juicedrop')
    .setDescription('Drop SOL to reactors in this channel. Spread the bag.')
    .addStringOption(opt =>
      opt.setName('amount').setDescription('Total amount to drop (e.g. "1 SOL" or "$50")').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('users').setDescription('Maximum number of users who can claim').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('time').setDescription('Time in seconds to collect claims (default 60)').setMinValue(10).setMaxValue(300)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const amountRaw = interaction.options.getString('amount', true);
    const maxUsers = interaction.options.getInteger('users', true);
    const timeLimit = interaction.options.getInteger('time') || 60;

    await interaction.deferReply();

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

    const solanaPayUrl = `solana:${escrow.publicKey.toBase58()}?amount=${totalSol.toFixed(4)}&label=Juice+Drop&message=Fund+the+Escrow`;

    const fundBtn = new ButtonBuilder()
      .setLabel('[INITIALIZE PROFIT DROP]')
      .setStyle(ButtonStyle.Link)
      .setURL(solanaPayUrl);

    const fundRow = new ActionRowBuilder<ButtonBuilder>().addComponents(fundBtn);

    const fundEmbed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('[INITIALIZE THE DROP]')
      .setDescription(`To drop **${totalSol.toFixed(4)} SOL** to ${maxUsers} degens, you must fund the escrow. YOUR KEYS, YOUR PROBLEM.\n\n**Escrow Address:** \`${escrow.publicKey.toBase58()}\`\n\n*This escrow will be emptied immediately after the drop ends.*`)
      .setFooter({ text: 'JustTheTip: NON-CUSTODIAL' });

    await interaction.editReply({ embeds: [fundEmbed], components: [fundRow] });

    let isFunded = false;
    for (let i = 0; i < 30; i++) {
      const balance = await connection.getBalance(escrow.publicKey);
      if (balance >= amountLamports) {
        isFunded = true;
        break;
      }
      await new Promise(r => setTimeout(r, 5000));
    }

    if (!isFunded) {
      await interaction.editReply({ content: '[FUNDING TIMEOUT] Escrow was not funded in time. Drop cancelled.', components: [] });
      return;
    }

    const dropEmbed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('[PROFIT DROPPING!]')
      .setDescription(
        `${interaction.user} is dropping **${totalSol.toFixed(4)} SOL**.\n\n` +
        `Click **CLAIM DROP** to lock your slot.\n\n` +
        `**Limits:** Max ${maxUsers} users | **Time:** ${timeLimit}s\n` +
        `Collector scripts get clipped. Trip the wrong button and you're out.`
      )
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

    const claimButtonId = `juicedrop:claim:${interaction.id}`;
    const collectorTrapButtonId = `juicedrop:collector:${interaction.id}`;
    const claimRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(claimButtonId)
        .setLabel('CLAIM DROP')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(collectorTrapButtonId)
        .setLabel(COLLECTOR_TRIPWIRE_LABEL)
        .setStyle(ButtonStyle.Danger)
    );

    const dropMessage = await (interaction.channel as any)?.send({
      embeds: [dropEmbed],
      components: [claimRow],
    }) as Message;

    const claimants = new Set<string>();
    const blockedClaimants = new Set<string>();
    const collector = dropMessage.createMessageComponentCollector({
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
          content: '[BLOCKED] Collector tripwire hit. This drop is human-only.',
          ephemeral: true,
        }).catch(() => {});

        if (firstBlock) {
          await announceCollectorBlock(interaction.channel, componentInteraction.user.id);
        }
        return;
      }

      if (blockedClaimants.has(componentInteraction.user.id)) {
        await componentInteraction.reply({
          content: '[BLOCKED] You already tripped the collector check on this drop.',
          ephemeral: true,
        }).catch(() => {});
        return;
      }

      if (claimants.has(componentInteraction.user.id)) {
        await componentInteraction.reply({
          content: '[ALREADY LOCKED] You already claimed this drop.',
          ephemeral: true,
        }).catch(() => {});
        return;
      }

      if (claimants.size >= maxUsers) {
        await componentInteraction.reply({
          content: '[DROP FULL] No slots left.',
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
      await dropMessage.edit({ components: [] }).catch(() => {});
      const users = Array.from(claimants);

      if (users.length === 0) {
        try {
          const refund = await refundEscrowToHost(interaction.user.id, escrow, amountLamports);
          if (refund.refunded) {
            await (interaction.channel as any)?.send(
              `[DROP DEAD] No one claimed. Refunded escrow to the host wallet.\n\n**Tx:** https://solscan.io/tx/${refund.signature}`
            );
          } else {
            await (interaction.channel as any)?.send(
              `[DROP DEAD] No one claimed. Refund failed because ${refund.reason ?? 'the host wallet is unavailable'}. Funds remain in escrow.`
            );
          }
        } catch (err) {
          console.error('[Juice] Refund error:', err);
          await (interaction.channel as any)?.send('[REFUND FAILED] No one claimed the drop and escrow refund failed. Funds remain in escrow.');
        }
        return;
      }

      await (interaction.channel as any)?.send(`[TIME] Timer ended. Processing ${users.length} claim${users.length === 1 ? '' : 's'}...`);

      const recipients: string[] = [];
      for (const uid of users) {
        const user = await findUserByDiscordId(uid);
        if (user?.wallet_address) {
          recipients.push(user.wallet_address);
        }
      }

      if (recipients.length === 0) {
        try {
          const refund = await refundEscrowToHost(interaction.user.id, escrow, amountLamports);
          if (refund.refunded) {
            await (interaction.channel as any)?.send(
              `[NO ELIGIBLE CLAIMS] No claimants had linked wallets. Refunded escrow to the host wallet.\n\n**Tx:** https://solscan.io/tx/${refund.signature}`
            );
          } else {
            await (interaction.channel as any)?.send(
              `[NO ELIGIBLE CLAIMS] No claimants had linked wallets, and refund failed because ${refund.reason ?? 'the host wallet is unavailable'}. Funds remain in escrow.`
            );
          }
        } catch (err) {
          console.error('[Juice] Refund error after wallet filter:', err);
          await (interaction.channel as any)?.send('[REFUND FAILED] No claimant had a linked wallet and escrow refund failed. Funds remain in escrow.');
        }
        return;
      }

      const solPerUser = Math.floor(amountLamports / recipients.length);
      const transaction = new Transaction();

      recipients.forEach(addr => {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: escrow.publicKey,
            toPubkey: new PublicKey(addr),
            lamports: solPerUser,
          })
        );
      });

      try {
        const signature = await sendAndConfirmTransaction(connection, transaction, [escrow]);
        await (interaction.channel as any)?.send(`[DONE] **PROFIT SECURED!**\nSent to ${recipients.length} wallets.\n\n**Tx:** https://solscan.io/tx/${signature}`);
      } catch (err) {
        console.error('[Juice] Payout error:', err);
        await (interaction.channel as any)?.send('[PAYOUT FAILED] Funds could not be distributed. Escrow still holds the balance. Contact admin.');
      }
    });
  },
};
