/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { dad, type Player } from '@tiltcheck/dad';
import { errorEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../../types.js';

export const scores: Command = {
  data: new SlashCommandBuilder()
    .setName('scores')
    .setDescription('See who's dominating and who's just a goddamn clown. Current DA&D leaderboard.'), // MODIFIED
  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;

    try {
      const games = dad.getChannelGames(channelId);

      if (games.length === 0) {
        await interaction.reply({
          embeds: [errorEmbed('No Game, No Glory, Degenerate', 'There's no active game of DAAD in this channel to rank. Go `/dad play` or `/dad join` some chaos!')], // MODIFIED
          ephemeral: true
        });
        return;
      }

      const game = games[0];
      const sortedPlayers = Array.from(game.players.values())
        .sort((a: Player, b: Player) => b.score - a.score);

      const leaderboard = sortedPlayers
        .map((p: any, i) => `${i + 1}. **${p.username}**: ${p.score} point${p.score !== 1 ? 's' : ''}`)
        .join('
');

      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle('🏆 DA&D Degenerate Leaderboard') // MODIFIED
        .setDescription(leaderboard || 'Looks like a ghost town. No one's scored any points yet, you cowards!') // MODIFIED
        .addFields(
          { name: 'Round', value: `${game.currentRound}/${game.maxRounds}`, inline: true },
          { name: 'Players', value: game.players.size.toString(), inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Scoreboard Malfunction', `Well, f***. Couldn't tally up the degeneracy: ${error.message}. Is the game rigged? Probably not. Blame the dev.`)], // MODIFIED
        ephemeral: true
      });
    }
  },
};
