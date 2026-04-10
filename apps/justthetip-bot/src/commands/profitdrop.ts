// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
// JustTheTip Bot — Profitdrop Command

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

export const profitdrop: Command = {
  data: new SlashCommandBuilder()
    .setName('profitdrop')
    .setDescription('Schedule a timed profit drop to qualifying wallets in this server.'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: '[COMING SOON] Scheduled profit drops are in development. Use `/juicedrop` for an instant reaction-based drop.',
      ephemeral: true,
    });
  },
};
