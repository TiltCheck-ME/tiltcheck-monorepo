/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { dad } from '@tiltcheck/dad';
import { errorEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../../types.js';

export const hand: Command = {
  data: new SlashCommandBuilder()
    .setName('hand')
    .setDescription('View your cards'),
  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;
    const userId = interaction.user.id;

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
          embeds: [errorEmbed('Not in game', 'You\'re not in this game. Join with `/join`')],
          ephemeral: true
        });
        return;
      }

      const cardList = player.hand
        .map((card, i) => `**${i + 1}.** ${card.text}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setTitle('🃏 Your Hand')
        .setDescription(cardList || 'No cards')
        .addFields(
          { name: 'Score', value: player.score.toString(), inline: true },
          { name: 'Cards', value: player.hand.length.toString(), inline: true }
        )
        .setFooter({ text: 'Submit cards with /submit <card number>' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Failed to show hand', error.message)],
        ephemeral: true
      });
    }
  },
};
