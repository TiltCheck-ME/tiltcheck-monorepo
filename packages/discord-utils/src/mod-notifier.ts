/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Mod Notification System
 * 
 * Handles mod notifications for flagged events with:
 * - Rate-limiting to prevent spam
 * - Deduplication of similar alerts
 * - Role-based delivery (mods/admins)
 * - Configurable channels via env or config
 */

import { Client, EmbedBuilder, TextChannel, ColorResolvable } from 'discord.js';
import { Colors } from './embeds.js';
import { mentionRole } from './formatters.js';

/**
 * Event types that can trigger mod notifications
 */
export type ModNotificationEventType = 
  | 'link.flagged' 
  | 'tilt.detected' 
  | 'scam.reported'
  | 'cooldown.violated';

/**
 * Configuration for the mod notifier
 */
export interface ModNotifierConfig {
  /** Discord channel ID to send notifications to */
  modChannelId?: string;
  /** Discord role ID to mention in notifications */
  modRoleId?: string;
  /** Rate limit window in milliseconds (default: 60000 = 1 minute) */
  rateLimitWindowMs?: number;
  /** Maximum notifications per rate limit window (default: 10) */
  maxNotificationsPerWindow?: number;
  /** Whether to enable notifications (default: true if modChannelId is set) */
  enabled?: boolean;
  /** Deduplication window in milliseconds (default: 300000 = 5 minutes) */
  dedupeWindowMs?: number;
}

/**
 * Mod notification payload
 */
export interface ModNotification {
  /** Type of event triggering the notification */
  type: ModNotificationEventType;
  /** User ID of the user who triggered the event */
  userId?: string;
  /** Human-readable title */
  title: string;
  /** Detailed description of the event */
  description: string;
  /** Additional context fields */
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  /** Severity level (1-5, higher is more severe) */
  severity?: number;
  /** Optional link context */
  url?: string;
  /** Original channel where event occurred */
  channelId?: string;
  /** Original guild where event occurred */
  guildId?: string;
  /** Timestamp of the event */
  timestamp?: number;
}

interface RateLimitState {
  count: number;
  windowStart: number;
}

interface DedupeEntry {
  timestamp: number;
}

/**
 * ModNotifier class for sending rate-limited, deduplicated notifications to moderators
 */
export class ModNotifier {
  private client: Client | null = null;
  private config: Required<ModNotifierConfig>;
  private rateLimitState: RateLimitState = { count: 0, windowStart: Date.now() };
  private dedupeCache: Map<string, DedupeEntry> = new Map();

  constructor(config: ModNotifierConfig = {}) {
    this.config = {
      modChannelId: config.modChannelId ?? '',
      modRoleId: config.modRoleId ?? '',
      rateLimitWindowMs: config.rateLimitWindowMs ?? 60000, // 1 minute
      maxNotificationsPerWindow: config.maxNotificationsPerWindow ?? 10,
      enabled: config.enabled ?? !!config.modChannelId,
      dedupeWindowMs: config.dedupeWindowMs ?? 300000, // 5 minutes
    };
  }

  /**
   * Initialize the notifier with a Discord client
   */
  setClient(client: Client): void {
    this.client = client;
    console.log('[ModNotifier] Client initialized');
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<ModNotifierConfig>): void {
    if (config.modChannelId !== undefined) this.config.modChannelId = config.modChannelId;
    if (config.modRoleId !== undefined) this.config.modRoleId = config.modRoleId;
    if (config.rateLimitWindowMs !== undefined) this.config.rateLimitWindowMs = config.rateLimitWindowMs;
    if (config.maxNotificationsPerWindow !== undefined) this.config.maxNotificationsPerWindow = config.maxNotificationsPerWindow;
    if (config.enabled !== undefined) this.config.enabled = config.enabled;
    if (config.dedupeWindowMs !== undefined) this.config.dedupeWindowMs = config.dedupeWindowMs;
    console.log('[ModNotifier] Config updated');
  }

  /**
   * Check if notifications are enabled and configured
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.modChannelId && !!this.client;
  }

  /**
   * Generate a unique key for deduplication
   */
  private getDedupeKey(notification: ModNotification): string {
    return `${notification.type}:${notification.userId ?? 'unknown'}:${notification.url ?? notification.title}`;
  }

