/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Accountability Ping Handler
 *
 * Monitors tilt.detected events and triggers:
 * 1. Direct message to accountability buddy (with alert)
 * 2. Post to degen accountability voice chat channel
 * 3. Broadcast to Discord Activity (real-time meter)
 *
 * Brand guidelines: No emojis, direct tone, "Made for Degens. By Degens." footer
 */

import { Client, EmbedBuilder, TextChannel, DMChannel, ChannelType } from 'discord.js';
import { eventRouter } from '@tiltcheck/event-router';
import type { TiltCheckBaseEvent } from '@tiltcheck/event-types';
import type { TiltDetectedPayload } from '@tiltcheck/event-types';
import {
  getAccountabilityPartners,
  getBuddiesFor,
  getUser,
  query,
} from '@tiltcheck/db';

const BRAND_FOOTER = 'Made for Degens. By Degens.';
const TILT_THRESHOLD_ALERT = 60; // Alert buddies at 60+ tilt
const RATE_LIMIT_MINUTES = 5; // Max 1 alert per user per 5 minutes
const ACCOUNTABILITY_CHANNEL_NAME = 'degen-accountability'; // Voice channel name

// In-memory rate limiting (use Redis in production)
const recentAlerts = new Map<string, number>(); // userId -> timestamp

/**
 * Initialize accountability ping handler
 * Called during bot startup
 */
export function initializeAccountabilityPings(client: Client): void {
  eventRouter.subscribe(
    'safety.tilt.detected',
    async (event: TiltCheckBaseEvent<'safety.tilt.detected', TiltDetectedPayload>) => {
      try {
        const { userId, tiltScore } = event.payload;

        // Only alert at TILT_THRESHOLD_ALERT or higher
        if (tiltScore < TILT_THRESHOLD_ALERT) {
          return;
        }

        // Check rate limit
        const lastAlertTime = recentAlerts.get(userId);
        if (lastAlertTime && Date.now() - lastAlertTime < RATE_LIMIT_MINUTES * 60 * 1000) {
          console.log(
            `[AccountabilityPing] Rate limited: ${userId} (last alert ${Math.round((Date.now() - lastAlertTime) / 1000)}s ago)`
          );
          return;
        }

        // Update rate limit
        recentAlerts.set(userId, Date.now());

        // Get user info
        const user = await getUser(userId);
        if (!user) {
          console.error(`[AccountabilityPing] User not found: ${userId}`);
          return;
        }

        // Get accountability buddies (people watching this user)
        const buddies = await getAccountabilityPartners(userId);

        // Send buddy notifications
        if (buddies && buddies.length > 0) {
          for (const buddy of buddies) {
            await notifyBuddy(client, buddy.user_id, user.discord_id, event.payload);
          }
        } else {
          console.log(`[AccountabilityPing] No buddies for user ${userId}, skipping buddy notification`);
        }

        // Post to accountability channel
        await postToAccountabilityChannel(client, user.discord_id, user.discord_username || 'User', event.payload);

        console.log(
          `[AccountabilityPing] Alert sent for user ${userId} (tilt: ${tiltScore}, buddies: ${buddies?.length || 0})`
        );
      } catch (error) {
        console.error('[AccountabilityPing] Error handling tilt event:', error);
      }
    },
    'discord-bot'
  );

  console.log('[AccountabilityPing] Initialized - listening for safety.tilt.detected events at tilt >= 60');
}

/**
 * Send accountability alert to buddy via Discord DM
 */
