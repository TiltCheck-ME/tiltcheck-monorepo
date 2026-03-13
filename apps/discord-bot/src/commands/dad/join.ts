/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { dad } from '@tiltcheck/dad';
import { errorEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../../types.js';

export const join: Command = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Dive into the chaos! Join the active DA&D game in this channel.'), // MODIFIED
  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
      const games = dad.getChannelGames(channelId);

      if (games.length === 0) {
        await interaction.reply({
          embeds: [errorEmbed('Game Over, Degenerate', 'There's no active game of DAAD in this channel. Are you trying to play with yourself? You need to `/dad start` one first, you ape.')], // MODIFIED
          ephemeral: true
        });
        return;
      }

      const game = games[0];
      const player = await dad.joinGame(game.id, userId, username);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Welcome to the Filth!') // MODIFIED
        .setDescription(`You've just jumped into the chaos, holding ${player.hand.length} cards of pure degeneracy. Good luck, you'll need it.`) // MODIFIED
        .addFields(
          { name: 'Players', value: `${game.players.size}/${game.maxPlayers}`, inline: true },
          { name: 'Your Hand', value: `${player.hand.length} cards`, inline: true }
        )
        .setFooter({ text: `${game.players.size >= 2 ? 'Let the games begin! Use /dad play to start the f***ing game.' : 'Waiting for more warm bodies to sacrifice...'}` }); // MODIFIED

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Join Failed', `Well, sh**. Couldn't shove you into the game: ${error.message}. Maybe try less f***ing around?`)], // MODIFIED
        ephemeral: true
      });
    }
  },
};
