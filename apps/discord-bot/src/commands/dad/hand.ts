/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { dad } from '@tiltcheck/dad';
import { errorEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../../types.js';

export const hand: Command = {
  data: new SlashCommandBuilder()
    .setName('hand')
    .setDescription('See what filth you're holding. (Don't f*** it up).'), // MODIFIED
  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;
    const userId = interaction.user.id;

    try {
      const games = dad.getChannelGames(channelId);

      if (games.length === 0) {
        await interaction.reply({
          embeds: [errorEmbed('Game Over, Degenerate', 'There's no active game of DAAD in this channel. Are you trying to play with yourself?')], // MODIFIED
          ephemeral: true
        });
        return;
      }

      const game = games[0];
      const player = game.players.get(userId);

      if (!player) {
        await interaction.reply({
          embeds: [errorEmbed('GTFO', 'You're not even in this game, you peon. Use `/dad join` to get in on the action.')], // MODIFIED
          ephemeral: true
        });
        return;
      }

      const cardList = player.hand
        .map((card, i) => `**${i + 1}.** ${card.text}`)
        .join('
');

      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setTitle('🃏 Your Hand of Filth') // MODIFIED
        .setDescription(cardList || 'Your hand is empty, just like your wallet. Get some cards, degen.') // MODIFIED
        .addFields(
          { name: 'Score', value: player.score.toString(), inline: true },
          { name: 'Cards', value: player.hand.length.toString(), inline: true }
        )
        .setFooter({ text: 'Submit your chosen card with /dad submit <card number>. Don't be a pussy.' }); // MODIFIED

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Hand Malfunction', `Well, sh**. Couldn't show your cards: ${error.message}. Blame the dev, not the game.`)], // MODIFIED
        ephemeral: true
      });
    }
  },
};
