/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
    .setDescription('Lists all the commands you're probably not using correctly.')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = createEmbed(
      'Read the F***ing Manual',
      'Don\'t DM the admins. All the commands you need to not be a total liability are right here. Use them.',
      Colors.PRIMARY
    );

    embed.addFields(
      {
        name: 'Stop Losing Your Sh**',
        value:
          '`/tilt` - Check if you\'re about to blow up your account.\n' +
          '`/cooldown [minutes]` - Hit the brakes before you do something stupid.\n' +
          '`/dashboard` - See your degen report card.',
        inline: false,
      },
      {
        name: 'Stop Clicking Sh** Links',
        value:
          '`/casino <domain>` - See if a casino is a scam.\n' +
          '`/scan <url>` - Scan a link before you click it, you ape.',
        inline: false,
      },
      {
        name: 'Stop Being a Loner',
        value:
          '`/buddy add @user` - Get someone to save you from yourself.\n' +
          '`/report <...>` - Snitch on someone.',
        inline: false,
      },
      {
        name: 'The Other Bots',
        value:
          'Still here? Fine. `/ping` checks if the bot is alive.\n' +
          'Tipping and vaults are in the **JustTheTip** bot.\n' +
          'Poker is in the **DA&D** bot.\n' +
          'Bonus timers are in the **CollectClock** bot.',
        inline: false,
      }
    );

    embed.setFooter({
      text: 'Made for Degens. By Degens. Now go use the commands.',
    });

    await interaction.reply({ embeds: [embed] });
  },
};
