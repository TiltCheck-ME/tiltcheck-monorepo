/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Airdrop Command
 * Creates a multi-recipient Solana Pay transaction the user signs.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { hasWallet, getWallet, createAirdropWithFeeRequest } from '@tiltcheck/justthetip';
import { parseAmountNL, formatAmount } from '@tiltcheck/natural-language-parser';
import { pricingOracle } from '@tiltcheck/pricing-oracle';
import { Connection } from '@solana/web3.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export const airdrop: Command = {
  data: new SlashCommandBuilder()
    .setName('airdrop')
    .setDescription('Make it rain on multiple degens (multi-transfer)')
    .addStringOption(opt =>
      opt
        .setName('recipients')
        .setDescription('Space-separated user mentions (e.g. @user1 @user2)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('amount')
        .setDescription('Amount per recipient (e.g. "$7", "0.1 sol", "5 bucks")')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    if (!hasWallet(interaction.user.id)) {
      await interaction.editReply({ content: '❌ No wallet? NGMI. Register first.' });
      return;
    }

    const recipientsRaw = interaction.options.getString('recipients', true);
    const amountRaw = interaction.options.getString('amount', true);

    // Use enhanced NLP parser for natural language amounts
    // Handles: "$5", "5 bucks", "five dollars", "0.1 sol", etc.
    const parseResult = parseAmountNL(amountRaw);
    
    if (!parseResult.success || !parseResult.data) {
      await interaction.editReply({
        content: `❌ ${parseResult.error}\n\nExamples: "$5", "five bucks", "0.1 sol", "7 dollars"`,
      });
      return;
    }

    const parsedAmount = parseResult.data;
    
    // Convert USD to SOL if needed
    let amountPerRecipientSOL = parsedAmount.value;
    if (parsedAmount.currency === 'USD') {
      try {
        const solPrice = pricingOracle.getUsdPrice('SOL');
        amountPerRecipientSOL = parsedAmount.value / solPrice;
      } catch {
        await interaction.editReply({ content: '❌ Unable to get current SOL price. Please try again or specify amount in SOL.' });
        return;
      }
    }

    if (amountPerRecipientSOL <= 0) {
      await interaction.editReply({ content: '❌ That amount is dust. Send something real.' });
      return;
    }

    // Extract user IDs from mentions
    const idRegex = /<@!?(\d+)>/g;
    const userIds: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = idRegex.exec(recipientsRaw)) !== null) {
      userIds.push(match[1]);
    }

    if (userIds.length === 0) {
      await interaction.editReply({ content: '❌ Who are you sending to? Ghosts? Tag some people.' });
      return;
    }

    const senderWallet = getWallet(interaction.user.id);
    if (!senderWallet) {
      await interaction.editReply({ content: '❌ Sender wallet not found after registration.' });
      return;
    }

    // Resolve recipient wallet addresses
    const walletAddresses: string[] = [];
    const missingWallets: string[] = [];
    for (const uid of userIds) {
      const w = getWallet(uid);
      if (w) walletAddresses.push(w.address); else missingWallets.push(uid);
    }

    if (walletAddresses.length === 0) {
      await interaction.editReply({ content: '❌ None of these degens have wallets. Tell them to register.' });
      return;
    }

    try {
      const { url } = await createAirdropWithFeeRequest(
        connection,
        senderWallet.address,
        walletAddresses,
        amountPerRecipientSOL,
      );

      const payButton = new ButtonBuilder()
        .setLabel('🚀 Sign Transaction')
        .setStyle(ButtonStyle.Link)
        .setURL(url);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(payButton);

      const totalSOL = amountPerRecipientSOL * walletAddresses.length;
      const feeText = process.env.JUSTTHETIP_FEE_WALLET ? '0.0007 SOL' : 'None (fee wallet not configured)';

      // Display both SOL and USD value
      const amountDisplay = parsedAmount.currency === 'USD'
        ? `${formatAmount(parsedAmount)} (~${amountPerRecipientSOL.toFixed(4)} SOL)`
        : `${amountPerRecipientSOL.toFixed(4)} SOL`;

      const embed = new EmbedBuilder()
        .setColor(0x8844ff)
        .setTitle('🚀 Airdrop Loaded')
        .setDescription(
          `**Recipients:** ${walletAddresses.length}\n` +
          `**Amount Each:** ${amountDisplay}\n` +
          `**Total (excluding fee):** ${totalSOL.toFixed(4)} SOL\n` +
          `**Fee:** ${feeText}\n\n` +
          'Smash the button to sign. Gas is cheap, you aren\'t.'
        )
        .setFooter({ text: 'Powered by Solana Pay • Make it rain' });

      let missingNote = '';
      if (missingWallets.length > 0) {
        missingNote = `\n⚠️ Skipped ${missingWallets.length} user(s) without wallets.`;
      }

      await interaction.editReply({ embeds: [embed], components: [row], content: missingNote });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to build airdrop transaction: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },
};
