/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { dad } from '@tiltcheck/dad';
import { errorEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const startgame: Command = {
  data: new SlashCommandBuilder()
    .setName('startgame')
    .setDescription('Start the current DA&D lobby (2+ players)'),
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
      await dad.startGame(game.id);

      const currentRound = game.rounds[0];
      const blackCard = currentRound.blackCard;

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🎮 Game Started!')
        .setDescription('**Round 1 - Black Card:**')
        .addFields(
          { name: '⬛ Prompt', value: blackCard.text, inline: false },
          { name: 'Players', value: game.players.size.toString(), inline: true },
          { name: 'Rounds', value: `1/${game.maxRounds}`, inline: true }
        )
        .setFooter({ text: 'Use /hand to see your cards • Submit with /submit' });

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Failed to start', error.message)],
        ephemeral: true
      });
    }
  },
};
