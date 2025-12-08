/**
 * Dashboard Command
 * 
 * Slash command: /dashboard
 * Shows user's tilt stats and recent events in Discord
 * Provides link to full web dashboard
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { getUserTiltStats, getUserTiltHistory } from '../handlers/tilt-events-handler.js';

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://tiltcheck.app/dashboard';

export const data = new SlashCommandBuilder()
  .setName('dashboard')
  .setDescription('View your tilt stats and recent events');

export async function execute(interaction: any) {
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
        content: '❌ Could not fetch your tilt data. Try again in a moment.',
      });
    }

    // Determine tilt level emoji and color
    const tiltLevel = stats.averageTiltScore || 0;
    let emoji = '😊';
    let color = 0x00ff00; // Green
    if (tiltLevel > 5) {
      emoji = '😐';
      color = 0xffff00; // Yellow
    }
    if (tiltLevel > 7) {
      emoji = '😠';
      color = 0xff9900; // Orange
    }
    if (tiltLevel > 9) {
      emoji = '😡';
      color = 0xff0000; // Red
    }

    // Create main stats embed
    const statsEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} ${username}'s Tilt Dashboard`)
      .setDescription('Your recent tilt activity and statistics')
      .addFields([
        {
          name: '📊 Tilt Score (7-day avg)',
          value: `${tiltLevel.toFixed(1)}/10`,
          inline: true,
        },
        {
          name: '📈 Max Score (7-day)',
          value: `${stats.maxTiltScore}/10`,
          inline: true,
        },
        {
          name: '🎯 Total Events',
          value: `${stats.totalEvents}`,
          inline: true,
        },
        {
          name: '📅 Last 24h Events',
          value: `${stats.eventsLast24h}`,
          inline: true,
        },
        {
          name: '📊 Last 7d Events',
          value: `${stats.eventsLast7d}`,
          inline: true,
        },
        {
          name: '🕐 Last Event',
          value: stats.lastEventAt
            ? new Date(stats.lastEventAt).toLocaleString()
            : 'No events yet',
          inline: false,
        },
      ])
      .setFooter({ text: 'Data updates in real-time' })
      .setTimestamp();

    // Create recent events embed if events exist
    const recentEventsEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Recent Tilt Events (Last 7 Days)')
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
          : 'No recent events detected'
      );

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
        .setLabel('⚙️ Settings')
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
      content: '❌ An error occurred while fetching your dashboard. Please try again.',
    });
  }
}
