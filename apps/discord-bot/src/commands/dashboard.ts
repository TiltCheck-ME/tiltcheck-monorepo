// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getUserTiltStats, getUserTiltHistory } from '../handlers/tilt-events-handler.js';
import type { Command } from '../types.js';

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://dashboard.tiltcheck.me';

export const dashboard: Command = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Pull your 7-day tilt trail and live session read.'),

  async execute(interaction: any) {
    // Acknowledge the interaction immediately
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
      // Fetch user stats and history in parallel
      const [stats, events] = await Promise.all([
        getUserTiltStats(userId),
        getUserTiltHistory(userId, { limit: 5, days: 7 }),
      ]);

      if (!stats) {
        return await interaction.editReply({
          content: 'Dashboard data came back empty. Run it again.',
        });
      }

      // Determine tilt level and color
      const tiltLevel = stats.averageTiltScore || 0;
      let riskLabel = 'CLEAR';
      let color = 0x22d3a6;
      if (tiltLevel > 5) { riskLabel = 'ELEVATED'; color = 0xf59e0b; }
      if (tiltLevel > 7) { riskLabel = 'HIGH';     color = 0xf59e0b; }
      if (tiltLevel > 9) { riskLabel = 'CRITICAL'; color = 0xef4444; }

      // Create main stats embed
      const statsEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${username.toUpperCase()} — ${riskLabel}`)
        .setDescription('Live session read. No fluff.')
        .addFields([
          {
            name: 'Tilt Score (7-day avg)',
            value: `${tiltLevel.toFixed(1)}/10`,
            inline: true,
          },
          {
            name: 'Max Score (7-day)',
            value: `${stats.maxTiltScore}/10`,
            inline: true,
          },
          {
            name: 'Total Events',
            value: `${stats.totalEvents}`,
            inline: true,
          },
          {
            name: 'Last 24h Events',
            value: `${stats.eventsLast24h}`,
            inline: true,
          },
          {
            name: 'Last 7d Events',
            value: `${stats.eventsLast7d}`,
            inline: true,
          },
          {
            name: 'Last Event',
            value: stats.lastEventAt
              ? new Date(stats.lastEventAt).toLocaleString()
              : 'No events yet',
            inline: false,
          },
        ])
        .setFooter({ text: 'Made for Degens. By Degens.' })
        .setTimestamp();

      // Create recent events embed if events exist
      const recentEventsEmbed = new EmbedBuilder()
        .setColor(0x22d3a6)
        .setTitle('RECENT TILT EVENTS — 7 DAYS')
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
                  return `**${idx + 1}.** Score: **${event.tilt_score}/10** | ${signalStr}\n_${new Date(
                    event.timestamp
                  ).toLocaleString()}_`;
                })
                .join('\n')
            : 'No tilt events in the last 7 days. Either you were chill or invisible.'
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });

      // Create action buttons
      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Full Dashboard')
          .setURL(`${DASHBOARD_URL}?userId=${userId}`)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setCustomId(`view_history_${userId}`)
          .setLabel('View Full History')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`tilt_settings_${userId}`)
          .setLabel('Settings')
          .setStyle(ButtonStyle.Secondary)
      );

      // Send embeds with buttons
      await interaction.editReply({
        embeds: [statsEmbed, recentEventsEmbed],
        components: [actionRow],
      });
    } catch (error) {
      console.error('[Dashboard Command] Error:', error);
      await interaction.editReply({
        content: 'Tilt data pull failed. Run it again.',
      });
    }
  }
};
