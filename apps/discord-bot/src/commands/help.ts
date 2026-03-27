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
    .setDescription('[TECH MAP] Audit commands and bot routing.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('🛡️ [EDGE EQUALIZER] THE AUDIT MAP')
      .setDescription('Independent session audits and mathematical verification. We don\'t stop you; we audit you.')
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

    embed.addFields(
      {
        name: '📊 SESSION AUDIT',
        value:
          '`/status` - Quick in-Discord HUD snippet\n' +
          '`/tether` - Link your accountability safety line\n' +
          '`/goal` - Set your session exit milestones.',
        inline: false,
      },
      {
        name: '⚖️ MATH & TRUST',
        value:
          '`/odds` - HOUSE EDGE/RTP check for house games\n' +
          '`/verify` - PROVABLY FAIR verification tool\n' +
          '`/casino` - Domain trust and fairness lookup.',
        inline: false,
      },
      {
        name: '💾 SECURING THE BAG',
        value:
          '`/juicedrop` - Fund a non-custodial profit spill\n' +
          '`/lockvault` - Dashboard portal to time-lock your bag.\n' +
          '`/reputation` - Audit scores (Mod Only).',
        inline: false,
      },
      {
        name: '🤖 BOT ROUTING',
        value:
          '**HUD:** Launch the full HUD via the Activity panel to the right.\n' +
          '**GAMES:** DA&D and Poker commands are in the DA&D bot.\n' +
          '**TIPS:** P2P tipping is handled by the JustTheTip bot.',
        inline: false,
      }
    );

    embed.setFooter({
      text: 'Edge Equalizer: LEVEL THE PLAYING FIELD. Fair, Transparent, Non-Punitive.',
    });

    await interaction.reply({ embeds: [embed] });
  },
};
