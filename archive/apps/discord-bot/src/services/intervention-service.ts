// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-15
import { Client, TextChannel } from 'discord.js';
import { getVibeCheckAlert } from '@tiltcheck/tiltcheck-core';
import type { SafetyInterventionTriggeredEventData } from '@tiltcheck/types';
import { config } from '../config.js';
import { getCachedUserPreferences, getUserPreferencesAsync } from '../handlers/onboarding.js';
import { applyTiltedCooldown } from '../handlers/tilted-role-handler.js';

const DEFAULT_DISCORD_INVITE_URL = 'https://discord.gg/gdBsEJfCar';

export interface SafetyInterventionResult {
  action: SafetyInterventionTriggeredEventData['action'];
  dmSent: boolean;
  accountabilityAlertSent: boolean;
  movedToVoice: boolean;
}

export async function handleSafetyIntervention(
  client: Client,
  intervention: SafetyInterventionTriggeredEventData
): Promise<SafetyInterventionResult> {
  const result: SafetyInterventionResult = {
    action: intervention.action,
    dmSent: false,
    accountabilityAlertSent: false,
    movedToVoice: false,
  };

  const user = await client.users.fetch(intervention.userId).catch(() => null);
  const metadata = intervention.metadata as Record<string, unknown> | undefined;
  const cachedPreferences = getCachedUserPreferences(intervention.userId) ?? await getUserPreferencesAsync(intervention.userId);
  const voiceInterventionEnabled = cachedPreferences?.voiceInterventionEnabled ?? false;
  const guildId = getMetadataString(metadata, 'guildId') || config.guildId;
  const voiceChannelId = process.env.DEGEN_ACCOUNTABILITY_VC_ID || '';
  const accountabilityChannelId = process.env.DEGEN_ACCOUNTABILITY_CHANNEL_ID || '';
  const inviteUrl = getMetadataString(metadata, 'inviteUrl')
    || process.env.DEGEN_ACCOUNTABILITY_INVITE_URL
    || DEFAULT_DISCORD_INVITE_URL;
  const voiceLink = guildId && voiceChannelId
    ? `https://discord.com/channels/${guildId}/${voiceChannelId}`
    : inviteUrl;

  if (user && intervention.action === 'PHONE_FRIEND') {
    const dmLines = [
      `[TILT CHECK] ${intervention.displayText}`,
      '',
      `Join the accountability voice room now: ${voiceLink}`,
      `Fallback server invite: ${inviteUrl}`,
    ];

    const casino = getMetadataString(metadata, 'casino');
    if (casino) {
      dmLines.push(`Casino: ${casino}`);
    }

    const requestedAt = getMetadataString(metadata, 'requestedAt') || getMetadataString(metadata, 'timestamp');
    if (requestedAt) {
      dmLines.push(`Triggered: ${requestedAt}`);
    }

    const dmResult = await user.send(dmLines.join('\n')).catch(() => null);
    result.dmSent = dmResult !== null;
  }

  if (intervention.action === 'PHONE_FRIEND' && accountabilityChannelId) {
    const channel = await client.channels.fetch(accountabilityChannelId).catch(() => null);
    if (channel && channel instanceof TextChannel) {
      const alertMessage = getVibeCheckAlert(intervention.userId);
      const supportOnlyGuidance = buildSupportOnlyGuidance(metadata);
      const sentMessage = await channel.send({
        content: `${alertMessage}\n${supportOnlyGuidance}`,
      }).catch(() => null);
      result.accountabilityAlertSent = sentMessage !== null;
    }
  }

  // Apply Tilted role + Donation Station nickname on critical PHONE_FRIEND intervention
  // Score threshold: >= 80 on 0-100 scale (== >= 8 on 0-10 scale)
  if (intervention.action === 'PHONE_FRIEND' && guildId) {
    const tiltScore = typeof (metadata as Record<string, unknown> | undefined)?.tiltScore === 'number'
      ? (metadata as Record<string, unknown>).tiltScore as number
      : 100; // Default to critical when score is unknown — PHONE_FRIEND is always critical
    if (tiltScore >= 80) {
      const displayName = user?.username ?? intervention.userId;
      await applyTiltedCooldown(
        client,
        guildId,
        intervention.userId,
        displayName,
        accountabilityChannelId || null,
      ).catch(err => console.error('[Intervention] Tilted role apply failed:', err));
    }
  }

  if (intervention.action === 'PHONE_FRIEND' && voiceInterventionEnabled && guildId && voiceChannelId) {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (guild) {
      const member = await guild.members.fetch(intervention.userId).catch(() => null);
      if (member && member.voice.channelId) {
        const movedMember = await member.voice.setChannel(voiceChannelId).catch((error) => {
          console.error(error);
          return null;
        });
        result.movedToVoice = movedMember !== null;
      }
    }
  }

  return result;
}

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function buildSupportOnlyGuidance(metadata: Record<string, unknown> | undefined): string {
  const actions = metadata?.supportActions;
  const formattedActions = Array.isArray(actions)
    ? actions.filter((value): value is string => typeof value === 'string' && value.trim() !== '').slice(0, 4)
    : [];

  const actionLine = formattedActions.length > 0
    ? `Do this: ${formattedActions.join(' | ')}`
    : 'Do this: tell them to pause | tell them to cash out | offer a voice check-in | tell them to log off';

  return [
    'Accountability ping only. No money asks, no tips, no transfers, no bankroll fishing.',
    actionLine,
  ].join('\n');
}
