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

export const play: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Create a new DA&D lobby')
    .addIntegerOption(option =>
      option.setName('rounds').setDescription('Number of rounds (default: 10)').setRequired(false).setMinValue(3).setMaxValue(20)
    )
    .addIntegerOption(option =>
      option.setName('maxplayers').setDescription('Max players (default: 10)').setRequired(false).setMinValue(2).setMaxValue(10)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;
    const rounds = interaction.options.getInteger('rounds') || 10;
    const maxPlayers = interaction.options.getInteger('maxplayers') || 10;

    try {
      const existingGames = dad.getChannelGames(channelId);
      if (existingGames.length > 0) {
        await interaction.reply({
          embeds: [errorEmbed('Game exists', 'There\'s already a game in this channel. Join with `/join` or wait for it to finish.')],
          ephemeral: true
        });
        return;
      }

      const game = await dad.createGame(channelId, ['degen-starter'], { maxRounds: rounds, maxPlayers });

      const embed = new EmbedBuilder()
        .setColor(0xff00ff)
        .setTitle('🃏 DA&D Game Created!')
        .setDescription('**Degens Against Decency** is ready to play!')
        .addFields(
          { name: 'Game ID', value: game.id.slice(0, 8), inline: true },
          { name: 'Rounds', value: rounds.toString(), inline: true },
          { name: 'Max Players', value: maxPlayers.toString(), inline: true },
          { name: 'Status', value: '⏳ Waiting for players...', inline: false }
        )
        .setFooter({ text: 'Join with /join • Start with /startgame' });

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Failed to create game', error.message)],
        ephemeral: true
      });
    }
  },
};
