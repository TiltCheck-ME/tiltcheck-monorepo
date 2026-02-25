/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * DA&D Bot Commands
 * 
 * All game commands for Degens Against Decency
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { dad } from '@tiltcheck/dad';
import { successEmbed, errorEmbed } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const play: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Start a new DA&D game')
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

export const join: Command = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join an active DA&D game in this channel'),
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

export const startgame: Command = {
  data: new SlashCommandBuilder()
    .setName('startgame')
    .setDescription('Start the DA&D game (requires 2+ players)'),
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

export const submit: Command = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit a card for this round')
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

export const vote: Command = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Vote for the funniest answer')
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

export const scores: Command = {
  data: new SlashCommandBuilder()
    .setName('scores')
    .setDescription('View current game scores'),
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
      const sortedPlayers = Array.from(game.players.values())
        .sort((a, b) => b.score - a.score);

      const leaderboard = sortedPlayers
        .map((p, i) => `${i + 1}. **${p.username}**: ${p.score} point${p.score !== 1 ? 's' : ''}`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle('🏆 Leaderboard')
        .setDescription(leaderboard)
        .addFields(
          { name: 'Round', value: `${game.currentRound}/${game.maxRounds}`, inline: true },
          { name: 'Players', value: game.players.size.toString(), inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({
        embeds: [errorEmbed('Failed to show scores', error.message)],
        ephemeral: true
      });
    }
  },
};
