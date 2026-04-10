// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('DAD bot command map.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0xff4500)
      .setTitle('DEGENS AGAINST DECENCY — COMMAND MAP')
      .setDescription('Card games, trivia drops, and jackpots. This bot does not handle tipping or session auditing.')
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

    embed.addFields(
      {
        name: 'Card Game',
        value:
          '`/lobby create` — Create a new Degens Against Decency game\n' +
          '`/lobby join` — Join an open game\n' +
          '`/lobby start` — Start the game (host only)\n' +
          '`/lobby hand` — View your cards (private)\n' +
          '`/lobby submit` — Play a white card\n' +
          '`/lobby pick` — Judge: pick the winner\n' +
          '`/lobby scores` — Current scoreboard\n' +
          '`/lobby end` — End the game (host only)',
        inline: false,
      },
      {
        name: 'Trivia and Prizes',
        value:
          '`/triviadrop` — Trivia game with SOL prizes\n' +
          '`/jackpot` — Community prizepool status',
        inline: false,
      },
      {
        name: 'Activities',
        value:
          '`/play` — Launch a Discord Activity (trivia, poker, slots)',
        inline: false,
      },
      {
        name: 'Other Bots',
        value:
          'Session auditing and casino trust: **TiltCheck** bot\n' +
          'SOL tipping and profit drops: **JustTheTip** bot',
        inline: false,
      }
    );

    embed.setFooter({ text: 'Degens Against Decency — Made for Degens. By Degens.' });
    await interaction.reply({ embeds: [embed] });
  },
};
