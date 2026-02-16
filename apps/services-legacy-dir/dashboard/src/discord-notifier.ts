/**
 * Discord Webhook Notifier for Dashboard Alerts
 * 
 * Sends risk alerts and anomalies to Discord channels via webhooks.
 */

import type { RiskAlert } from './state.js';

export interface DiscordWebhookConfig {
  url?: string;
  enabled: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
  footer?: { text: string };
}

export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

const COLORS = {
  critical: 0xff3d3d,
  warning: 0xff7d3d,
  info: 0x4ec9f0,
  success: 0x3dff7d
};

export class DiscordNotifier {
  private config: DiscordWebhookConfig;
  private sentAlerts: Set<string> = new Set();

  constructor(config: DiscordWebhookConfig) {
    this.config = config;
  }

  private getAlertKey(alert: RiskAlert): string {
    return `${alert.kind}:${alert.entity}:${alert.firstSeenTs}`;
  }

  private formatAlertEmbed(alert: RiskAlert): DiscordEmbed {
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [
      { name: 'Entity', value: `\`${alert.entity}\``, inline: true },
      { name: 'Alert Type', value: alert.kind, inline: true }
    ];

    if (alert.totalDelta !== undefined) {
      fields.push({ name: 'Total Delta', value: alert.totalDelta.toString(), inline: true });
    }

    if (alert.severity !== undefined) {
      fields.push({ name: 'Severity', value: `${alert.severity}/5`, inline: true });
    }

    let color = COLORS.info;
    let title = '⚠️ Trust Alert';

    if (alert.kind === 'critical-severity' || alert.kind === 'domain-anomaly') {
      color = COLORS.critical;
      title = '🚨 Critical Alert';
    } else if (alert.kind === 'domain-delta' || alert.kind === 'casino-delta') {
      color = COLORS.warning;
      title = '⚠️ Delta Alert';
    }

    return {
      title,
      color,
      fields,
      timestamp: new Date(alert.firstSeenTs).toISOString(),
      footer: { text: 'TiltCheck Trust Dashboard' }
    };
  }

  async sendAlert(alert: RiskAlert): Promise<void> {
    if (!this.config.enabled || !this.config.url) {
      return;
    }

    const key = this.getAlertKey(alert);
    if (this.sentAlerts.has(key)) {
      return; // Already sent
    }

    const payload: DiscordWebhookPayload = {
      username: 'TiltCheck Monitor',
      embeds: [this.formatAlertEmbed(alert)]
    };

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`[DiscordNotifier] Webhook failed: ${response.status}`);
        return;
      }

      this.sentAlerts.add(key);
      // Prune old entries to prevent unbounded growth
      if (this.sentAlerts.size > 1000) {
        const entries = Array.from(this.sentAlerts);
        this.sentAlerts = new Set(entries.slice(-500));
      }
    } catch (err) {
      console.error('[DiscordNotifier] Failed to send webhook', err);
    }
  }

  async sendBatchAlerts(alerts: RiskAlert[]): Promise<void> {
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  async sendCustomEmbed(embed: DiscordEmbed): Promise<void> {
    if (!this.config.enabled || !this.config.url) {
      return;
    }

    const payload: DiscordWebhookPayload = {
      username: 'TiltCheck Monitor',
      embeds: [embed]
    };

    try {
      await fetch(this.config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('[DiscordNotifier] Failed to send custom embed', err);
    }
  }
}

export function createDiscordNotifier(webhookUrl?: string): DiscordNotifier {
  return new DiscordNotifier({
    url: webhookUrl || process.env.DISCORD_WEBHOOK_URL,
    enabled: !!(webhookUrl || process.env.DISCORD_WEBHOOK_URL)
  });
}
