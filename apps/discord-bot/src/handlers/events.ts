/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Event Handler
 *
 * Manages Discord client events and Event Router subscriptions.
 */

import { Client, Events, Interaction } from 'discord.js';
import { eventRouter } from '@tiltcheck/event-router';
import { extractUrls, ModNotifier, createModNotifier, ModNotificationEventType } from '@tiltcheck/discord-utils';
import { suslink } from '@tiltcheck/suslink';
import { trackMessage, isOnCooldown, recordViolation } from '@tiltcheck/tiltcheck-core';
import { config } from '../config.js';
import type { CommandHandler } from './commands.js';
import { checkAndOnboard, handleOnboardingInteraction, needsOnboarding } from './onboarding.js';
import type { 
  TiltCheckEvent, 
  TiltDetectedEventData, 
  CooldownViolatedEventData, 
  LinkFlaggedEventData, 
  ScamReportedEventData 
} from '@tiltcheck/types';
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

    this.client.on(Events.GuildMemberAdd, async (member) => {
      if (member.user.bot) return;
      if (needsOnboarding(member.user.id)) {
        console.log(`[EventHandler] Automaticaly onboarding new member: ${member.user.tag}`);
        checkAndOnboard(member.user).catch(err => {
          console.error('[Bot] Failed to send welcome DM to new member:', err);
        });
      }
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
          content: 'Cooldown is active. Quick breather, then run it back.',
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
              `Heads up: sketchy link detected (${result.riskLevel})\n${url}\nReason: ${result.reason}`
            ).catch(() => { });
          }
        } catch (error) {
          console.error('[EventHandler] Auto-scan failed:', error);
        }
      }
    });

    console.log('[EventHandler] Discord events registered');
  }

  private async handleButtonInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;
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

  private async handleModAction<T extends ModNotificationEventType>(type: T, data: T extends 'tilt.detected' ? TiltDetectedEventData : T extends 'cooldown.violated' ? CooldownViolatedEventData : T extends 'link.flagged' ? LinkFlaggedEventData : T extends 'scam.reported' ? ScamReportedEventData : { [key: string]: unknown }): Promise<void> {
    if (!this.modNotifier.isEnabled()) return;

    try {
      console.log(`[EventHandler] Routing mod action for ${type}`);

      switch (type) {
        case 'tilt.detected': {
          const d = data as TiltDetectedEventData;
          await this.modNotifier.notifyTiltDetected({
            userId: d.userId,
            reason: d.reason,
            severity: d.severity,
            channelId: d.channelId,
            guildId: d.guildId,
          });
          break;
        }
        case 'cooldown.violated': {
          const d = data as CooldownViolatedEventData;
          await this.modNotifier.notifyCooldownViolation({
            userId: d.userId,
            action: d.action || 'cooldown_violation',
            newDuration: d.newDuration || 5,
            channelId: d.channelId,
          });
          break;
        }
        case 'link.flagged': {
          const d = data as LinkFlaggedEventData;
          await this.modNotifier.notifyLinkFlagged({
            url: d.url,
            riskLevel: d.riskLevel,
            userId: d.userId || 'unknown',
            channelId: d.channelId,
            guildId: d.guildId,
            reason: d.reason,
          });
          break;
        }
        case 'scam.reported': {
          const d = data as ScamReportedEventData;
          await this.modNotifier.notify({
            type: 'scam.reported',
            userId: d.userId,
            title: 'Scam Reported',
            description: d.description || 'A potential scam has been reported.',
            severity: 4,
            channelId: d.channelId,
            guildId: d.guildId,
          });
          break;
        }
      }
    } catch (error) {
      console.error(`[EventHandler] Error in handleModAction for ${type}:`, error);
    }
  }

  subscribeToEvents(): void {
    eventRouter.subscribe(
      'user.discord_linked',
      async (event: TiltCheckEvent<'user.discord_linked'>) => {
        try {
          const { discordId } = event.data;
          const user = await this.client.users.fetch(discordId);
          if (user && needsOnboarding(user.id)) {
            console.log(`[EventHandler] Automatically onboarding linked account: ${user.tag}`);
            checkAndOnboard(user).catch(err => {
              console.error('[Bot] Failed to send welcome DM on link:', err);
            });
          }
        } catch (error) {
          console.error('[Bot] Error handling user.discord_linked:', error);
        }
      },
      'discord-bot'
    );

    eventRouter.subscribe(
      'tilt.detected',
      async (event: TiltCheckEvent<'tilt.detected'>) => {
        try {
          const { userId, reason, severity, tiltScore } = event.data;

          const user = await this.client.users.fetch(userId);
          if (!user) return;

          const scoreText = typeof tiltScore === 'number' ? tiltScore.toFixed(1) : 'n/a';
          const warningMessage = severity >= 4
            ? `Tilt warning: auto-cooldown started. Reason: ${reason}.`
            : `Tilt warning: detected (${reason}, score: ${scoreText}). Play it calm.`;

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
      async (event: TiltCheckEvent<'cooldown.violated'>) => {
        try {
          const { userId, violationCount, expiresAt } = event.data;

          const user = await this.client.users.fetch(userId);
          if (!user) return;

          const remainingMs = expiresAt ? expiresAt - Date.now() : 0;
          const remainingMin = Math.ceil(remainingMs / 60000);

          const violationMessage = violationCount >= 3
            ? `Cooldown violation. ${remainingMin} minutes left, and it got extended.`
            : `Cooldown still active. ${remainingMin} minutes left.`;

          await user.send(violationMessage).catch(() => { });

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
      async (event: TiltCheckEvent<'link.flagged'>) => {
        await this.handleModAction('link.flagged', event.data);
      },
      'discord-bot'
    );

    eventRouter.subscribe(
      'scam.reported',
      async (event: TiltCheckEvent<'scam.reported'>) => {
        await this.handleModAction('scam.reported', event.data);
      },
      'discord-bot'
    );

    // LockVault Subscriptions
    eventRouter.subscribe(
      'vault.expired',
      async (event: TiltCheckEvent<'vault.expired'>) => {
        const { userId, id, address, amountSOL } = event.data;
        const user = await this.client.users.fetch(userId).catch(() => null);
        if (user) {
          const amountText = amountSOL === 0 ? 'all funds' : `${amountSOL.toFixed(4)} SOL eq`;
          await user.send(`🔓 **Vault Unlocked!**\n\nYour vault \`${id}\` (${amountText}) is now ready for withdrawal.\nUse \`/vault unlock id:${id}\` to release it.\n\nAddress: \`${address}\``).catch(() => { });
        }
      },
      'discord-bot'
    );

    eventRouter.subscribe(
      'vault.reload_due',
      async (event: TiltCheckEvent<'vault.reload_due'>) => {
        const { userId, amountRaw, interval } = event.data;
        const user = await this.client.users.fetch(userId).catch(() => null);
        if (user) {
          await user.send(`📅 **Vault Reload Due (${interval})**\n\nTime for your scheduled lock of **${amountRaw}**.\nRun \`/vault lock amount:${amountRaw} duration:24h\` to stay on track.`).catch(() => { });
        }
      },
      'discord-bot'
    );

    eventRouter.subscribe(
      'vault.locked',
      async (event: TiltCheckEvent<'vault.locked'>) => {
        const { userId, id, vaultType, vaultAddress, amountSOL } = event.data;
        // Only DM if it's potentially an auto-vault (not explicitly created by command reply)
        // For simplicity, we can just DM every lock as a "secure receipt", or only for magic/auto.
        const user = await this.client.users.fetch(userId).catch(() => null);
        if (user) {
          const typeText = vaultType === 'magic' ? 'your Degen Identity' : 'a disposable vault';
          const amountText = amountSOL === 0 ? 'ALL' : amountSOL.toFixed(4);
          await user.send(`🔒 **Vault Locked**\n\nFunds secured in ${typeText}.\n- **ID:** \`${id}\`\n- **Target:** \`${amountText} SOL eq\`\n- **Address:** \`${vaultAddress}\`\n\nUse \`/vault status\` to view your locks.`).catch(() => { });
        }
      },
      'discord-bot'
    );

    eventRouter.subscribe(
      'safety.intervention.triggered',
      async (event: TiltCheckEvent<'safety.intervention.triggered'>) => {
        try {
          const { userId, type, action, displayText, data } = event.data as any;
          // The event data might be flat or nested depending on emitter. CircuitBreaker uses flat structure.
          const finalAction = action || type;
          const user = await this.client.users.fetch(userId).catch(() => null);

          if (finalAction === 'phone_friend_discord' || finalAction === 'PHONE_FRIEND') {
            const channelId = process.env.DEGEN_ACCOUNTABILITY_CHANNEL_ID || '1447913312015515711';
            const channel = await this.client.channels.fetch(channelId).catch(() => null);
            
            if (channel && channel.isTextBased() && 'send' in channel) {
              const userMention = userId !== 'guest' ? `<@${userId}>` : '**A Guest Degen**';
              const message = data?.message || displayText || 'Intervention Required';
              const alertMessage = `🚨 **BUDDY SYSTEM ALERT** 🚨\n\n${userMention} is fumbling the bag! \n\nGet in voice and pull them off the floor. \n\n*Reason: ${message}*`;
              await (channel as any).send({ content: alertMessage });
              console.log(`[Bot] Buddy snitch sent to channel ${channelId} for ${userId}`);
            }
          }

          if (finalAction === 'SELF_EXCLUDE_PROMPT' && user) {
            const selfExclusionUrl = process.env.SELF_EXCLUSION_URL || 'https://tiltcheck.app/safety/exclude';
            const buddyChannelId = process.env.DEGEN_ACCOUNTABILITY_CHANNEL_ID || '1447913312015515711';
            
            // 1. DM User
            await user.send(`🚨 **CRITICAL INTERVENTION** 🚨\n\n${displayText}\n\n**Self-Exclusion link:** ${selfExclusionUrl}\nTake the exit. We're here when you're objective again.`).catch(() => {
              console.log(`[Bot] Could not DM self-exclusion prompt to ${user.tag}`);
            });

            // 2. Alert Buddy Channel
            const channel = await this.client.channels.fetch(buddyChannelId).catch(() => null);
            if (channel && channel.isTextBased() && 'send' in channel) {
              const alertMessage = `☢️ **NUCLEAR INTERVENTION** ☢️\n\n<@${userId}> has reached their breaking point or requested exclusion. \n\nI've sent them the links, but they need a real human right now. Check on them.`;
              await (channel as any).send({ content: alertMessage });
            }
          }
        } catch (error) {
          console.error('[Bot] Error handling safety.intervention.triggered:', error);
        }
      },
      'discord-bot'
    );

    console.log('[EventHandler] Event Router subscriptions active');
  }
}

