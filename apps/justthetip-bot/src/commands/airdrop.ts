/**
 * Airdrop Command
 * Creates a claimable drop that users can join by clicking a claim button.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { hasWallet, getWallet } from '@tiltcheck/justthetip';
import { parseAmount } from '@tiltcheck/natural-language-parser';

export const airdrop: Command = {
  data: new SlashCommandBuilder()
    .setName('airdrop')
    .setDescription('Create a claimable drop - users click "Claim" to join')
    .addStringOption(opt =>
      opt
        .setName('amount')
        .setDescription('Amount per person (e.g., "$5", "10", "0.1 SOL") - you pay when users claim')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('max_claims')
        .setDescription('Maximum number of people who can claim (default: 10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50)
    )
    .addStringOption(opt =>
      opt
        .setName('duration')
        .setDescription('How long the drop stays active (e.g., "1h", "30m", "2 hours") - default: 1 hour')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    if (!hasWallet(interaction.user.id)) {
      await interaction.editReply({ 
        content: '❌ You need to register a wallet first!\nUse `/wallet action:register address:<your-address>` to connect your wallet.' 
      });
      return;
    }

    const amountRaw = interaction.options.getString('amount', true);
    const maxClaims = interaction.options.getInteger('max_claims') || 10;
    const durationRaw = interaction.options.getString('duration') || '1h';

    try {
      const { amountUSD, amountSOL } = parseAmount(amountRaw);
      
      const senderWallet = getWallet(interaction.user.id);
      if (!senderWallet) {
        await interaction.editReply({ content: '❌ Wallet registration error. Please try again.' });
        return;
      }

      // Generate unique drop ID
      const dropId = `drop_${interaction.user.id}_${Date.now()}`;
      
      // Store drop data (in a real implementation, this would go to a database)
      const dropData = {
        id: dropId,
        createdBy: interaction.user.id,
        createdAt: Date.now(),
        amountUSD,
        amountSOL,
        maxClaims,
        duration: durationRaw,
        claims: [],
        status: 'active'
      };

      const claimButton = new ButtonBuilder()
        .setCustomId(`claim_drop_${dropId}`)
        .setLabel('🎁 Claim Drop')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💰');

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton);

      const totalCost = (amountUSD || 0) * maxClaims;
      const embed = new EmbedBuilder()
        .setColor(0x00D4AA)
        .setTitle('🎁 Airdrop Created!')
        .setDescription(
          `**Drop Amount:** $${amountUSD?.toFixed(2) || 'N/A'} USD (≈${amountSOL?.toFixed(4) || 'N/A'} SOL) per person\\n` +
          `**Max Claims:** ${maxClaims} people\\n` +
          `**Duration:** ${durationRaw}\\n` +
          `**Total Cost:** $${totalCost.toFixed(2)} USD (you pay as people claim)\\n\\n` +
          `🎯 **Users click "Claim Drop" below to join!**\\n` +
          `You'll pay $${amountUSD?.toFixed(2) || 'N/A'} + $0.07 fee for each person who claims.`
        )
        .addFields(
          { name: '👥 Claims', value: '0 / ' + maxClaims, inline: true },
          { name: '⏰ Expires', value: `<t:${Math.floor((Date.now() + 3600000) / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: 'Powered by JustTheTip • Non-custodial drops' });

      await interaction.editReply({ embeds: [embed], components: [row] });

      // TODO: Store drop data in database/file system
      // TODO: Set up expiration timer
      
    } catch (error) {
      await interaction.editReply({ 
        content: `❌ Invalid amount format. Use formats like "$5", "10", or "0.1 SOL"` 
      });
    }
  },
};
