/**
 * Airdrop Command
 * Creates a multi-recipient Solana Pay transaction the user signs.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { hasWallet, getWallet, createAirdropWithFeeRequest } from '@tiltcheck/justthetip';
import { Connection } from '@solana/web3.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

export const airdrop: Command = {
  data: new SlashCommandBuilder()
    .setName('airdrop')
    .setDescription('Send a tip to multiple users (multi-transfer)')
    .addStringOption(opt =>
      opt
        .setName('recipients')
        .setDescription('Space-separated user mentions (e.g. @user1 @user2)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('amount')
        .setDescription('Amount per recipient in SOL (e.g. 0.1)')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    if (!hasWallet(interaction.user.id)) {
      await interaction.editReply({ content: '❌ You need to register a wallet first using `/justthetip wallet register-external`.' });
      return;
    }

    const recipientsRaw = interaction.options.getString('recipients', true);
    const amountRaw = interaction.options.getString('amount', true);

    const amountPerRecipient = parseFloat(amountRaw);
    if (isNaN(amountPerRecipient) || amountPerRecipient <= 0) {
      await interaction.editReply({ content: '❌ Invalid amount. Provide a positive SOL value like `0.05`.' });
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
      await interaction.editReply({ content: '❌ No valid user mentions found. Use space-separated mentions like `@Alice @Bob`.' });
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
      await interaction.editReply({ content: '❌ None of the mentioned users have registered wallets yet.' });
      return;
    }

    try {
      const { url } = await createAirdropWithFeeRequest(
        connection,
        senderWallet.address,
        walletAddresses,
        amountPerRecipient,
      );

      const payButton = new ButtonBuilder()
        .setLabel('🚀 Open Airdrop in Wallet')
        .setStyle(ButtonStyle.Link)
        .setURL(url);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(payButton);

      const totalSOL = amountPerRecipient * walletAddresses.length;
      const feeText = process.env.JUSTTHETIP_FEE_WALLET ? '0.0007 SOL' : 'None (fee wallet not configured)';

      const embed = new EmbedBuilder()
        .setColor(0x8844ff)
        .setTitle('🚀 Airdrop Ready')
        .setDescription(
          `**Recipients:** ${walletAddresses.length}\n` +
          `**Amount Each:** ${amountPerRecipient} SOL\n` +
          `**Total (excluding fee):** ${totalSOL.toFixed(4)} SOL\n` +
          `**Fee:** ${feeText}\n\n` +
          'Tap the button below to open the unsigned transaction in your wallet and approve the multi-transfer.'
        )
        .setFooter({ text: 'Powered by Solana Pay multi-transfer' });

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
