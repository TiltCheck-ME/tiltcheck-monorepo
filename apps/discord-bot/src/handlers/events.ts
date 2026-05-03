// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19
/**
 * Event Handler
 *
 * Manages Discord client events and Event Router subscriptions.
 */

import { Client, Events, Interaction, ChatInputCommandInteraction, ButtonInteraction, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
// Trust scorer loaded via absolute path to avoid tsx resolution issues
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _require = createRequire(import.meta.url);
const { generateTrustScore } = _require(path.resolve(__dirname, '../../../../tools/discord-trust-scorer/engine.js'));

import { eventRouter } from '@tiltcheck/event-router';
import { extractUrls, ModNotifier, createModNotifier, ModNotificationEventType } from '@tiltcheck/discord-utils';
import { suslink } from '@tiltcheck/suslink';
import { trackMessage, isOnCooldown, recordViolation } from '@tiltcheck/tiltcheck-core';
import { config } from '../config.js';
import type { CommandHandler } from './commands.js';
import { checkAndOnboard, handleOnboardingInteraction, needsOnboarding, isUserOnboarded, getWebsiteOnboardingUrl } from './onboarding.js';
import { isUserInActiveSession } from '../services/tilt-agent.js';
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
import { detectIntent, formatNlpResponse, getFallbackReply } from '../services/nlp-intent.js';
import { handleSafetyIntervention } from '../services/intervention-service.js';
import { hasMessageContentConsent } from '../services/data-consent.js';

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
  private readonly gatedCommands = new Set(['status', 'buddy', 'goal', 'intervene', 'cooldown', 'tilt']);

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

      const result = generateTrustScore(member.user as any);

      if (result.riskLevel === 'HIGH') {
        console.warn(`[SECURITY] High-risk user quarantined: ${member.user.tag} (Score: ${result.trustScore})`);
        // Assign quarantine role
        await member.roles.add(process.env.QUARANTINE_ROLE_ID || '').catch(() => {});
        await member.send(`[AUDIT LAYER]: Your account has been flagged as HIGH RISK. Access restricted.\n\nReasons:\n- ${result.reasons.join('\n- ')}`).catch(() => {});
        return;
      }

      if (await needsOnboarding(member.user.id)) {
        console.log(`[EventHandler] Automatically onboarding new member: ${member.user.tag}`);
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
        const chatInteraction = interaction as ChatInputCommandInteraction;
        await chatInteraction.reply({
          content: 'Cooldown is active. Quick breather, then run it back.',
          ephemeral: true
        });
        return;
      }

      const onboarded = await isUserOnboarded(interaction.user.id);

      if (!onboarded && await needsOnboarding(interaction.user.id)) {
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

      if (!onboarded && this.gatedCommands.has(interaction.commandName)) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel('Finish Setup')
            .setStyle(ButtonStyle.Link)
            .setURL(getWebsiteOnboardingUrl())
        );

        await interaction.reply({
          content: 'Finish website setup first. That links your Discord session, accepts terms, and unlocks the account-bound commands.',
          components: [row],
          ephemeral: true,
        });
        return;
      }

      try {
        await command.execute(interaction);
        console.log(`[Bot] ${interaction.user.tag} used /${interaction.commandName}`);
      } catch (error) {
        await handleCommandError(error, interaction);
      }
    });

    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;

      if (await hasMessageContentConsent(message.author.id)) {
        trackMessage(message.author.id, message.content, message.channelId);
      }

      trackMessageEvent({
        userId: message.author.id,
        guildId: message.guildId ?? undefined,
        channelId: message.channelId,
        isDM: !message.guildId,
      });
      markUserActive(message.author.id, getTiltAgentContext());

      const isMentioned = this.client.user
        ? message.mentions.has(this.client.user.id)
        : false;
      const isDM = !message.guildId;

      // NLP intent detection for DMs and @mentions
      if (isDM || isMentioned) {
        const intent = detectIntent(message.content);
        if (intent) {
          trackCommandEvent({
            userId: message.author.id,
            guildId: message.guildId ?? undefined,
            commandName: `nlp:${intent.command}`,
            isDM,
          });
          await message.reply(formatNlpResponse(intent)).catch(() => {});
        } else {
          await message.reply(getFallbackReply()).catch(() => {});
        }
      }

      if (!config.suslinkAutoScan) return;

      const urls = extractUrls(message.content);
      if (urls.length === 0) return;

      const uniqueUrls = Array.from(new Set(urls)).slice(0, 3);
      for (const url of uniqueUrls) {
        try {
          const result = await suslink.scanUrl(url, message.author.id);
          if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
            await message.reply(
              `[ALERT] Sketchy link detected (${result.riskLevel})\n${url}\nReason: ${result.reason}`
            ).catch(() => { });
          }
        } catch (error) {
          console.error('[EventHandler] Auto-scan failed:', error);
        }
      }
    });

    console.log('[EventHandler] Discord events registered');
  }

  registerPaymentEvents(): void {
    this.client.on(Events.EntitlementCreate, async (entitlement) => {
      const skuId = entitlement.skuId;
      const userId = entitlement.userId;
      console.log(`[Payments] Entitlement created: SKU ${skuId} for user ${userId}`);

      const skuMap: Record<string, string> = {
        [process.env.DISCORD_SKU_PRO_ID || '']:        'Degen Pass',
        [process.env.DISCORD_SKU_ELITE_ID || '']:      'Platinum Pass',
        [process.env.DISCORD_SKU_LIFETIME_ID || '']:   'Lifetime Pass',
        [process.env.DISCORD_SKU_OG_LIFETIME_ID || '']: 'OG Lifetime Pass (Beta)',
        [process.env.DISCORD_SKU_SUPPORT_ID || '']:    'Support the Project',
      };
      const tierName = skuMap[skuId] || `Unknown SKU: ${skuId}`;

      // Notify MOD_LOG channel
      try {
        const channel = await this.client.channels.fetch('1488256044349128974').catch(() => null);
        if (channel && channel.isTextBased()) {
          const { EmbedBuilder } = await import('discord.js');
          await (channel as import('discord.js').TextChannel).send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x22d3a6)
                .setTitle('DISCORD PREMIUM PURCHASE')
                .setDescription('Auto-grant role or verify manually.')
                .addFields(
                  { name: 'User ID', value: userId || 'unknown', inline: true },
                  { name: 'Tier', value: tierName, inline: true },
                  { name: 'SKU ID', value: skuId, inline: false },
                )
                .setFooter({ text: 'Made for Degens. By Degens.' })
                .setTimestamp(),
            ],
          });
        }
      } catch (err) {
        console.error('[Payments] Failed to notify MOD_LOG:', err);
      }

      // Primary role per SKU
      const roleMap: Record<string, string> = {
        [process.env.DISCORD_SKU_PRO_ID || '']:        process.env.DISCORD_ROLE_PRO_ID || '',
        [process.env.DISCORD_SKU_ELITE_ID || '']:      process.env.DISCORD_ROLE_ELITE_ID || '',
        [process.env.DISCORD_SKU_LIFETIME_ID || '']:   process.env.DISCORD_ROLE_LIFETIME_ID || '',
        [process.env.DISCORD_SKU_OG_LIFETIME_ID || '']: process.env.DISCORD_ROLE_OG_LIFETIME_ID || '',
      };

      // OG Lifetime also grants beta tester role
      const extraRoleMap: Record<string, string> = {
        [process.env.DISCORD_SKU_OG_LIFETIME_ID || '']: process.env.DISCORD_ROLE_BETA_ID || '',
      };

      const roleId = roleMap[skuId];
      if (roleId && userId) {
        try {
          const guild = await this.client.guilds.fetch('1488253239643078787');
          const member = await guild.members.fetch(userId);
          const rolesToAdd = [roleId];
          const extraRole = extraRoleMap[skuId];
          if (extraRole) rolesToAdd.push(extraRole);
          await member.roles.add(rolesToAdd);
          console.log(`[Payments] Auto-granted roles [${rolesToAdd.join(', ')}] to user ${userId}`);
        } catch (err) {
          console.error(`[Payments] Failed to auto-grant role for ${userId}:`, err);
        }
      }
    });

    console.log('[EventHandler] Payment events registered');
  }

  private async handleButtonInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    const customId = interaction.customId;

    try {
      const handled = await dispatchButtonInteraction(customId, interaction as ButtonInteraction);
      if (handled) return;
    } catch (error) {
      console.error('[EventHandler] Button handler error:', error);
      const btnInteraction = interaction as ButtonInteraction;
      await btnInteraction.reply({
        content: `Button action failed: ${error instanceof Error ? error.message : 'Try again.'}`,
        ephemeral: true
      });
      return;
    }

    const btnInteraction = interaction as ButtonInteraction;
    await btnInteraction.reply({ content: 'Button not mapped. Try a different action.', ephemeral: true });
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
          if (user && await needsOnboarding(user.id)) {
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

          if (isUserInActiveSession(userId)) {
            console.log(`[Bot] Suppressing tilt DM for ${user.tag} - HUD session active.`);
            return;
          }

          const scoreText = typeof tiltScore === 'number' ? tiltScore.toFixed(1) : 'n/a';
          const warningMessage = severity >= 4
            ? `[CRITICAL AUDIT] ${reason.toUpperCase()}. Your current risk profile is spiking. Audit your bag carefully.`
            : `[EDGE EQUALIZER] Quick heads-up: ${reason}. (Score: ${scoreText}). Stay objective.`;

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

    // Cooldown violation logic removed - transitioned to surgical audit.

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
          await user.send(`[UNLOCKED] Vault ready.\n\nYour vault \`${id}\` (${amountText}) is now ready for withdrawal.\nUse \`/vault unlock id:${id}\` to release it.\n\nAddress: \`${address}\``).catch(() => { });
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
          await user.send(`[SCHEDULED RELOAD] Vault Reload Due (${interval})\n\nTime for your scheduled lock of **${amountRaw}**.\nRun \`/vault lock amount:${amountRaw} duration:24h\` to stay on track.`).catch(() => { });
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
          const typeText = vaultType === 'magic'
            ? 'your Degen Identity'
            : vaultType === 'linked'
              ? 'your linked wallet'
              : 'a legacy disposable vault';
          const amountText = amountSOL === 0 ? 'ALL' : amountSOL.toFixed(4);
          await user.send(`[LOCKED] Vault Created.\n\nFunds secured in ${typeText}.\n- **ID:** \`${id}\`\n- **Target:** \`${amountText} SOL eq\`\n- **Address:** \`${vaultAddress}\`\n\nUse \`/vault status\` to view your locks.`).catch(() => { });
        }
      },
      'discord-bot'
    );

    eventRouter.subscribe(
      'safety.intervention.triggered',
      async (event: TiltCheckEvent<'safety.intervention.triggered'>) => {
        try {
          await handleSafetyIntervention(this.client, event.data);
        } catch (error) {
          console.error('[Bot] Error handling safety.intervention.triggered:', error);
        }
      },
      'discord-bot'
    );

    console.log('[EventHandler] Event Router subscriptions active');
  }
}

