/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Event Handler
 * 
 * Manages Discord client events and Event Router subscriptions.
 */

import { Client, Events } from 'discord.js';
import { eventRouter } from '@tiltcheck/event-router';
import { extractUrls, ModNotifier, createModNotifier } from '@tiltcheck/discord-utils';
import { config } from '../config.js';
import type { CommandHandler } from './commands.js';
import type { TiltCheckEvent } from '@tiltcheck/types';

export class EventHandler {
  private modNotifier: ModNotifier;

  constructor(
    private client: Client,
    private commandHandler: CommandHandler
  ) {
    // Initialize mod notifier with config
    this.modNotifier = createModNotifier({
      modChannelId: config.modNotifications.modChannelId,
      modRoleId: config.modNotifications.modRoleId,
      enabled: config.modNotifications.enabled,
      rateLimitWindowMs: config.modNotifications.rateLimitWindowMs,
      maxNotificationsPerWindow: config.modNotifications.maxNotificationsPerWindow,
      dedupeWindowMs: config.modNotifications.dedupeWindowMs,
    });
  }

  /**
   * Register all Discord event handlers
   */
  registerDiscordEvents(): void {
    // Ready event
    this.client.once(Events.ClientReady, (client) => {
      console.log(`[Bot] Ready! Logged in as ${client.user.tag}`);
      console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);
      
      // Set the client on the mod notifier once ready
      this.modNotifier.setClient(client);
    });

    // Interaction create (slash commands)
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = this.commandHandler.getCommand(interaction.commandName);

      if (!command) {
        console.warn(
          `[Bot] Unknown command: ${interaction.commandName}`
        );
        return;
      }

      try {
        await command.execute(interaction);
        console.log(
          `[Bot] ${interaction.user.tag} used /${interaction.commandName}`
        );
      } catch (error) {
        console.error(
          `[Bot] Error executing ${interaction.commandName}:`,
          error
        );

        const errorMessage = {
          content: 'That play bricked. Try again in a sec.',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    });

    // Message create (auto-scan links if enabled)
    if (config.suslinkAutoScan) {
      this.client.on(Events.MessageCreate, async (message) => {
        // Ignore bot messages
        if (message.author.bot) return;

        // Extract URLs from message
        const urls = extractUrls(message.content);

        if (urls.length > 0) {
          console.log(
            `[Bot] Auto-scanning ${urls.length} URLs from ${message.author.tag}`
          );

          // The dad-bot focuses on card games (DA&D) and delegates link scanning
          // to the main discord-bot which has the @tiltcheck/suslink dependency.
          // To enable scanning here, add @tiltcheck/suslink to dependencies and
          // call suslink.scanUrl() for each URL.
        }
      });
    }

    console.log('[EventHandler] Discord events registered');
  }

  /**
   * Subscribe to Event Router events
   */
  subscribeToEvents(): void {
    // Subscribe to link flagged events (high-risk links)
    eventRouter.subscribe(
      'link.flagged',
      async (event: TiltCheckEvent) => {
        const { url, riskLevel, userId, channelId, reason } = event.data;
        
        console.log(
          `[EventHandler] High-risk link flagged: ${url} (${riskLevel})`
        );

        // Send mod notification for flagged links
        await this.modNotifier.notifyLinkFlagged({
          url,
          riskLevel,
          userId,
          channelId,
          reason,
        });
      },
      'dad'
    );

    // Subscribe to tilt detected events (warn users on cooldown)
    eventRouter.subscribe(
      'tilt.detected',
      async (event: TiltCheckEvent) => {
        const { userId, reason, severity, channelId } = event.data;
        
        console.log(
          `[EventHandler] Tilt detected: User ${userId} (${severity}) - ${reason}`
        );

        // Send mod notification for tilt detection
        await this.modNotifier.notifyTiltDetected({
          userId,
          reason,
          severity,
          channelId,
        });

        // Try to DM the user
        try {
          const user = await this.client.users.fetch(userId);
          await user.send(
            `⚠️ **Tilt Warning**\n\n` +
            `Reason: ${reason}\n` +
            `Severity: ${severity}\n\n` +
            `You got put on a 15-minute cooldown. Quick reset, then back in.`
          );
        } catch (error) {
          console.warn(`[EventHandler] Could not DM user ${userId}:`, error);
        }
      },
      'dad'
    );

    // Subscribe to cooldown violation events
    eventRouter.subscribe(
      'cooldown.violated',
      async (event: TiltCheckEvent) => {
        const { userId, action, newDuration, channelId } = event.data;
        
        console.log(
          `[EventHandler] Cooldown violation: User ${userId} attempted ${action}`
        );

        // Send mod notification for cooldown violation
        await this.modNotifier.notifyCooldownViolation({
          userId,
          action,
          newDuration,
          channelId,
        });

        // Try to DM the user
        try {
          const user = await this.client.users.fetch(userId);
          await user.send(
            `🚫 **Cooldown Violation**\n\n` +
            `You tried to ${action} while cooldown was active.\n` +
            `Cooldown is now ${newDuration} minutes.\n\n` +
            `Not a roast, just risk control.`
          );
        } catch (error) {
          console.warn(`[EventHandler] Could not DM user ${userId}:`, error);
        }
      },
      'dad'
    );

    console.log('[EventHandler] Event Router subscriptions registered');
  }
}
