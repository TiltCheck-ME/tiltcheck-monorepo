/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { dad } from '@tiltcheck/dad';
import { successEmbed, errorEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../../types.js';

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
      const currentRound = game.rounds[game.rounds.length - 1];
      if (!currentRound) {
        throw new Error('No active round');
      }

      if (currentRound.judgeUserId === userId) {
        await interaction.reply({
          embeds: [errorEmbed('Judge turn', 'You are the judge this round. Use `/vote` to pick the winner after submissions reveal.')],
          ephemeral: true
        });
        return;
      }

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
      const expectedSubmissions = Math.max(0, game.players.size - 1);

      await interaction.reply({
        embeds: [successEmbed('Card submitted!', `You played: "${card.text}"\n\nWaiting for other players... (${currentRound.submissions.size}/${expectedSubmissions})`)],
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
