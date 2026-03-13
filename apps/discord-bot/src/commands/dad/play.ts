/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { dad } from '@tiltcheck/dad';
import { errorEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../../types.js';

export const play: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Unleash the f***ing chaos! Create a new DA&D game lobby.') // MODIFIED
    .addIntegerOption(option =>
      option.setName('rounds').setDescription('How many rounds of pure degeneracy? (default: 10)').setRequired(false).setMinValue(3).setMaxValue(20) // MODIFIED
    )
    .addIntegerOption(option =>
      option.setName('maxplayers').setDescription('How many poor souls can join this madness? (default: 10)').setRequired(false).setMinValue(2).setMaxValue(10) // MODIFIED
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;
    const rounds = interaction.options.getInteger('rounds') || 10;
    const maxPlayers = interaction.options.getInteger('maxplayers') || 10;

    try {
      const existingGames = dad.getChannelGames(channelId);
      if (existingGames.length > 0) {
        await interaction.reply({
          embeds: [errorEmbed('Game Already Brewing, Degenerate', 'Hold your horses! There's already a cesspool of DAAD in this channel. Join with `/dad join` or wait for the current round of f***ery to finish.')], // MODIFIED
          ephemeral: true
        });
        return;
      }

      const game = await dad.createGame(channelId, ['degen-starter'], { maxRounds: rounds, maxPlayers });

      const embed = new EmbedBuilder()
        .setColor(0xff00ff)
        .setTitle('🃏 DA&D Chaos Initiated!') // MODIFIED
        .setDescription('The arena is open, you sick f***s! **Degens Against Decency** is ready for battle.') // MODIFIED
        .addFields(
          { name: 'Game ID', value: game.id.slice(0, 8), inline: true },
          { name: 'Rounds', value: rounds.toString(), inline: true },
          { name: 'Max Players', value: maxPlayers.toString(), inline: true },
          { name: 'Status', value: '⏳ Waiting for more unfortunate souls...', inline: false } // MODIFIED
        )
        .setFooter({ text: 'Use `/dad join` to leap into the filth • Use `/dad startgame` to commence the f***ery.' }); // MODIFIED

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Game Creation Failure', `Well, sh**. Couldn't summon the game: ${error.message}. Maybe try praying to your crypto gods?`)], // MODIFIED
        ephemeral: true
      });
    }
  },
};