async function notifyBuddy(
  client: Client,
  buddyDiscordId: string,
  userDiscordId: string,
  tiltData: TiltDetectedPayload
): Promise<void> {
  try {
    const buddy = await client.users.fetch(buddyDiscordId);
    if (!buddy) {
      console.warn(`[AccountabilityPing] Could not fetch buddy user: ${buddyDiscordId}`);
      return;
    }

    const user = await client.users.fetch(userDiscordId);
    const userName = user?.username || 'User';

    // Format tilt trigger
    const triggerText = getTriggerDescription(tiltData.trigger);

    // Create accountability alert embed
    const embed = new EmbedBuilder()
      .setColor('#FF4444') // Red for alert
      .setTitle('Accountability Alert')
      .setDescription(`${userName} is at ${tiltData.tiltScore} tilt.`)
      .addFields(
        {
          name: 'Trigger',
          value: triggerText,
          inline: true,
        },
        {
          name: 'Session P&L',
          value: formatMoney(tiltData.sessionMetrics.pnl),
          inline: true,
        },
        {
          name: 'Time in Session',
          value: formatTime(tiltData.sessionMetrics.timeInSession),
          inline: true,
        },
        {
          name: 'Current Streak',
          value: `${tiltData.sessionMetrics.currentStreak.wins}W-${tiltData.sessionMetrics.currentStreak.losses}L`,
          inline: true,
        },
        {
          name: 'RTP',
          value: `${tiltData.sessionMetrics.rtp.toFixed(2)}%`,
          inline: true,
        },
        {
          name: 'Recommended Actions',
          value: '1. Suggest a 15-minute pause\n2. Offer to chat in voice\n3. Remind of tilt spiral risk',
          inline: false,
        }
      )
      .setFooter({ text: BRAND_FOOTER })
      .setTimestamp();

    // Send DM to buddy
    const dm = await buddy.createDM();
    await dm.send({
      embeds: [embed],
      content: `<@${buddyDiscordId}>, ${userName} needs your accountability support right now.`,
    });

    console.log(
      `[AccountabilityPing] Buddy notified: ${buddyDiscordId} about ${userDiscordId} (tilt: ${tiltData.tiltScore})`
    );
  } catch (error) {
    console.error(
      `[AccountabilityPing] Failed to notify buddy ${buddyDiscordId}:`,
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Post tilt alert to accountability channel
 */
async function postToAccountabilityChannel(
  client: Client,
  userDiscordId: string,
  userName: string,
  tiltData: TiltDetectedPayload
): Promise<void> {
  try {
    // Find the first guild with accountability channel
    // In production, this should be configurable per guild
    for (const guild of client.guilds.cache.values()) {
      const accountabilityChannel = guild.channels.cache.find(
        (ch) =>
          ch.type === ChannelType.GuildText &&
          (ch.name.toLowerCase().includes('accountability') || ch.name.toLowerCase().includes('tilt'))
      );

      if (!accountabilityChannel || !(accountabilityChannel instanceof TextChannel)) {
        continue;
      }

      // Create alert embed
      const triggerText = getTriggerDescription(tiltData.trigger);
      const embed = new EmbedBuilder()
        .setColor('#FF6600') // Orange for warning
        .setTitle('Tilt Alert')
        .setDescription(`<@${userDiscordId}> just hit ${tiltData.tiltScore} tilt.`)
        .addFields(
          {
            name: 'Trigger',
            value: triggerText,
            inline: true,
          },
          {
            name: 'Session P&L',
            value: formatMoney(tiltData.sessionMetrics.pnl),
            inline: true,
          },
          {
            name: 'Time in Session',
            value: formatTime(tiltData.sessionMetrics.timeInSession),
            inline: true,
          },
          {
            name: 'Streak',
            value: `${tiltData.sessionMetrics.currentStreak.wins}W-${tiltData.sessionMetrics.currentStreak.losses}L`,
            inline: true,
          },
          {
            name: 'RTP',
            value: `${tiltData.sessionMetrics.rtp.toFixed(2)}%`,
            inline: true,
          },
          {
            name: 'Escape Routes',
            value: '1. PAUSE 15 minutes\n2. CALL BUDDY\n3. END SESSION',
            inline: false,
          },
          {
            name: 'Community Support',
            value:
              "Everyone in this channel believes in accountability. React with encouragement. (reactions do NOT appear in activity)",
            inline: false,
          }
        )
        .setFooter({ text: BRAND_FOOTER })
        .setTimestamp();

      // Post to channel
      const message = await accountabilityChannel.send({
        embeds: [embed],
      });

      // Add reaction emojis (just numbers/statuses, no visual clutter per brand guidelines)
      // We'll skip emojis per brand guidelines and rely on text-based reactions only

      console.log(
        `[AccountabilityPing] Posted to accountability channel in ${guild.name} (user: ${userDiscordId})`
      );
      return; // Posted to first guild with channel
    }

    console.warn(
      '[AccountabilityPing] No accountability channel found in any guild. Create a "degen-accountability" text channel.'
    );
  } catch (error) {
    console.error('[AccountabilityPing] Failed to post to accountability channel:', error);
  }
}

/**
 * Get human-readable trigger description
 */
function getTriggerDescription(trigger: string): string {
  const descriptions: Record<string, string> = {
    loss_streak: 'Lost 3+ consecutive hands',
    large_loss: 'Single bet loss exceeded threshold',
    time_played: 'Playing for too long without break',
    behavior: 'Detected escalating bet patterns',
  };
  return descriptions[trigger] || trigger;
}

/**
 * Format currency for display
 */
function formatMoney(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

/**
 * Format milliseconds to readable time string
 */
function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get buddies watching a user (for testing/debugging)
 */
export async function getAccountabilityBuddies(userId: string) {
  try {
    return await getAccountabilityPartners(userId);
  } catch (error) {
    console.error('[AccountabilityPing] Error fetching buddies:', error);
    return [];
  }
}

/**
 * Clear rate limit for a user (for testing)
 */
export function clearRateLimit(userId: string): void {
  recentAlerts.delete(userId);
  console.log(`[AccountabilityPing] Cleared rate limit for ${userId}`);
}
