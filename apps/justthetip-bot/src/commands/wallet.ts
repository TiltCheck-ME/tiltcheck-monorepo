/**
 * Wallet Command
 * Manage Solana wallets
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { updateOnboardingState } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';
import { registerExternalWallet, getWallet } from '@tiltcheck/justthetip';

export const wallet: Command = {
  data: new SlashCommandBuilder()
    .setName('wallet')
    .setDescription('Manage your Solana wallet')
    .addStringOption(opt =>
      opt
        .setName('action')
        .setDescription('Wallet action')
        .setRequired(true)
        .addChoices(
          { name: 'View', value: 'view' },
          { name: 'Register', value: 'register' },
        )
    )
    .addStringOption(opt =>
      opt
        .setName('address')
        .setDescription('Your Solana wallet address (for registration)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const action = interaction.options.getString('action', true);

    if (action === 'view') {
      const wallet = getWallet(interaction.user.id);
      
      if (!wallet) {
        await interaction.reply({
          content: '❌ No wallet registered. Use `/wallet action:register address:<your-address>`',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('💳 Your Wallet')
        .addFields(
          { name: 'Address', value: `\`${wallet.address}\``, inline: false },
          { name: 'Type', value: wallet.type, inline: true },
          { name: 'Registered', value: `<t:${Math.floor(wallet.registeredAt / 1000)}:R>`, inline: true },
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (action === 'register') {
      const address = interaction.options.getString('address');
      
      if (!address) {
        await interaction.reply({
          content: '❌ Please provide your Solana wallet address:\n' +
            '`/wallet action:register address:<your-address>`\n\n' +
            'Find your address in Phantom, Solflare, or other Solana wallets.',
          ephemeral: true,
        });
        return;
      }

      try {
        const wallet = registerExternalWallet(interaction.user.id, address);
        
        // Auto-claim any pending tips
        const { claimPendingTips } = await import('@tiltcheck/justthetip');
        const pendingTips = await claimPendingTips(interaction.user.id);
        
        // Mark onboarding step as complete
        await updateOnboardingState(interaction.user.id, { hasRegisteredWallet: true });
        
        let description = 'Your wallet has been connected';
        if (pendingTips.length > 0) {
          const totalAmount = pendingTips.reduce((sum, tip) => sum + tip.amount, 0);
          description += `\n\n🎉 **${pendingTips.length} pending tips automatically claimed!**\nTotal: $${totalAmount.toFixed(2)} USD`;
        }
        
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Wallet Registered!')
          .setDescription(description)
          .addFields(
            { name: 'Address', value: `\`${wallet.address}\``, inline: false },
            { name: 'Type', value: 'External', inline: true },
          )
          .setFooter({ text: 'You can now send and receive tips!' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        await interaction.reply({
          content: `❌ ${error instanceof Error ? error.message : 'Invalid wallet address'}`,
          ephemeral: true,
        });
      }
    }
  },
};
