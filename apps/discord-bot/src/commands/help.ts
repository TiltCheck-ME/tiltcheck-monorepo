/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * TiltCheck Safety Bot Help Command
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Full command map for the TiltCheck safety bot.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('TILTCHECK SAFETY BOT — COMMAND MAP')
      .setDescription('Session auditing, trust scoring, and link scanning. This bot does not handle tips or card games.')
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

    embed.addFields(
      {
        name: 'Session Audit',
        value:
          '`/status` — Current session risk snapshot\n' +
          '`/tether` — Link an accountability contact\n' +
          '`/goal` — Set a session target and exit point',
        inline: false,
      },
      {
        name: 'Math and Trust',
        value:
          '`/odds` — House edge and RTP for any game\n' +
          '`/verify` — Provably fair verification\n' +
          '`/casino` — Trust score and fairness lookup',
        inline: false,
      },
      {
        name: 'Securing the Bag',
        value:
          '`/juicedrop` — Fund a non-custodial profit lock\n' +
          '`/lockvault` — Time-lock winnings before you bet them back\n' +
          '`/reputation` — Audit scores for users or platforms',
        inline: false,
      },
      {
        name: 'Other Bots',
        value:
          'Tips and P2P payments: JustTheTip bot\n' +
          'Card games and poker: Degens Against Decency bot\n' +
          'Full dashboard: https://tiltcheck.me/dashboard',
        inline: false,
      }
    );

    embed.setFooter({
      text: 'TiltCheck — Made for Degens. By Degens.',
    });

    await interaction.reply({ embeds: [embed] });
  },
};