  /**
   * Check if notification is a duplicate within the dedupe window
   */
  private isDuplicate(notification: ModNotification): boolean {
    const key = this.getDedupeKey(notification);
    const entry = this.dedupeCache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.config.dedupeWindowMs) {
      // Entry has expired, remove it
      this.dedupeCache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Mark notification as sent for deduplication
   */
  private markAsSent(notification: ModNotification): void {
    const key = this.getDedupeKey(notification);
    this.dedupeCache.set(key, { timestamp: Date.now() });

    // Cleanup old entries periodically
    if (this.dedupeCache.size > 1000) {
      this.cleanupDedupeCache();
    }
  }

  /**
   * Remove expired entries from dedupe cache
   */
  private cleanupDedupeCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.dedupeCache) {
      if (now - entry.timestamp > this.config.dedupeWindowMs) {
        this.dedupeCache.delete(key);
      }
    }
  }

  /**
   * Check rate limiting
   */
  private isRateLimited(): boolean {
    const now = Date.now();
    
    // Reset window if expired
    if (now - this.rateLimitState.windowStart > this.config.rateLimitWindowMs) {
      this.rateLimitState = { count: 0, windowStart: now };
      return false;
    }

    return this.rateLimitState.count >= this.config.maxNotificationsPerWindow;
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(): void {
    this.rateLimitState.count++;
  }

  /**
   * Get color based on severity
   */
  private getSeverityColor(severity?: number): number {
    if (!severity) return Colors.INFO;
    if (severity >= 4) return Colors.CRITICAL;
    if (severity >= 3) return Colors.HIGH_RISK;
    if (severity >= 2) return Colors.WARNING;
    return Colors.INFO;
  }

  /**
   * Get emoji based on event type
   */
  private getEventEmoji(type: ModNotificationEventType): string {
    switch (type) {
      case 'link.flagged': return '🔗⚠️';
      case 'tilt.detected': return '😤🚨';
      case 'scam.reported': return '🦊💀';
      case 'cooldown.violated': return '🚫⏱️';
      default: return '⚠️';
    }
  }

  /**
   * Build the notification embed
   */
  private buildEmbed(notification: ModNotification): EmbedBuilder {
    const emoji = this.getEventEmoji(notification.type);
    const color = this.getSeverityColor(notification.severity);

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${notification.title}`)
      .setDescription(notification.description)
      .setColor(color as ColorResolvable)
      .setTimestamp(notification.timestamp ? new Date(notification.timestamp) : new Date())
      .setFooter({ text: `Event: ${notification.type}` });

    // Add user field if available
    if (notification.userId) {
      embed.addFields({ 
        name: 'User', 
        value: `<@${notification.userId}>`, 
        inline: true 
      });
    }

    // Add severity field if available
    if (notification.severity) {
      embed.addFields({ 
        name: 'Severity', 
        value: `${'🔴'.repeat(notification.severity)}${'⚪'.repeat(5 - notification.severity)} (${notification.severity}/5)`, 
        inline: true 
      });
    }

    // Add URL field if available
    if (notification.url) {
      embed.addFields({ 
        name: 'URL', 
        value: `\`${notification.url}\``, 
        inline: false 
      });
    }

    // Add channel context if available
    if (notification.channelId) {
      embed.addFields({ 
        name: 'Channel', 
        value: `<#${notification.channelId}>`, 
        inline: true 
      });
    }

    // Add any additional fields
    if (notification.fields) {
      embed.addFields(notification.fields);
    }

    return embed;
  }

  /**
   * Send a notification to the mod channel
   */
  async notify(notification: ModNotification): Promise<boolean> {
    // Check if enabled
    if (!this.isEnabled()) {
      console.log('[ModNotifier] Notifications disabled or not configured');
      return false;
    }

    // Check for duplicates
    if (this.isDuplicate(notification)) {
      console.log('[ModNotifier] Duplicate notification skipped:', notification.type);
      return false;
    }

    // Check rate limiting
    if (this.isRateLimited()) {
      console.warn('[ModNotifier] Rate limit exceeded, notification skipped');
      return false;
    }

    try {
      // Extra null check even though isEnabled() guards this
      if (!this.client) {
        console.error('[ModNotifier] Client is null');
        return false;
      }

      const channel = await this.client.channels.fetch(this.config.modChannelId);
      
      if (!channel || !channel.isTextBased()) {
        console.error('[ModNotifier] Mod channel not found or not a text channel');
        return false;
      }

      const textChannel = channel as TextChannel;
      const embed = this.buildEmbed(notification);

      // Build message content with role mention if configured
      let content = '';
      if (this.config.modRoleId) {
        content = mentionRole(this.config.modRoleId);
      }

      await textChannel.send({
        content: content || undefined,
        embeds: [embed],
      });

      // Mark as sent and increment rate limit
      this.markAsSent(notification);
      this.incrementRateLimit();

      console.log(`[ModNotifier] Notification sent: ${notification.type}`);
      return true;
    } catch (error) {
      console.error('[ModNotifier] Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Send a link flagged notification
   */
  async notifyLinkFlagged(data: {
    url: string;
    riskLevel: string;
    userId?: string;
    channelId?: string;
    guildId?: string;
    reason?: string;
  }): Promise<boolean> {
    const severity = this.riskLevelToSeverity(data.riskLevel);
    
    return this.notify({
      type: 'link.flagged',
      userId: data.userId,
      title: 'High-Risk Link Detected',
      description: `A potentially dangerous link was shared and requires moderator review.`,
      url: data.url,
      channelId: data.channelId,
      guildId: data.guildId,
      severity,
      fields: [
        { name: 'Risk Level', value: data.riskLevel.toUpperCase(), inline: true },
        ...(data.reason ? [{ name: 'Reason', value: data.reason, inline: false }] : []),
      ],
    });
  }

  /**
   * Send a tilt detected notification
   */
  async notifyTiltDetected(data: {
    userId: string;
    reason: string;
    severity: string | number;
    channelId?: string;
    guildId?: string;
  }): Promise<boolean> {
    const severityNum = typeof data.severity === 'string' 
      ? this.severityStringToNumber(data.severity)
      : data.severity;
    
    return this.notify({
      type: 'tilt.detected',
      userId: data.userId,
      title: 'Tilt Behavior Detected',
      description: `A user is showing signs of tilt behavior and may need intervention.`,
      channelId: data.channelId,
      guildId: data.guildId,
      severity: severityNum,
      fields: [
        { name: 'Reason', value: data.reason, inline: false },
      ],
    });
  }

  /**
   * Send a cooldown violation notification
   */
  async notifyCooldownViolation(data: {
    userId: string;
    action: string;
    newDuration: number;
    channelId?: string;
  }): Promise<boolean> {
    return this.notify({
      type: 'cooldown.violated',
      userId: data.userId,
      title: 'Cooldown Violation',
      description: `A user attempted an action while on cooldown.`,
      channelId: data.channelId,
      severity: 2,
      fields: [
        { name: 'Attempted Action', value: data.action, inline: true },
        { name: 'New Cooldown Duration', value: `${data.newDuration} minutes`, inline: true },
      ],
    });
  }

  /**
   * Convert risk level string to severity number
   */
  private riskLevelToSeverity(riskLevel: string): number {
    switch (riskLevel.toLowerCase()) {
      case 'critical': return 5;
      case 'high': return 4;
      case 'suspicious': return 3;
      case 'unknown': return 2;
      case 'safe': return 1;
      default: return 3;
    }
  }

  /**
   * Convert severity string to number
   */
  private severityStringToNumber(severity: string): number {
    switch (severity.toLowerCase()) {
      case 'critical': return 5;
      case 'high': return 4;
      case 'medium': return 3;
      case 'low': return 2;
      case 'minimal': return 1;
      default: return 3;
    }
  }

  /**
   * Get current stats for monitoring
   */
  getStats(): {
    enabled: boolean;
    rateLimitCount: number;
    dedupeCacheSize: number;
    modChannelConfigured: boolean;
    modRoleConfigured: boolean;
  } {
    return {
      enabled: this.isEnabled(),
      rateLimitCount: this.rateLimitState.count,
      dedupeCacheSize: this.dedupeCache.size,
      modChannelConfigured: !!this.config.modChannelId,
      modRoleConfigured: !!this.config.modRoleId,
    };
  }
}

/**
 * Create a ModNotifier instance from environment variables
 */
export function createModNotifier(config?: Partial<ModNotifierConfig>): ModNotifier {
  // Helper to safely parse integers from environment variables
  const parseIntOrDefault = (value: string | undefined, defaultValue: number): number => {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  return new ModNotifier({
    modChannelId: config?.modChannelId ?? process.env.MOD_CHANNEL_ID,
    modRoleId: config?.modRoleId ?? process.env.MOD_ROLE_ID,
    rateLimitWindowMs: config?.rateLimitWindowMs ?? parseIntOrDefault(process.env.MOD_RATE_LIMIT_WINDOW_MS, 60000),
    maxNotificationsPerWindow: config?.maxNotificationsPerWindow ?? parseIntOrDefault(process.env.MOD_MAX_NOTIFICATIONS_PER_WINDOW, 10),
    enabled: config?.enabled ?? (process.env.MOD_NOTIFICATIONS_ENABLED !== 'false'),
    dedupeWindowMs: config?.dedupeWindowMs ?? parseIntOrDefault(process.env.MOD_DEDUPE_WINDOW_MS, 300000),
  });
}
