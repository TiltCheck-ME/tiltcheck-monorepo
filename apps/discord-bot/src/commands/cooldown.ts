/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Cooldown & Tilt Management Commands
 * Safety features for preventing tilt-driven losses
 */

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
    .setDescription('Start a voluntary cooldown period')
    .addIntegerOption(opt =>
      opt
        .setName('duration')
        .setDescription('Duration in minutes (default: 15)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const duration = interaction.options.getInteger('duration') || 15;

    if (duration < 5 || duration > 1440) {
      await interaction.reply({ 
        content: '❌ Duration must be between 5 and 1440 minutes (24 hours)',
        ephemeral: true 
      });
      return;
    }

    const existing = isOnCooldown(interaction.user.id);

    if (existing) {
      const status = getCooldownStatus(interaction.user.id);
      const remaining = status && status.endsAt ? Math.ceil((status.endsAt - Date.now()) / 60000) : 0;
      
      await interaction.reply({ 
        content: `⏸️ You're already on cooldown for ${remaining} more minutes`,
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
      .setColor(0x00CED1)
      .setTitle('⏸️ Cooldown Started')
      .setDescription(`Taking a ${duration}-minute break. Smart move.`)
      .addFields(
        { name: 'Duration', value: `${duration} minutes`, inline: true },
        { name: 'Expires', value: `<t:${Math.floor((Date.now() + duration * 60000) / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: 'Violations will extend your cooldown automatically' });

    await interaction.reply({ embeds: [embed] });
  },
};

export const tilt: Command = {
  data: new SlashCommandBuilder()
    .setName('tilt')
    .setDescription('Check your tilt status and history')
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Check your current tilt status')
    )
    .addSubcommand(sub =>
      sub
        .setName('history')
        .setDescription('View your tilt detection history')
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
    .setColor(status.onCooldown ? 0xFF6B6B : 0x00CED1)
    .setTitle('📊 Tilt Status');

  if (status.onCooldown && cooldownStatus && cooldownStatus.endsAt) {
    const remaining = Math.ceil((cooldownStatus.endsAt - Date.now()) / 60000);
    const reason = cooldownStatus.reason || 'Unknown';
    embed.setDescription('⏸️ On cooldown')
      .addFields(
        { name: 'Time Remaining', value: `${remaining} minutes`, inline: true },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Violations', value: `${cooldownStatus.violationCount}`, inline: true },
      );
  } else {
    embed.setDescription('✅ No active cooldown')
      .addFields(
        { name: 'Recent Signals', value: `${status.recentSignals.length} (last hour)`, inline: true },
        { name: 'Status', value: status.recentSignals.length >= 3 ? '⚠️ Elevated' : '✅ Normal', inline: true },
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

  embed.setFooter({ text: 'Use /cooldown to take a voluntary break' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTiltHistory(interaction: ChatInputCommandInteraction) {
  const activity = getUserActivity(interaction.user.id);

  if (!activity) {
    await interaction.reply({ 
      content: '📊 No tilt history found. Keep it clean!',
      ephemeral: true 
    });
    return;
  }

  const recentMessages = activity.messages.slice(-10);

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('📈 Tilt History')
    .setDescription(`Activity tracking for ${interaction.user.username}`);

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
      value: `${activity.lossStreak} consecutive losses`,
      inline: true,
    });
  }

  const violationCount = getViolationHistory(interaction.user.id);
  
  if (violationCount > 0) {
    embed.addFields({
      name: 'Cooldown Violations (24h)',
      value: `${violationCount} violations`,
      inline: true,
    });
  }

  embed.setFooter({ text: 'TiltCheck keeps you safe from yourself' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
