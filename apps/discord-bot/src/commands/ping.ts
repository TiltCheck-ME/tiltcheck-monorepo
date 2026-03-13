/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Ping Command
 * 
 * Simple health check command.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { successEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const ping: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if the bot is alive or if it rugged.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.deferReply({ fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    await interaction.editReply({
      content: `Yeah, I'm here. Don't get your panties in a twist.
Latency: ${latency}ms | WebSocket: ${interaction.client.ws.ping}ms`,
    });
  },
};
