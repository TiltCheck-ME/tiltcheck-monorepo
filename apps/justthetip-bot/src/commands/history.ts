/**
 * History Command
 * View tip transaction history (sent via DM for privacy)
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { hasWallet } from '@tiltcheck/justthetip';

export const history: Command = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View your transaction history (sent via DM)')
    .addIntegerOption(opt =>
      opt
        .setName('limit')
        .setDescription('Number of recent transactions to show (default: 10)')
        .setMinValue(5)
        .setMaxValue(50)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    
    if (!hasWallet(interaction.user.id)) {
      await interaction.editReply({
        content: '❌ You need to register a wallet first!\nUse `/wallet action:register address:<your-address>` to connect your wallet.',
      });
      return;
    }

    const limit = interaction.options.getInteger('limit') || 10;

    try {
      // Send initial response
      await interaction.editReply({
        content: '📬 Sending your transaction history via DM for privacy...',
      });

      // TODO: Get transaction history from JustTheTip module
      // For now, send a placeholder DM
      const historyEmbed = new EmbedBuilder()
        .setColor(0x14F195)
        .setTitle('📜 Your JustTheTip Transaction History')
        .setDescription(
          `**Last ${limit} transactions:**\n\n` +
          '🔄 **Feature Coming Soon!** 🔄\n\n' +
          'You\'ll be able to view:\n' +
          '• 💸 Tips you\'ve sent\n' +
          '• 💰 Tips you\'ve received\n' +
          '• 📅 Transaction dates and amounts\n' +
          '• 🔗 Solana explorer links\n' +
          '• 📊 Monthly spending summaries\n\n' +
          'Your transaction history will be fetched directly from the Solana blockchain for accuracy.'
        )
        .addFields(
          { name: '🔒 Privacy', value: 'Transaction history is always sent via DM to protect your privacy.', inline: false },
          { name: '⚡ Real-time', value: 'Data comes directly from Solana blockchain - no databases needed!', inline: false }
        )
        .setFooter({ text: 'JustTheTip • Non-custodial transaction history' })
        .setTimestamp();

      // Send DM to user
      await interaction.user.send({ embeds: [historyEmbed] });
      
      // Update the original response
      await interaction.editReply({
        content: '✅ Transaction history sent to your DMs!',
      });

    } catch (error) {
      if (error instanceof Error && error.code === 50007) {
        await interaction.editReply({
          content: '❌ Cannot send DM! Please enable DMs from server members in your Discord privacy settings.',
        });
      } else {
        await interaction.editReply({
          content: '❌ Failed to send transaction history. Please try again later.',
        });
      }
    }
  },
};
