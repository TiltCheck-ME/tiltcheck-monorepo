// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { buildHelpEmbed } from './help.js';

export const degensHelp: Command = {
  data: new SlashCommandBuilder()
    .setName('degens-help')
    .setDescription('Legacy alias for the DAD command map.'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ embeds: [buildHelpEmbed()], ephemeral: true });
  },
};
