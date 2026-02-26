/**
 * Event Handler
 *
 * Manages Discord client events and Event Router subscriptions.
 */

import { Client, Events } from 'discord.js';
import { eventRouter } from '@tiltcheck/event-router';
import { extractUrls, ModNotifier, createModNotifier, ModNotificationEventType } from '@tiltcheck/discord-utils';
import { suslink } from '@tiltcheck/suslink';
import { trackMessage, isOnCooldown, recordViolation } from '@tiltcheck/tiltcheck-core';
import { config } from '../config.js';
import type { CommandHandler } from './commands.js';
import { checkAndOnboard, handleOnboardingInteraction, needsOnboarding } from './onboarding.js';
import type { TiltCheckEvent } from '@tiltcheck/types';
import { trackMessageEvent, trackCommandEvent } from '../services/elastic-telemetry.js';
import { markUserActive, type TiltAgentContext } from '../services/tilt-agent.js';
import { handleCommandError } from './error.js';
import { dispatchButtonInteraction } from './button-handlers.js';

function getTiltAgentContext(): TiltAgentContext | undefined {
  const stateCode = process.env.TILT_AGENT_DEFAULT_STATE_CODE?.trim().toUpperCase();
  const regulationTopic = process.env.TILT_AGENT_DEFAULT_REG_TOPIC?.trim().toLowerCase();

  if (!stateCode && !regulationTopic) return undefined;

  return {
    stateCode,
    regulationTopic,
  };
}

export class EventHandler {
  private modNotifier: ModNotifier;

  constructor(
    private client: Client,
    private commandHandler: CommandHandler
  ) {
    this.modNotifier = createModNotifier({
      modChannelId: config.modNotifications.modChannelId,
      modRoleId: config.modNotifications.modRoleId,
      enabled: config.modNotifications.enabled,
      rateLimitWindowMs: config.modNotifications.rateLimitWindowMs,
      maxNotificationsPerWindow: config.modNotifications.maxNotificationsPerWindow,
      dedupeWindowMs: config.modNotifications.dedupeWindowMs,
    });
  }

  registerDiscordEvents(): void {
    this.client.once(Events.ClientReady, (client) => {
      console.log(`[Bot] Ready! Logged in as ${client.user.tag}`);
      console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);
      this.modNotifier.setClient(client);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isButton()) {
        if (interaction.customId.startsWith('onboard_')) {
          await handleOnboardingInteraction(interaction);
          return;
        }
        await this.handleButtonInteraction(interaction);
        return;
      }

      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('onboard_')) {
        await handleOnboardingInteraction(interaction);
        return;
      }

      if (!interaction.isChatInputCommand()) return;

      if (isOnCooldown(interaction.user.id)) {
        recordViolation(interaction.user.id);
        await interaction.reply({
          content: 'Cooldown active. Please take a short break and try again later.',
          ephemeral: true
        });
        return;
      }

      if (needsOnboarding(interaction.user.id)) {
        checkAndOnboard(interaction.user).catch(err => {
          console.error('[Bot] Failed to send welcome DM:', err);
        });
      }

      const command = this.commandHandler.getCommand(interaction.commandName);
      if (!command) {
        console.warn(`[Bot] Unknown command: ${interaction.commandName}`);
        return;
      }

      trackCommandEvent({
        userId: interaction.user.id,
        guildId: interaction.guildId ?? undefined,
        commandName: interaction.commandName,
        isDM: !interaction.guildId,
      });
      markUserActive(interaction.user.id, getTiltAgentContext());

      try {
        await command.execute(interaction);
        console.log(`[Bot] ${interaction.user.tag} used /${interaction.commandName}`);
      } catch (error) {
        await handleCommandError(error, interaction);
      }
    });

    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;

      trackMessage(message.author.id, message.content, message.channelId);

      trackMessageEvent({
        userId: message.author.id,
        guildId: message.guildId ?? undefined,
        channelId: message.channelId,
        isDM: !message.guildId,
      });
      markUserActive(message.author.id, getTiltAgentContext());

      if (!config.suslinkAutoScan) return;

      const urls = extractUrls(message.content);
      if (urls.length === 0) return;

      const uniqueUrls = Array.from(new Set(urls)).slice(0, 3);
      for (const url of uniqueUrls) {
        try {
          const result = await suslink.scanUrl(url, message.author.id);
          if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
            await message.reply(
              `Suspicious link detected (${result.riskLevel}): ${url}\nReason: ${result.reason}`
            ).catch(() => {});
          }
        } catch (error) {
          console.error('[EventHandler] Auto-scan failed:', error);
        }
      }
    });

    console.log('[EventHandler] Discord events registered');
  }

  private async handleButtonInteraction(interaction: any): Promise<void> {
    const customId = interaction.customId;

    try {
      const handled = await dispatchButtonInteraction(customId, interaction);
      if (handled) return;
    } catch (error) {
      console.error('[EventHandler] Button handler error:', error);
      await interaction.reply({
        content: `Failed to process button action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true
      });
      return;
    }

    await interaction.reply({ content: 'Unknown button action.', ephemeral: true });
  }

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
            newDuration: data.newDuration || 5,
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

  subscribeToEvents(): void {
    eventRouter.subscribe(
      'tilt.detected',
      async (event: TiltCheckEvent) => {
        try {
          const { userId, reason, severity, tiltScore } = event.data;

          const user = await this.client.users.fetch(userId);
          if (!user) return;

          const scoreText = typeof tiltScore === 'number' ? tiltScore.toFixed(1) : 'n/a';
          const warningMessage = severity >= 4
            ? `Tilt warning: automatic cooldown started. Reason: ${reason}.`
            : `Tilt warning: detected (${reason}, score: ${scoreText}).`;

          await user.send(warningMessage).catch(() => {
            console.log(`[Bot] Could not send tilt warning DM to ${user.tag}`);
          });

          await this.handleModAction('tilt.detected', event.data);
        } catch (error) {
          console.error('[Bot] Error handling tilt.detected event:', error);
        }
      },
      'discord-bot'
    );

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
            ? `Cooldown violation. Remaining: ${remainingMin} minutes. Cooldown has been extended.`
            : `Cooldown active. Remaining: ${remainingMin} minutes.`;

          await user.send(violationMessage).catch(() => {});

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

    eventRouter.subscribe(
      'link.flagged',
      async (event: TiltCheckEvent) => {
        await this.handleModAction('link.flagged', event.data);
      },
      'discord-bot'
    );

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

