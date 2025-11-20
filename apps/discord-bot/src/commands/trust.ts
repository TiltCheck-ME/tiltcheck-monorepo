/**
 * Trust Dashboard Command
 * 
 * Displays live trust metrics from the dashboard service.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types';

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5055';

interface HealthResponse {
  lastSnapshotTs: number | null;
  snapshotAgeMs: number | null;
  throttledCount: number;
  eventBufferSize: number;
  windowStart: number | null;
  retentionDays: number;
}

interface AlertResponse {
  alerts: Array<{
    kind: string;
    entity: string;
    totalDelta?: number;
    severity?: number;
    firstSeenTs: number;
  }>;
}

export const trustDashboard: Command = {
  data: new SlashCommandBuilder()
    .setName('trust')
    .setDescription('View TiltCheck trust metrics')
    .addSubcommand(sub =>
      sub.setName('dashboard').setDescription('Show dashboard summary')
    )
    .addSubcommand(sub =>
      sub.setName('alerts').setDescription('Show active risk alerts')
    ) as any as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'dashboard') {
        await showDashboard(interaction);
      } else if (subcommand === 'alerts') {
        await showAlerts(interaction);
      }
    } catch (err) {
      console.error('[TrustCommand] Error:', err);
      await interaction.editReply({
        content: '❌ Failed to fetch dashboard data. Is the dashboard service running?'
      });
    }
  },
};

async function showDashboard(interaction: ChatInputCommandInteraction) {
  const healthRes = await fetch(`${DASHBOARD_URL}/api/health`);
  const health: HealthResponse = await healthRes.json() as HealthResponse;

  const configRes = await fetch(`${DASHBOARD_URL}/api/config`);
  const config = await configRes.json() as any;

  const severityRes = await fetch(`${DASHBOARD_URL}/api/severity`);
  const severity = await severityRes.json() as any;

  const age = health.snapshotAgeMs ? Math.round(health.snapshotAgeMs / 1000) : '?';
  const severityBars = Object.entries(severity.buckets as Record<string, number>)
    .map(([sev, count]) => `**Sev ${sev}:** ${count}`)
    .join('\n') || 'No events';

  const embed = new EmbedBuilder()
    .setTitle('📊 TiltCheck Trust Dashboard')
    .setColor(0x4ec9f0)
    .addFields(
      { name: '📈 Event Buffer', value: `${health.eventBufferSize} events`, inline: true },
      { name: '⏱️ Snapshot Age', value: `${age}s`, inline: true },
      { name: '🔒 Throttled', value: `${health.throttledCount}`, inline: true },
      { name: '🗓️ Retention', value: `${health.retentionDays} days`, inline: true },
      { name: '🔄 Poll Interval', value: `${Math.round(config.pollIntervalMs / 1000)}s`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '🎯 Severity Distribution', value: severityBars, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: 'TiltCheck Trust System' });

  await interaction.editReply({ embeds: [embed] });
}

async function showAlerts(interaction: ChatInputCommandInteraction) {
  const alertsRes = await fetch(`${DASHBOARD_URL}/api/alerts`);
  const data: AlertResponse = await alertsRes.json() as AlertResponse;

  if (data.alerts.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('✅ No Active Alerts')
      .setDescription('All trust metrics are within normal thresholds.')
      .setColor(0x3dff7d)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const alertFields = data.alerts.slice(0, 10).map(alert => {
    const kindEmoji = alert.kind.includes('critical') || alert.kind.includes('anomaly') ? '🚨' : '⚠️';
    const deltaStr = alert.totalDelta ? ` Δ${alert.totalDelta}` : '';
    const sevStr = alert.severity ? ` Sev ${alert.severity}` : '';
    return {
      name: `${kindEmoji} ${alert.kind}`,
      value: `\`${alert.entity}\`${deltaStr}${sevStr}`,
      inline: false
    };
  });

  const embed = new EmbedBuilder()
    .setTitle('⚠️ Active Risk Alerts')
    .setDescription(`Showing ${Math.min(data.alerts.length, 10)} of ${data.alerts.length} alerts`)
    .setColor(0xff7d3d)
    .addFields(alertFields)
    .setTimestamp()
    .setFooter({ text: 'TiltCheck Trust System' });

  await interaction.editReply({ embeds: [embed] });
}
