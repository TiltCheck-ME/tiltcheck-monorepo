/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
    .setDescription('Hit the brakes, degen. Start a cooldown before you lose your entire stack.')
    .addIntegerOption(opt =>
      opt
        .setName('duration')
        .setDescription('How long do you need to unf**k yourself? (minutes, default: 15)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const duration = interaction.options.getInteger('duration') || 15;

    if (duration < 5 || duration > 1440) {
      await interaction.reply({ 
        content: '❌ Are you trying to cooldown for 3 minutes, you ape? Duration must be between 5 and 1440 minutes (max 24 hours). If you need less than 5, you're beyond help. Just kidding. Mostly.',
        ephemeral: true 
      });
      return;
    }

    const existing = isOnCooldown(interaction.user.id);

    if (existing) {
      const status = getCooldownStatus(interaction.user.id);
      const remaining = status && status.endsAt ? Math.ceil((status.endsAt - Date.now()) / 60000) : 0;
      
      await interaction.reply({ 
        content: `⏸️ Chill out, degen. You're already on cooldown for ${remaining} more minutes. No shortcuts to sanity. Stay in the penalty box.`,
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
      .setTitle('⏸️ Cooldown Initiated. Don't F*** It Up.')
      .setDescription(`You've chosen to take a ${duration}-minute break. Good for you. Now actually stick to it, you degenerate.`)
      .addFields(
        { name: 'Duration', value: `${duration} minutes`, inline: true },
        { name: 'Expires', value: `<t:${Math.floor((Date.now() + duration * 60000) / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: 'Violations will extend your cooldown. Don't test us. We see everything.' });

    await interaction.reply({ embeds: [embed] });
  },
};

export const tilt: Command = {
  data: new SlashCommandBuilder()
    .setName('tilt')
    .setDescription('See how deep you're in the hole. Your current tilt status and past f***-ups.')
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Are you about to blow up? See your current tilt status.')
    )
    .addSubcommand(sub =>
      sub
        .setName('history')
        .setDescription('Relive your glory... or your biggest tilt spirals.')
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
    .setTitle('📊 Your Tiltometer Reading');

  if (status.onCooldown && cooldownStatus && cooldownStatus.endsAt) {
    const remaining = Math.ceil((cooldownStatus.endsAt - Date.now()) / 60000);
    const reason = cooldownStatus.reason || 'Unknown';
    embed.setDescription('⏸️ Still in the penalty box. Did you learn your lesson yet?')
      .addFields(
        { name: 'Time Remaining', value: `${remaining} minutes`, inline: true },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Violations', value: `${cooldownStatus.violationCount}`, inline: true },
      );
  } else {
    embed.setDescription('✅ You're not actively self-destructing. Yet. Keep it up, degen.')
      .addFields(
        { name: 'Recent Signals', value: `${status.recentSignals.length} (last hour)`, inline: true },
        { name: 'Status', value: status.recentSignals.length >= 3 ? '⚠️ Elevated (Brace for impact)' : '✅ Normal (For now)', inline: true },
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

  embed.setFooter({ text: 'Use /cooldown to prevent further self-sabotage. Or don't. Your money.' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTiltHistory(interaction: ChatInputCommandInteraction) {
  const activity = getUserActivity(interaction.user.id);

  if (!activity) {
    await interaction.reply({ 
      content: '📊 Your history is suspiciously clean. No past f***-ups logged. Keep it that way, degen!',
      ephemeral: true 
    });
    return;
  }

  const recentMessages = activity.messages.slice(-10);

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('📈 Your History of Degeneracy')
    .setDescription(`A peek into ${interaction.user.username}'s past spirals:`);

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

  embed.setFooter({ text: 'TiltCheck: Protecting you from your worst impulses since 2026. You're welcome.' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
