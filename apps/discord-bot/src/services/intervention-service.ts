// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
import { Client, TextChannel } from 'discord.js';
import { getVibeCheckAlert } from '@tiltcheck/tiltcheck-core';
import type { SafetyInterventionTriggeredEventData } from '@tiltcheck/types';
import { config } from '../config.js';
import { getUserPreferences } from '../handlers/onboarding.js';

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
  const voiceInterventionEnabled = getUserPreferences(intervention.userId)?.voiceInterventionEnabled ?? false;
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
      const sentMessage = await channel.send({ content: `${alertMessage}\n${intervention.displayText}` }).catch(() => null);
      result.accountabilityAlertSent = sentMessage !== null;
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
