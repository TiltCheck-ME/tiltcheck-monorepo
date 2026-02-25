/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Alert Service
 * 
 * Handles posting alerts and notifications to configured Discord channels:
 * - Trust alerts (#trust-alerts)
 * - Support tickets (#support)
 */

import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { config } from '../config.js';

export interface TrustAlert {
  title: string;
  description: string;
  userId?: string;
  severity: 'info' | 'warning' | 'critical';
  data?: Record<string, any>;
}

export interface SupportTicket {
  userId: string;
  username: string;
  topic: string;
  message: string;
  status?: 'open' | 'pending' | 'resolved';
}

export class AlertService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Post a trust alert to the trust-alerts channel
   */
  async postTrustAlert(alert: TrustAlert): Promise<void> {
    if (!config.alertChannels.trustAlertsChannelId) {
      console.warn('[AlertService] Trust alerts channel not configured');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(
        config.alertChannels.trustAlertsChannelId
      );

      if (!channel || !channel.isTextBased()) {
        console.error('[AlertService] Trust alerts channel is not a text channel');
        return;
      }

      const severityColor = {
        info: 0x0099FF,
        warning: 0xFFAA00,
        critical: 0xFF0000,
      }[alert.severity];

      const embed = new EmbedBuilder()
        .setColor(severityColor)
        .setTitle(`[${alert.severity.toUpperCase()}] ${alert.title}`)
        .setDescription(alert.description)
        .setTimestamp();

      if (alert.userId) {
        embed.addFields({
          name: 'User',
          value: `<@${alert.userId}>`,
          inline: true,
        });
      }

      if (alert.data) {
        const dataStr = JSON.stringify(alert.data, null, 2);
        if (dataStr.length < 1024) {
          embed.addFields({
            name: 'Details',
            value: `\`\`\`json\n${dataStr}\n\`\`\``,
            inline: false,
          });
        }
      }

      await (channel as TextChannel).send({ embeds: [embed] });
      console.log(`[AlertService] Posted trust alert: ${alert.title}`);
    } catch (error) {
      console.error('[AlertService] Failed to post trust alert:', error);
    }
  }

  /**
   * Post a support ticket to the support channel
   */
  async postSupportTicket(ticket: SupportTicket): Promise<void> {
    if (!config.alertChannels.supportChannelId) {
      console.warn('[AlertService] Support channel not configured');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(
        config.alertChannels.supportChannelId
      );

      if (!channel || !channel.isTextBased()) {
        console.error('[AlertService] Support channel is not a text channel');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2) // Discord blurple
        .setTitle('📬 New Support Ticket')
        .addFields(
          {
            name: 'User',
            value: `<@${ticket.userId}> (${ticket.username})`,
            inline: true,
          },
          {
            name: 'Topic',
            value: ticket.topic,
            inline: true,
          },
          {
            name: 'Status',
            value: ticket.status || 'open',
            inline: true,
          },
          {
            name: 'Message',
            value: ticket.message.substring(0, 1024),
            inline: false,
          }
        )
        .setFooter({ text: `User ID: ${ticket.userId}` })
        .setTimestamp();

      await (channel as TextChannel).send({ embeds: [embed] });
      console.log(
        `[AlertService] Posted support ticket from ${ticket.username}`
      );
    } catch (error) {
      console.error('[AlertService] Failed to post support ticket:', error);
    }
  }

  /**
   * Post a generic message to the support channel
   */
  async postToSupportChannel(
    content: string | { embeds?: EmbedBuilder[] }
  ): Promise<void> {
    if (!config.alertChannels.supportChannelId) {
      console.warn('[AlertService] Support channel not configured');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(
        config.alertChannels.supportChannelId
      );

      if (!channel || !channel.isTextBased()) {
        console.error('[AlertService] Support channel is not a text channel');
        return;
      }

      await (channel as TextChannel).send(content);
    } catch (error) {
      console.error('[AlertService] Failed to post to support channel:', error);
    }
  }

  /**
   * Post a generic message to the trust alerts channel
   */
  async postToTrustAlertsChannel(
    content: string | { embeds?: EmbedBuilder[] }
  ): Promise<void> {
    if (!config.alertChannels.trustAlertsChannelId) {
      console.warn('[AlertService] Trust alerts channel not configured');
      return;
    }

    try {
      const channel = await this.client.channels.fetch(
        config.alertChannels.trustAlertsChannelId
      );

      if (!channel || !channel.isTextBased()) {
        console.error('[AlertService] Trust alerts channel is not a text channel');
        return;
      }

      await (channel as TextChannel).send(content);
    } catch (error) {
      console.error('[AlertService] Failed to post to trust alerts channel:', error);
    }
  }
}

// Export singleton instance
let alertService: AlertService;

export function initializeAlertService(client: Client): AlertService {
  alertService = new AlertService(client);
  console.log('[AlertService] Initialized');
  return alertService;
}

export function getAlertService(): AlertService {
  if (!alertService) {
    throw new Error('AlertService not initialized. Call initializeAlertService first.');
  }
  return alertService;
}
