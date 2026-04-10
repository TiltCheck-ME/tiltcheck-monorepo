// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
// TiltCheck Safety Bot — Help Command

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Full command map for the TiltCheck safety bot.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('TILTCHECK — COMMAND MAP')
      .setDescription('Session auditing, casino trust scoring, and link scanning. This bot does not handle tips, drops, or card games — those are separate bots.')
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

    embed.addFields(
      {
        name: 'Session Audit',
        value:
          '`/status` — Current session risk snapshot\n' +
          '`/buddy` — Link an accountability contact\n' +
          '`/goal` — Set a session target and exit point\n' +
          '`/cooldown` — Start a voluntary session cooldown\n' +
          '`/intervene` — Toggle voice channel safety intervention',
        inline: false,
      },
      {
        name: 'Math and Trust',
        value:
          '`/odds` — House edge and RTP for any game\n' +
          '`/verify` — Provably fair hash verification\n' +
          '`/casino` — Trust score and fairness lookup\n' +
          '`/trust` — Reputation audit for users or platforms',
        inline: false,
      },
      {
        name: 'Security',
        value:
          '`/scan` — Check a URL for phishing and scam signals\n' +
          '`/recover` — Community recovery microgrant info and application',
        inline: false,
      },
      {
        name: 'Dashboard and Stats',
        value:
          '`/status` — Live risk snapshot\n' +
          '`/dashboard` — View 7-day tilt stats and event history',
        inline: false,
      },
      {
        name: 'Other Bots',
        value:
          'Profit drops, wallet, and bonuses: **JustTheTip** bot — `/juicedrop`, `/linkwallet`, `/lockvault`, `/bonuses`\n' +
          'Card games and trivia: **DAD** (Degens Against Decency) bot — `/lobby`, `/triviadrop`\n' +
          'Full dashboard: https://tiltcheck.me/dashboard',
        inline: false,
      }
    );

    embed.setFooter({ text: 'TiltCheck — Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed] });
  },
};
