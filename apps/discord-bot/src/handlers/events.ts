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
import { extractUrls, ModNotifier, createModNotifier, ModNotificationEventType } from '@tiltcheck/discord-utils';
// import { suslink } from '@tiltcheck/suslink';
import { trackMessage, isOnCooldown, recordViolation } from '@tiltcheck/tiltcheck-core';
import { config } from '../config.js';
import type { CommandHandler } from './commands.js';
import { checkAndOnboard, handleOnboardingInteraction, needsOnboarding } from './onboarding.js';
import type { TiltCheckEvent } from '@tiltcheck/types';
import { trackMessageEvent, trackCommandEvent } from '../services/elastic-telemetry.js';
import { markUserActive } from '../services/tilt-agent.js';

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

      // Check for cooldown
      if (isOnCooldown(interaction.user.id)) {
        recordViolation(interaction.user.id);
        await interaction.reply({
          content: '🛑 **Cooldown Active**\nYou are currently on cooldown to prevent tilt-driven decisions. Please take a break and try again later!',
          ephemeral: true
        });
        return;
      }

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

      // Track command usage in Elastic
      trackCommandEvent({
        userId: interaction.user.id,
        guildId: interaction.guildId ?? undefined,
        commandName: interaction.commandName,
        isDM: !interaction.guildId,
      });
      markUserActive(interaction.user.id);

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
    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;

      // Track message for tilt detection (existing core)
      trackMessage(message.author.id, message.content, message.channelId);

      // Stream to Elastic telemetry
      trackMessageEvent({
        userId: message.author.id,
        guildId: message.guildId ?? undefined,
        channelId: message.channelId,
        isDM: !message.guildId,
      });
      markUserActive(message.author.id);

      /*
      if (config.suslinkAutoScan) {
        // ... (existing code)
      }
      */
    });

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
   * Route event data to the mod notification system
   */
  private async handleModAction(type: ModNotificationEventType, data: any): Promise<void> {
    if (!this.modNotifier.isEnabled()) return;

    try {
      console.log(`[EventHandler] Routing mod action for ${type}`);

      switch (type) {
        case 'tilt.detected':
          await this.modNotifier.notifyTiltDetected({
            userId: data.userId,
            reason: data.reason,
            severity: data.severity,
            channelId: data.channelId,
            guildId: data.guildId,
          });
          break;
        case 'cooldown.violated':
          await this.modNotifier.notifyCooldownViolation({
            userId: data.userId,
            action: data.action || 'cooldown_violation',
            newDuration: data.newDuration || 5, // Default extension if not specified
            channelId: data.channelId,
          });
          break;
        case 'link.flagged':
          await this.modNotifier.notifyLinkFlagged({
            url: data.url,
            riskLevel: data.riskLevel,
            userId: data.userId,
            channelId: data.channelId,
            guildId: data.guildId,
            reason: data.reason,
          });
          break;
        case 'scam.reported':
          await this.modNotifier.notify({
            type: 'scam.reported',
            userId: data.userId,
            title: 'Scam Reported',
            description: data.description || 'A potential scam has been reported.',
            severity: 4,
            channelId: data.channelId,
            guildId: data.guildId,
          });
          break;
      }
    } catch (error) {
      console.error(`[EventHandler] Error in handleModAction for ${type}:`, error);
    }
  }

  /**
   * Subscribe to Event Router events
   */
  subscribeToEvents(): void {
    // Subscribe to tilt detected events (warn users on cooldown)
    eventRouter.subscribe(
      'tilt.detected',
      async (event: TiltCheckEvent) => {
        try {
          const { userId, reason, severity, tiltScore } = event.data;

          // Get the user from client
          const user = await this.client.users.fetch(userId);
          if (!user) return;

          // Send a warning DM
          const warningMessage = severity >= 4
            ? `⚠️ **Tilt Warning: Automatic Cooldown Started**\nOur system detected significant tilt signals (${reason}). To protect your funds, we've initiated a short cooldown. Take a breather! 🧘`
            : `⚠️ **Tilt Warning**\nWe've detected some tilt signals (${reason}, score: ${tiltScore.toFixed(1)}). Remember to stay disciplined and take a break if you're feeling frustrated!`;

          await user.send(warningMessage).catch(() => {
            console.log(`[Bot] Could not send tilt warning DM to ${user.tag} (DMs might be closed)`);
          });

          // Also notify moderators
          await this.handleModAction('tilt.detected', event.data);
        } catch (error) {
          console.error('[Bot] Error handling tilt.detected event:', error);
        }
      },
      'discord-bot'
    );

    // Subscribe to cooldown violation events
    eventRouter.subscribe(
      'cooldown.violated',
      async (event: TiltCheckEvent) => {
        try {
          const { userId, violationCount, expiresAt } = event.data;

          const user = await this.client.users.fetch(userId);
          if (!user) return;

          const remainingMs = expiresAt ? expiresAt - Date.now() : 0;
          const remainingMin = Math.ceil(remainingMs / 60000);

          const violationMessage = violationCount >= 3
            ? `🛑 **Cooldown Violation**\nYou are still on cooldown for another ${remainingMin} minutes. Because of repeated violations, your cooldown has been extended. Please take this time to cool off.`
            : `🛑 **Cooldown Active**\nYou are currently on cooldown for another ${remainingMin} minutes. Take a break from betting/chatting to clear your head!`;

          await user.send(violationMessage).catch(() => {
            // Silently fail if DM fails - user is already spamming
          });

          // Also notify moderators
          await this.handleModAction('cooldown.violated', {
            ...event.data,
            action: 'message_sent_on_cooldown',
            newDuration: remainingMin > 0 ? remainingMin : 5
          });
        } catch (error) {
          console.error('[Bot] Error handling cooldown.violated event:', error);
        }
      },
      'discord-bot'
    );

    // Subscribe to flagged links
    eventRouter.subscribe(
      'link.flagged',
      async (event: TiltCheckEvent) => {
        await this.handleModAction('link.flagged', event.data);
      },
      'discord-bot'
    );

    // Subscribe to scam reports
    eventRouter.subscribe(
      'scam.reported',
      async (event: TiltCheckEvent) => {
        await this.handleModAction('scam.reported', event.data);
      },
      'discord-bot'
    );

    console.log('[EventHandler] Event Router subscriptions active');
  }
}
