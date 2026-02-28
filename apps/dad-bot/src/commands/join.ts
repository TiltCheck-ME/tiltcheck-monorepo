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

export const join: Command = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join the active DA&D lobby in this channel'),
  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
      const games = dad.getChannelGames(channelId);

      if (games.length === 0) {
        await interaction.reply({
          embeds: [errorEmbed('No game', 'No active game in this channel. Start one with `/play`')],
          ephemeral: true
        });
        return;
      }

      const game = games[0];
      const player = await dad.joinGame(game.id, userId, username);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Joined Game!')
        .setDescription(`You've joined the game with ${player.hand.length} cards in your hand.`)
        .addFields(
          { name: 'Players', value: `${game.players.size}/${game.maxPlayers}`, inline: true },
          { name: 'Your Hand', value: `${player.hand.length} cards`, inline: true }
        )
        .setFooter({ text: `${game.players.size >= 2 ? 'Ready to start!' : 'Waiting for more players...'}` });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Failed to join', error.message)],
        ephemeral: true
      });
    }
  },
};
