/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { dad } from '@tiltcheck/dad';
import { successEmbed, errorEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const vote: Command = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Vote for the winning answer this round')
    .addUserOption(option =>
      option.setName('player').setDescription('The player whose answer you\'re voting for').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;
    const voterId = interaction.user.id;
    const targetUser = interaction.options.getUser('player', true);
    const targetUserId = targetUser.id;

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
      await dad.vote(game.id, voterId, targetUserId);

      const currentRound = game.rounds[game.rounds.length - 1];

      await interaction.reply({
        embeds: [successEmbed('Vote cast!', `You voted for ${targetUser.username}'s answer!\n\nVotes: ${currentRound.votes.size}/${game.players.size - 1}`)],
        ephemeral: true
      });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Failed to vote', error.message)],
        ephemeral: true
      });
    }
  },
};
