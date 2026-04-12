// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
// TiltCheck Safety Bot — Help Command

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Command map for the TiltCheck audit bot.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('TILTCHECK — COMMAND MAP')
      .setDescription('This is the audit bot. It watches your session, checks casinos, and scans sus links. If you are here for drops, wallets, or card games, wrong degen, wrong bot.')
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

    embed.addFields(
      {
        name: 'Session Audit',
        value:
          '`/status` — See how cooked your session looks right now\n' +
          '`/buddy` — Pick who gets the "yo, this degen is spiraling" ping\n' +
          '`/goal` — Set the number where you leave with your bag intact\n' +
          '`/cooldown` — Hit your own brakes before the session gets stupid\n' +
          '`/intervene` — Toggle the hard brake: DM and accountability ping always, VC move only when you allow it',
        inline: false,
      },
      {
        name: 'Hard Stops',
        value:
          '`/touchgrass` — Slam a 24-hour emergency lockout on yourself\n' +
          '`/block-game` — Ban a game or category from your own orbit\n' +
          '`/unblock-game` — Remove a block when your brain is normal again\n' +
          '`/my-exclusions` — See the list of games you already exiled',
        inline: false,
      },
      {
        name: 'Math and Trust',
        value:
          '`/odds` — Pull the house edge and RTP so "im due" dies on impact\n' +
          '`/verify` — Check the provably fair math instead of trusting casino vibes\n' +
          '`/casino` — Audit a casino before it audits your bankroll\n' +
          '`/reputation` — Pull a trust read on users or platforms',
        inline: false,
      },
      {
        name: 'Security',
        value:
          '`/scan` — Check a link for phishing, skem bait, and other sus nonsense\n' +
          '`/sos` — Get the microgrant info if a session or scam clipped you',
        inline: false,
      },
      {
        name: 'Dashboard and Stats',
        value:
          '`/status` — Fast read on your live risk state\n' +
          '`/dashboard` — Open the 7-day tilt trail and event history\n' +
          '`/setstate` — Save your state and rules topic so TiltCheck stops guessing\n' +
          '`/support` — Send a bug report without the helpdesk cosplay\n' +
          '`/ping` — Make sure the bot is alive and not face-down in the gutter',
        inline: false,
      },
      {
        name: 'Other Bots',
        value:
          '**JustTheTip** handles the bag-moving stuff — `/juicedrop`, `/linkwallet`, `/lockvault`, `/bonuses`\n' +
          '**DAD** handles card games and trivia — `/lobby`, `/triviadrop`\n' +
          'Full dashboard: https://hub.tiltcheck.me',
        inline: false,
      },
      {
        name: 'Legal',
        value:
          '`/terms` — Read the rules before you start crying about the rules\n' +
          '[Terms](https://tiltcheck.me/terms) · [Privacy](https://tiltcheck.me/privacy) · [Risk Limits](https://tiltcheck.me/legal/limit)',
        inline: false,
      }
    );

    embed.setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed] });
  },
};
