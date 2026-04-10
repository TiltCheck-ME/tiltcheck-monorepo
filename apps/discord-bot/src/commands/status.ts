// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { 
  getUserTiltStatus, 
  getCooldownStatus, 
  getViolationHistory,
  getUserActivity
} from '@tiltcheck/tiltcheck-core';

export const status: Command = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Quick Audit: Check your live risk and session metrics.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const status = getUserTiltStatus(interaction.user.id);
    const cooldownStatus = getCooldownStatus(interaction.user.id);
    const activity = getUserActivity(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(status.onCooldown ? 0xef4444 : 0x22d3a6)
      .setTitle('SESSION AUDIT')
      .setDescription(status.onCooldown ? 'COOLDOWN ACTIVE. You set this up. Let it run.' : 'ALL CLEAR. Nothing to flag right now.')
      .setTimestamp();

    // 1. Live Telemetry
    const signalCount = status.recentSignals.length;
    const activityState = signalCount >= 5 ? 'CRITICAL SPIRAL' : signalCount >= 3 ? 'AUDIT REQUIRED' : 'STEADY';
    
    embed.addFields(
      { name: 'Audit Level', value: activityState, inline: true },
      { name: 'Recent Signals', value: `${signalCount} (last hour)`, inline: true },
      { name: 'Session Duration', value: activity ? `${Math.floor((Date.now() - activity.messages[0]?.timestamp || 0) / 60000)}m` : 'n/a', inline: true }
    );

    // 2. Cooldown/Profit Guard (Legacy/Internal)
    if (status.onCooldown && cooldownStatus?.endsAt) {
      const remaining = Math.ceil((cooldownStatus.endsAt - Date.now()) / 60000);
      embed.addFields({ name: 'Active Break', value: `${remaining}m remaining`, inline: true });
    }

    // 3. User Stats/Pattern Recognition
    if (activity && activity.lossStreak >= 3) {
      embed.addFields({ name: 'Loss Streak', value: `${activity.lossStreak} in a row. Rinse vibes. Touch grass.`, inline: false });
    } else if (activity && activity.lossStreak === 0 && signalCount > 0) {
      embed.addFields({ name: 'Session Profile', value: 'Chasing a win? The math never lies.', inline: false });
    }

    // 4. Verification Footer
    const violationCount = getViolationHistory(interaction.user.id);
    embed.setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
