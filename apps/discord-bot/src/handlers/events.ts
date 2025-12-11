/**
 * Event Handler
 * 
 * Manages Discord client events and Event Router subscriptions.
 */

import { Client, Events } from 'discord.js';
import { eventRouter } from '@tiltcheck/event-router';
import { extractUrls, ModNotifier, createModNotifier } from '@tiltcheck/discord-utils';
import { suslink } from '@tiltcheck/suslink';
import { trackMessage } from '@tiltcheck/tiltcheck-core';
import { config } from '../config.js';
import type { CommandHandler } from './commands.js';
import { checkAndOnboard, handleOnboardingInteraction, needsOnboarding } from './onboarding.js';
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
      // Handle button interactions
      if (interaction.isButton()) {
        // Check for onboarding buttons first
        if (interaction.customId.startsWith('onboard_')) {
          await handleOnboardingInteraction(interaction);
          return;
        }
        await this.handleButtonInteraction(interaction);
        return;
      }

      // Handle select menu interactions (for onboarding preferences)
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('onboard_')) {
        await handleOnboardingInteraction(interaction);
        return;
      }

      if (!interaction.isChatInputCommand()) return;

      // Check if user needs onboarding (first-time user)
      if (needsOnboarding(interaction.user.id)) {
        // Send welcome DM in background (don't block command execution)
        checkAndOnboard(interaction.user).catch(err => {
          console.error('[Bot] Failed to send welcome DM:', err);
        });
      }

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
          content: 'There was an error executing this command!',
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

        // Track message for tilt detection
        trackMessage(
          message.author.id,
          message.content,
          message.channelId
        );

        // Extract URLs from message
        const urls = extractUrls(message.content);

        if (urls.length > 0) {
          console.log(
            `[Bot] Auto-scanning ${urls.length} URLs from ${message.author.tag}`
          );

          // Scan each URL (Event Router will handle notifications)
          for (const url of urls) {
            try {
              await suslink.scanUrl(url, message.author.id);
            } catch (error) {
              console.error('[Bot] Auto-scan error:', error);
            }
          }
        }
      });
    }

    console.log('[EventHandler] Discord events registered');
  }

  /**
   * Handle button interactions
   */
  private async handleButtonInteraction(interaction: any): Promise<void> {
    const customId = interaction.customId;

    // Handle airdrop claim buttons
    if (customId.startsWith('airdrop_claim_')) {
      const messageId = interaction.message.id;
      
      // Import the airdrop handler from tip command
      // This is a workaround - ideally we'd have a shared button handler registry
      try {
        const tipCommand = this.commandHandler.getCommand('tip');
        if (tipCommand && 'handleAirdropClaim' in tipCommand) {
          await (tipCommand as any).handleAirdropClaim(interaction, messageId);
        } else {
          await interaction.reply({ content: '❌ Airdrop claim handler not found.', ephemeral: true });
        }
      } catch (error) {
        console.error('[EventHandler] Airdrop claim error:', error);
        await interaction.reply({ 
          content: `❌ Failed to process claim: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          ephemeral: true 
        });
      }
      return;
    }

    // Unknown button
    await interaction.reply({ content: '❌ Unknown button action.', ephemeral: true });
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
      'discord-bot'
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
            `You've been placed on a 15-minute cooldown. Take a break. 🧘`
          );
        } catch (error) {
          console.warn(`[EventHandler] Could not DM user ${userId}:`, error);
        }
      },
      'discord-bot'
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
            `You tried to ${action} while on cooldown.\n` +
            `Your cooldown has been extended to ${newDuration} minutes.\n\n` +
            `Seriously, take a break. We're trying to help.`
          );
        } catch (error) {
          console.warn(`[EventHandler] Could not DM user ${userId}:`, error);
        }
      },
      'discord-bot'
    );

    console.log('[EventHandler] Event Router subscriptions registered');
  }
}
