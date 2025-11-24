/**
 * Help Command
 * 
 * Displays available commands and module information.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { createEmbed, Colors } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands and features'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = createEmbed(
      '🪙 JustTheTip Bot',
      'Non-custodial Solana tipping • Powered by TiltCheck',
      Colors.PRIMARY
    );

    embed.addFields(
      {
        name: '💰 Tipping',
        value:
          '`/justthetip tip @user <amount>` - Send SOL to another user\n' +
          '`/justthetip wallet` - Manage your wallet\n' +
          '`/justthetip balance` - Check your balance\n' +
          '`/airdrop` - Send SOL to multiple users',
        inline: false,
      },
      {
        name: '🔍 Link Scanning',
        value:
          '`/scan <url>` - Scan a casino link for suspicious patterns\n' +
          'Detects phishing, scams, and fake casino sites.',
        inline: false,
      },
      {
        name: '🎯 More Features',
        value:
          '• `/triviadrop` - Play trivia for rewards\n' +
          '• `/trust` - Check trust scores\n' +
          '• `/support` - Get help from the community',
        inline: false,
      },
      {
        name: '🛠️ Utility',
        value: '`/ping` - Check bot status\n`/help` - Show this message',
        inline: false,
      },
      {
        name: '📊 Features',
        value:
          '✅ Non-custodial (you control your funds)\n' +
          '✅ Flat $0.07 fee per tip\n' +
          '✅ Direct wallet-to-wallet transfers\n' +
          '✅ Automatic link scanning',
        inline: false,
      }
    );

    embed.setFooter({
      text: 'JustTheTip Bot • Powered by TiltCheck',
    });

    await interaction.reply({ embeds: [embed] });
  },
};
