/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { dad, type Player } from '@tiltcheck/dad';
import { errorEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const scores: Command = {
  data: new SlashCommandBuilder()
    .setName('scores')
    .setDescription('View the current DA&D leaderboard'),
  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;

    try {
      const games = dad.getChannelGames(channelId);

      if (games.length === 0) {
        await interaction.reply({
          embeds: [errorEmbed('No game', 'No active game in this channel.')],
          ephemeral: true
        });
        return;
      }

      const game = games[0];
      const sortedPlayers = Array.from(game.players.values())
        .sort((a: Player, b: Player) => b.score - a.score);

      const leaderboard = sortedPlayers
        .map((p: any, i) => `${i + 1}. **${p.username}**: ${p.score} point${p.score !== 1 ? 's' : ''}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle('🏆 Leaderboard')
        .setDescription(leaderboard)
        .addFields(
          { name: 'Round', value: `${game.currentRound}/${game.maxRounds}`, inline: true },
          { name: 'Players', value: game.players.size.toString(), inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Failed to show scores', error.message)],
        ephemeral: true
      });
    }
  },
};
