/**
 * Help Command
 * 
 * Displays available commands and module information.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { createEmbed, Colors } from '@tiltcheck/discord-utils';
import type { Command } from '../types';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands and features'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = createEmbed(
      '🎰 TiltCheck Bot',
      'Your gambling accountability companion',
      Colors.PRIMARY
    );

    embed.addFields(
      {
        name: '🔍 Link Scanning',
        value:
          '`/scan <url>` - Scan a casino link for suspicious patterns\n' +
          'Detects phishing, scams, and fake casino sites.',
        inline: false,
      },
      {
        name: '🎯 Coming Soon',
        value:
          '• `/tip` - Send crypto tips to other degens\n' +
          '• `/bonus` - Track your casino bonuses\n' +
          '• `/trust` - Check casino trust scores\n' +
          '• `/tilt` - Check your tilt status',
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
          '✅ Community-driven trust scores\n' +
          '✅ Automatic link scanning',
        inline: false,
      }
    );

    embed.setFooter({
      text: 'TiltCheck - Because degeneracy deserves better infrastructure',
    });

    await interaction.reply({ embeds: [embed] });
  },
};
