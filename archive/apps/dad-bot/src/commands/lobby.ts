// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * * Degens Against Decency Lobby Command
 * Wires the @tiltcheck/dad game engine to Discord slash commands.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import type { Command } from '../types.js';
import { dad } from '@tiltcheck/dad';

// channelId -> gameId mapping for active games
const activeGames = new Map<string, string>();

export const lobby: Command = {
  data: new SlashCommandBuilder()
    .setName('lobby')
    .setDescription('Degens Against Decency — Degens Against Decency card game')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new DA&D game in this channel')
        .addIntegerOption((opt) =>
          opt
            .setName('rounds')
            .setDescription('Number of rounds (default 5)')
            .setMinValue(1)
            .setMaxValue(20),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('players')
            .setDescription('Max players (default 8)')
            .setMinValue(2)
            .setMaxValue(10),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('join').setDescription('Join the open lobby in this channel'),
    )
    .addSubcommand((sub) =>
      sub.setName('start').setDescription('Start the game (host only)'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('hand')
        .setDescription('View your current hand — only visible to you'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('submit')
        .setDescription('Play a card from your hand')
        .addIntegerOption((opt) =>
          opt
            .setName('card')
            .setDescription('Card number from /lobby hand')
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('pick')
        .setDescription('Judge: pick the winning submission')
        .addIntegerOption((opt) =>
          opt
            .setName('submission')
            .setDescription('Submission number to pick as winner')
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('scores').setDescription('Show current scores'),
    )
    .addSubcommand((sub) =>
      sub.setName('end').setDescription('End the current game (host only)'),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // --- CREATE ---
    if (sub === 'create') {
      const existing = dad.getChannelGames(channelId);
      if (existing.length > 0) {
        await interaction.reply({
          content:
            '[!] A game is already active in this channel. Use `/lobby end` first.',
          ephemeral: true,
        });
        return;
      }

      const rounds = interaction.options.getInteger('rounds') ?? 5;
      const maxPlayers = interaction.options.getInteger('players') ?? 8;

      const game = await dad.createGame(channelId, ['degen-starter'], {
        maxRounds: rounds,
        maxPlayers,
      });
      activeGames.set(channelId, game.id);

      await dad.joinGame(game.id, userId, username);

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle('DEGENS AGAINST DECENCY — LOBBY OPEN')
        .setDescription(
          `Game created by <@${userId}>. **${rounds} rounds**, up to **${maxPlayers} players**.\n\n` +
            `Use \`/lobby join\` to enter. Host starts the game with \`/lobby start\`.\n` +
            `*Minimum 2 players required to start.*`,
        )
        .addFields({ name: `Players (1/${maxPlayers})`, value: `<@${userId}>` })
        .setFooter({ text: 'Degens Against Decency — Made for Degens. By Degens.' });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // --- JOIN ---
    if (sub === 'join') {
      const gameId = activeGames.get(channelId);
      const game = gameId ? dad.getGame(gameId) : undefined;

      if (!game || game.status !== 'waiting') {
        await interaction.reply({
          content:
            '[!] No open lobby in this channel. Use `/lobby create` to start one.',
          ephemeral: true,
        });
        return;
      }

      try {
        await dad.joinGame(game.id, userId, username);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not join.';
        await interaction.reply({ content: `[!] ${msg}`, ephemeral: true });
        return;
      }

      const playerList = Array.from(game.players.keys())
        .map((id) => `<@${id}>`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle('Degens Against Decency — PLAYER JOINED')
        .setDescription(`<@${userId}> is in.`)
        .addFields({
          name: `Players (${game.players.size}/${game.maxPlayers})`,
          value: playerList,
        })
        .setFooter({ text: 'Degens Against Decency — Made for Degens. By Degens.' });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // --- START ---
    if (sub === 'start') {
      const gameId = activeGames.get(channelId);
      const game = gameId ? dad.getGame(gameId) : undefined;

      if (!game || game.status !== 'waiting') {
        await interaction.reply({
          content: '[!] No open lobby to start.',
          ephemeral: true,
        });
        return;
      }

      const hostId = Array.from(game.players.keys())[0];
      if (hostId !== userId) {
        await interaction.reply({
          content: '[!] Only the host can start the game.',
          ephemeral: true,
        });
        return;
      }

      try {
        const started = await dad.startGame(game.id);
        const round = started.rounds[started.rounds.length - 1];

        const embed = new EmbedBuilder()
          .setColor(0x22d3a6)
          .setTitle(`Degens Against Decency — ROUND 1 OF ${started.maxRounds}`)
          .setDescription(`**Black Card:**\n> ${round.blackCard.text}`)
          .addFields(
            { name: 'Judge', value: `<@${round.judgeUserId}>`, inline: true },
            {
              name: 'Submit Window',
              value: `${started.submitWindowMs / 1000}s`,
              inline: true,
            },
            {
              name: 'Instructions',
              value:
                '`/lobby hand` — see your cards\n`/lobby submit <number>` — play a card\nJudge waits, then picks with `/lobby pick <number>`',
              inline: false,
            },
          )
          .setFooter({ text: 'Degens Against Decency — Made for Degens. By Degens.' });

        await interaction.reply({ embeds: [embed] });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not start.';
        await interaction.reply({ content: `[!] ${msg}`, ephemeral: true });
      }
      return;
    }

    // --- HAND ---
    if (sub === 'hand') {
      const gameId = activeGames.get(channelId);
      const game = gameId ? dad.getGame(gameId) : undefined;

      if (!game || game.status !== 'active') {
        await interaction.reply({
          content: '[!] No active game in this channel.',
          ephemeral: true,
        });
        return;
      }

      const player = game.players.get(userId);
      if (!player) {
        await interaction.reply({
          content: '[!] You are not in this game.',
          ephemeral: true,
        });
        return;
      }

      const round = game.rounds[game.rounds.length - 1];
      if (round?.judgeUserId === userId) {
        await interaction.reply({
          content:
            'You are the judge this round. Wait for all submissions, then use `/lobby pick <number>`.',
          ephemeral: true,
        });
        return;
      }

      const handText =
        player.hand.length > 0
          ? player.hand
              .map((card, i) => `**${i + 1}.** ${card.text}`)
              .join('\n')
          : 'Your hand is empty.';

      const embed = new EmbedBuilder()
        .setColor(0x374151)
        .setTitle('YOUR HAND')
        .setDescription(handText)
        .setFooter({ text: 'Use /lobby submit <number> to play. Only you can see this.' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // --- SUBMIT ---
    if (sub === 'submit') {
      const gameId = activeGames.get(channelId);
      const game = gameId ? dad.getGame(gameId) : undefined;

      if (!game || game.status !== 'active') {
        await interaction.reply({
          content: '[!] No active game in this channel.',
          ephemeral: true,
        });
        return;
      }

      const player = game.players.get(userId);
      if (!player) {
        await interaction.reply({
          content: '[!] You are not in this game.',
          ephemeral: true,
        });
        return;
      }

      const cardNumber = interaction.options.getInteger('card', true);
      const card = player.hand[cardNumber - 1];
      if (!card) {
        await interaction.reply({
          content: `[!] No card at position ${cardNumber}. Use \`/lobby hand\` to see your cards.`,
          ephemeral: true,
        });
        return;
      }

      try {
        await dad.submitCards(game.id, userId, [card.id]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Submit failed.';
        await interaction.reply({ content: `[!] ${msg}`, ephemeral: true });
        return;
      }

      const round = game.rounds[game.rounds.length - 1];
      const required = Math.max(0, game.players.size - 1);
      const submitted = round.submissions.size;

      if (submitted >= required && round.phase === 'revealing') {
        const revealLines = round.revealedSubmissions
          .map((s, i) => `**${i + 1}.** ${s.cards.map((c) => c.text).join(' / ')}`)
          .join('\n');

        const embed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle(`Degens Against Decency — ROUND ${game.currentRound} REVEAL`)
          .setDescription(
            `**Black Card:**\n> ${round.blackCard.text}\n\n**Submissions:**\n${revealLines}`,
          )
          .addFields({
            name: 'Judge',
            value: `<@${round.judgeUserId}> — use \`/lobby pick <number>\` to pick the winner`,
          })
          .setFooter({ text: 'Degens Against Decency — Made for Degens. By Degens.' });

        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({
          content: `[SUBMITTED] Card played. Waiting on ${required - submitted} more player(s).`,
          ephemeral: true,
        });
      }
      return;
    }

    // --- PICK ---
    if (sub === 'pick') {
      const gameId = activeGames.get(channelId);
      const game = gameId ? dad.getGame(gameId) : undefined;

      if (!game || game.status !== 'active') {
        await interaction.reply({
          content: '[!] No active game in this channel.',
          ephemeral: true,
        });
        return;
      }

      const round = game.rounds[game.rounds.length - 1];
      if (!round || round.judgeUserId !== userId) {
        await interaction.reply({
          content: '[!] Only the round judge can pick a winner.',
          ephemeral: true,
        });
        return;
      }

      const subNumber = interaction.options.getInteger('submission', true);
      const submission = round.revealedSubmissions[subNumber - 1];
      if (!submission) {
        await interaction.reply({
          content: `[!] No submission at position ${subNumber}.`,
          ephemeral: true,
        });
        return;
      }

      try {
        await dad.pickWinner(game.id, userId, submission.userId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Pick failed.';
        await interaction.reply({ content: `[!] ${msg}`, ephemeral: true });
        return;
      }

      const winningText = submission.cards.map((c) => c.text).join(' / ');
      const updatedGame = dad.getGame(game.id);

      if (!updatedGame || updatedGame.status === 'completed') {
        activeGames.delete(channelId);

        const finalScores = Array.from(game.players.values())
          .sort((a, b) => b.score - a.score)
          .map(
            (p, i) =>
              `${i + 1}. <@${p.userId}> — ${p.score} point${p.score !== 1 ? 's' : ''}`,
          )
          .join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x22d3a6)
          .setTitle('Degens Against Decency — GAME OVER')
          .setDescription(
            `<@${userId}> picks **"${winningText}"** by <@${submission.userId}>.\n\n**Final Scores:**\n${finalScores}`,
          )
          .setFooter({ text: 'Degens Against Decency — Made for Degens. By Degens.' });

        await interaction.reply({ embeds: [embed] });
        return;
      }

      const nextRound = updatedGame.rounds[updatedGame.rounds.length - 1];

      const embed = new EmbedBuilder()
        .setColor(0x22d3a6)
        .setTitle(`Degens Against Decency — ROUND ${game.currentRound} WINNER`)
        .setDescription(
          `<@${userId}> picks **"${winningText}"** by <@${submission.userId}>!\n<@${submission.userId}> scores a point.`,
        )
        .addFields(
          {
            name: `Round ${updatedGame.currentRound} of ${updatedGame.maxRounds}`,
            value: `**Black Card:**\n> ${nextRound.blackCard.text}`,
          },
          {
            name: 'Judge',
            value: `<@${nextRound.judgeUserId}>`,
            inline: true,
          },
        )
        .setFooter({ text: 'Degens Against Decency — Made for Degens. By Degens.' });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // --- SCORES ---
    if (sub === 'scores') {
      const gameId = activeGames.get(channelId);
      const game = gameId ? dad.getGame(gameId) : undefined;

      if (!game) {
        await interaction.reply({
          content: '[!] No active game in this channel.',
          ephemeral: true,
        });
        return;
      }

      const scoreLines = Array.from(game.players.values())
        .sort((a, b) => b.score - a.score)
        .map(
          (p, i) =>
            `${i + 1}. <@${p.userId}> — ${p.score} pt${p.score !== 1 ? 's' : ''}`,
        )
        .join('\n');

      const statusLine =
        game.status === 'waiting'
          ? 'Lobby open'
          : game.status === 'active'
            ? `Round ${game.currentRound} of ${game.maxRounds}`
            : 'Game complete';

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle('Degens Against Decency — SCORES')
        .addFields(
          { name: 'Status', value: statusLine, inline: true },
          { name: 'Scoreboard', value: scoreLines || 'No scores yet.' },
        )
        .setFooter({ text: 'Degens Against Decency — Made for Degens. By Degens.' });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // --- END ---
    if (sub === 'end') {
      const gameId = activeGames.get(channelId);
      if (!gameId) {
        await interaction.reply({
          content: '[!] No active game in this channel.',
          ephemeral: true,
        });
        return;
      }

      const game = dad.getGame(gameId);
      const hostId = game ? Array.from(game.players.keys())[0] : null;

      if (hostId && hostId !== userId) {
        await interaction.reply({
          content: '[!] Only the host can end the game.',
          ephemeral: true,
        });
        return;
      }

      activeGames.delete(channelId);
      await interaction.reply({ content: `Game ended by <@${userId}>.` });
    }
  },
};
