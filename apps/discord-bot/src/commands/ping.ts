/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
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
    .setDescription('Check if the bot is responsive'),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.deferReply({ fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    const embed = successEmbed(
      '🏓 Pong!',
      `Bot latency: ${latency}ms\nWebSocket: ${interaction.client.ws.ping}ms`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
