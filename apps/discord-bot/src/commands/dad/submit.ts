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

export const submit: Command = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit a card for the active round')
    .addIntegerOption(option =>
      option.setName('card').setDescription('Card number from your hand').setRequired(true).setMinValue(1)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const cardNumber = interaction.options.getInteger('card', true);

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
      const player = game.players.get(userId);

      if (!player) {
        await interaction.reply({
          embeds: [errorEmbed('Not in game', 'You\'re not in this game.')],
          ephemeral: true
        });
        return;
      }

      if (cardNumber > player.hand.length) {
        await interaction.reply({
          embeds: [errorEmbed('Invalid card', `You only have ${player.hand.length} cards. Use /hand to view your cards.`)],
          ephemeral: true
        });
        return;
      }

      const card = player.hand[cardNumber - 1];
      await dad.submitCards(game.id, userId, [card.id]);

      const currentRound = game.rounds[game.rounds.length - 1];

      await interaction.reply({
        embeds: [successEmbed('Card submitted!', `You played: "${card.text}"\n\nWaiting for other players... (${currentRound.submissions.size}/${game.players.size})`)],
        ephemeral: true
      });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Failed to submit', error.message)],
        ephemeral: true
      });
    }
  },
};
