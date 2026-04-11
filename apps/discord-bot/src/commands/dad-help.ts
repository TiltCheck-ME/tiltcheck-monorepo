// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const degensHelp: Command = {
  data: new SlashCommandBuilder()
    .setName('degens-help')
    .setDescription('Commands for the Degens Against Decency bot'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle('DEGENS AGAINST DECENCY — COMMAND REFERENCE')
      .addFields(
        {
          name: '/lobby',
          value:
            '**create** `max_players` `max_rounds` — Start a new Degens Against Decency game in this channel\n' +
            '**join** — Join the open game in this channel\n' +
            '**start** — Host starts the game (min 3 players)\n' +
            '**hand** — View your current white cards (ephemeral)\n' +
            '**submit** `card_index` — Play a white card for the active black card\n' +
            '**pick** `submission_index` — Judge picks the winning submission\n' +
            '**scores** — See the current scoreboard\n' +
            '**end** — Host ends the game early',
        },
        {
          name: '/triviadrop',
          value:
            '`topic` `prize_total` `rounds` `timer` — Host a crypto/casino trivia game with an on-chain SOL prize pool.\n\n' +
            'Correct reactors split each round\'s prize. Host funds a non-custodial escrow before the game starts.\n' +
            'Winners must have `/linkwallet` set. Unclaimed shares go to the TiltCheck community wallet.',
        },
        {
          name: '/linkwallet',
          value: '`address` — Link your Solana wallet to receive payouts from triviadrop and other prize commands.',
        }
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
