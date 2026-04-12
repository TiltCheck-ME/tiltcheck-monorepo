// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const ping: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if the bot is awake or face-down.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.deferReply({ fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('PONG')
      .setDescription(`Bot latency: ${latency}ms\nWebSocket: ${interaction.client.ws.ping}ms\nStill breathing.`)
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.editReply({ embeds: [embed] });
  },
};
