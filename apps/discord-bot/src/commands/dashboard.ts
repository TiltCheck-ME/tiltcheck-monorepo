/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * /dashboard
 *
 * The only dashboard that matters. Gives every degen a brutally honest look
 * at their recent performance, tilt score, and f***-ups. 
 * Also the gateway to the full web dashboard, where the real pain lives.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getUserTiltStats, getUserTiltHistory } from '../handlers/tilt-events-handler.js';
import type { Command } from '../types.js';

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://tiltcheck.app/dashboard';

export const dashboard: Command = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('See your current state of degeneracy. Tilt stats, recent f***-ups, and more.'), // MODIFIED
  async execute(interaction: any) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
      const [stats, events] = await Promise.all([
        getUserTiltStats(userId),
        getUserTiltHistory(userId, { limit: 5, days: 7 }),
      ]);

      if (!stats) {
        return await interaction.editReply({
          content: 'Well, sh**. Couldn\'t fetch your tilt data. The system\'s having a moment. Try again when it\'s not so f***ed.',
        });
      }

      const tiltLevel = stats.averageTiltScore || 0;
      let color = 0x00ff00; // Green
      if (tiltLevel > 5) {
        color = 0xffff00; // Yellow
      }
      if (tiltLevel > 7) {
        color = 0xff9900; // Orange
      }
      if (tiltLevel > 9) {
        color = 0xff0000; // Red
      }

      const statsEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${username}'s Degen Report Card`)
        .setDescription('A brutal overview of your recent tilt activity and degeneracy.')
        .addFields([
          {
            name: 'Average Degeneracy (7-day avg)',
            value: `${tiltLevel.toFixed(1)}/10`,
            inline: true,
          },
          {
            name: 'Max Degeneracy (7-day)',
            value: `${stats.maxTiltScore}/10`,
            inline: true,
          },
          {
            name: 'Total F***-ups',
            value: `${stats.totalEvents}`,
            inline: true,
          },
          {
            name: 'Recent Spirals (Last 24h)',
            value: `${stats.eventsLast24h}`,
            inline: true,
          },
          {
            name: 'Week of Chaos (Last 7d)',
            value: `${stats.eventsLast7d}`,
            inline: true,
          },
          {
            name: 'Last Time You F***ed Up',
            value: stats.lastEventAt
              ? new Date(stats.lastEventAt).toLocaleString()
              : 'Not enough data to condemn you yet.',
            inline: false,
          },
        ])
        .setFooter({ text: 'Data updates in real-time. We see everything.' })
        .setTimestamp();

      const recentEventsEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Your Recent F***-ups (Last 7 Days)')
        .setDescription(
          events && events.length > 0
            ? events
                .slice(0, 5)
                .map((event: any, idx: number) => {
                  const signals = typeof event.signals === 'string'
                    ? JSON.parse(event.signals)
                    : event.signals;
                  const signalStr = signals && Array.isArray(signals)
                    ? signals.map((s: any) => s.type).join(', ')
                    : 'unknown';
                  return `**${idx + 1}.** Score: **${event.tilt_score}/10** | ${signalStr}
_${new Date(
                    event.timestamp
                  ).toLocaleString()}_`;
                })
                .join('
')
            : 'Suspiciously quiet. No recent f***-ups detected. Keep it clean... for now.'
        );

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Full Degeneracy Dashboard')
          .setURL(`${DASHBOARD_URL}?userId=${userId}`)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setCustomId(`view_history_${userId}`)
          .setLabel('Relive Your F***-ups')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`tilt_settings_${userId}`)
          .setLabel('Fine-Tune Your Self-Destruction')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({
        embeds: [statsEmbed, recentEventsEmbed],
        components: [actionRow],
      });
    } catch (error) {
      console.error('[Dashboard Command] Error:', error);
      await interaction.editReply({
        content: 'Well, sh**. Our system just glitched trying to expose your degeneracy. Try again, degen.',
      });
    }
  }
};
