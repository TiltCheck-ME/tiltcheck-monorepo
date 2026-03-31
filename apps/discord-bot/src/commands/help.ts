/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Edge Equalizer Help Command
 * Technical map for the audit specialist.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Your friend who went to stats class and actually paid attention.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('🛡️ THE AUDIT MAP')
      .setDescription('Independent session audits and mathematical verification. We don\'t stop you; we audit you.')
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

    embed.addFields(
      {
        name: '📊 Session Audit',
        value:
          '`/status` - Quick check on how your session is looking\n' +
          '`/tether` - Link yourself to someone who\'ll check in on you\n' +
          '`/goal` - Set a session target so you actually know when to stop.',
        inline: false,
      },
      {
        name: '⚖️ Math & Trust',
        value:
          '`/odds` - House edge and RTP check for any game\n' +
          '`/verify` - Provably fair verification (trust but verify)\n' +
          '`/casino` - Trust score and fairness lookup for platforms.',
        inline: false,
      },
      {
        name: '💾 Securing the Bag',
        value:
          '`/juicedrop` - Fund a non-custodial profit lock\n' +
          '`/lockvault` - Time-lock your winnings before you bet them back.\n' +
          '`/reputation` - Audit scores for users or platforms.',
        inline: false,
      },
      {
        name: '🤖 Other stuff',
        value:
          '**HUD:** Full dashboard is in the Activity panel on the right.\n' +
          '**Games:** DA&D and Poker are in the DA&D bot.\n' +
          '**Tips:** P2P tipping lives in the JustTheTip bot.',
        inline: false,
      }
    );

    embed.setFooter({
      text: 'TiltCheck — We can count too.',
    });

    await interaction.reply({ embeds: [embed] });
  },
};
