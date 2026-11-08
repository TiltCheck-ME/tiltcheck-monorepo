// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { 
  startCooldown, 
  isOnCooldown, 
  getCooldownStatus, 
  getViolationHistory,
  getUserTiltStatus,
  getUserActivity,
} from '@tiltcheck/tiltcheck-core';

export const cooldown: Command = {
  data: new SlashCommandBuilder()
    .setName('cooldown')
    .setDescription('Lock yourself out for a bit before the session gets stupid.')
    .addIntegerOption(opt =>
      opt
        .setName('duration')
        .setDescription('Minutes to stay locked out (default: 15)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const duration = interaction.options.getInteger('duration') || 15;

    if (duration < 5 || duration > 1440) {
      await interaction.reply({ 
        content: 'Pick a window between 5 and 1440 minutes. We are not doing 2-minute fake discipline.',
        ephemeral: true 
      });
      return;
    }

    const existing = isOnCooldown(interaction.user.id);

    if (existing) {
      const status = getCooldownStatus(interaction.user.id);
      const remaining = status && status.endsAt ? Math.ceil((status.endsAt - Date.now()) / 60000) : 0;
      
      await interaction.reply({ 
        content: `Cooldown already live — ${remaining} more minute(s). Sit still.`,
        ephemeral: true 
      });
      return;
    }

    startCooldown(
      interaction.user.id,
      `Voluntary cooldown by ${interaction.user.username}`,
      duration * 60 * 1000 // Convert minutes to milliseconds
    );

    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('COOLDOWN LOCKED IN')
      .setDescription(`${duration}-minute lock is live. Future-you can complain later.`)
      .addFields(
        { name: 'Duration', value: `${duration} minutes`, inline: true },
        { name: 'Expires', value: `<t:${Math.floor((Date.now() + duration * 60000) / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed] });
  },
};

export const tilt: Command = {
  data: new SlashCommandBuilder()
    .setName('tilt')
    .setDescription('Check the read on your tilt state and recent spiral history')
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('See your current tilt read')
    )
    .addSubcommand(sub =>
      sub
        .setName('history')
        .setDescription('See the last tilt flags and how fast you were moving')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'status') {
      await handleTiltStatus(interaction);
    } else if (subcommand === 'history') {
      await handleTiltHistory(interaction);
    }
  },
};

async function handleTiltStatus(interaction: ChatInputCommandInteraction) {
  const status = getUserTiltStatus(interaction.user.id);
  const cooldownStatus = getCooldownStatus(interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(status.onCooldown ? 0xef4444 : 0x22d3a6)
    .setTitle('TILT STATUS');

  if (status.onCooldown && cooldownStatus && cooldownStatus.endsAt) {
    const remaining = Math.ceil((cooldownStatus.endsAt - Date.now()) / 60000);
    const reason = cooldownStatus.reason || 'Not logged';
    embed.setDescription('[COOLDOWN ACTIVE]\nYou hit your own brake. Let it do its job.')
      .addFields(
        { name: 'Time Remaining', value: `${remaining} minutes`, inline: true },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Violations', value: `${cooldownStatus.violationCount}`, inline: true },
      );
  } else {
    embed.setDescription('[CLEAR]\nNothing is screaming tilt right now.')
      .addFields(
        { name: 'Recent Signals', value: `${status.recentSignals.length} (last hour)`, inline: true },
        { name: 'Status', value: status.recentSignals.length >= 3 ? '[HOT]' : '[NORMAL]', inline: true },
      );
  }

  // Show violation history if any
  const violationCount = getViolationHistory(interaction.user.id);
  if (violationCount > 0) {
    embed.addFields({ 
      name: 'Recent Violations (24h)', 
      value: `${violationCount} violations`, 
      inline: true
    });
  }

  embed.setFooter({ text: 'Made for Degens. By Degens.' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTiltHistory(interaction: ChatInputCommandInteraction) {
  const activity = getUserActivity(interaction.user.id);

  if (!activity) {
    await interaction.reply({ 
      content: 'No tilt history yet. Either you stayed chill or nothing got flagged.',
      ephemeral: true 
    });
    return;
  }

  const recentMessages = activity.messages.slice(-10);

  const embed = new EmbedBuilder()
    .setColor(0x22d3a6)
    .setTitle('TILT HISTORY')
    .setDescription(`How the last stretch looked for ${interaction.user.username}`);

  if (recentMessages.length > 0) {
    const messageCount = recentMessages.length;
    const avgInterval = recentMessages.length > 1 
      ? (recentMessages[recentMessages.length - 1].timestamp - recentMessages[0].timestamp) / (messageCount - 1)
      : 0;
    
    embed.addFields({
      name: 'Recent Messages',
      value: `${messageCount} messages (avg ${Math.round(avgInterval / 1000)}s apart)`,
      inline: true,
    });
  }

  // Show loss streak if any
  if (activity.lossStreak > 0) {
    embed.addFields({
      name: 'Loss Streak',
        value: `${activity.lossStreak} straight losses. Big yikes.`,
      inline: true,
    });
  }

  const violationCount = getViolationHistory(interaction.user.id);
  
  if (violationCount > 0) {
    embed.addFields({
      name: 'Cooldown Violations (24h)',
        value: `${violationCount} lock break attempt(s)`,
      inline: true,
    });
  }

  embed.setFooter({ text: 'Made for Degens. By Degens.' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
