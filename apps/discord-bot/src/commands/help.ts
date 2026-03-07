/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Help Command
 * 
 * Displays available commands and module information.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType } from 'discord.js';
import { createEmbed, Colors } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show safety commands and bot routing')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = createEmbed(
      '🛡️ TiltCheck Safety Bot',
      'Risk checks, moderation tools, and responsible play utilities',
      Colors.PRIMARY
    );

    embed.addFields(
      {
        name: 'Core Safety',
        value:
          '`/tiltcheck status` - Check your current tilt state\n' +
          '`/tiltcheck history` - View your tilt history\n' +
          '`/tiltcheck cooldown [minutes]` - Start a cooldown',
        inline: false,
      },
      {
        name: 'Trust And Link Safety',
        value:
          '`/tiltcheck casino domain:<domain>` - Get trust/fairness data\n' +
          '`/tiltcheck suslink scan url:<url>` - Scan a suspicious URL\n' +
          '`/tiltcheck suslink submit url:<url>` - Submit promo links for review',
        inline: false,
      },
      {
        name: 'Community And Moderation',
        value:
          '`/buddy add @user` - Set up an accountability buddy\n' +
          '`/report <target> <action> <reason>` - Log a report\n' +
          '`/setstate state:<XX>` - Save optional region context',
        inline: false,
      },
      {
        name: 'Utility',
        value:
          '`/ping` - Health check\n' +
          '`/help` - Show this command guide',
        inline: false,
      },
      {
        name: 'Command Routing',
        value:
          'Tipping and vault commands are in the JustTheTip bot.\n' +
          'DA&D and poker commands are in the DA&D bot.\n' +
          'Bonus timer commands are in your external CollectClock bot.',
        inline: false,
      }
    );

    embed.setFooter({
      text: 'TiltCheck Safety Bot',
    });

    await interaction.reply({ embeds: [embed] });
  },
};
