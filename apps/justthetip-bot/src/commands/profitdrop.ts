// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
// JustTheTip Bot — Profitdrop Command

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

export const profitdrop: Command = {
  data: new SlashCommandBuilder()
    .setName('profitdrop')
    .setDescription('Schedule a timed profit drop to qualifying wallets in this server.'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: '[UNAVAILABLE] /profitdrop is not live in this build. Use `/juicedrop` for the active channel drop flow.',
      ephemeral: true,
    });
  },
};
