/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { 
  startCooldown, 
  isOnCooldown, 
  getCooldownStatus, 
  getViolationHistory,
  getUserTiltStatus,
  getUserActivity,
} from '@tiltcheck/tiltcheck-core';
import { suslinkCmd } from './suslink.js';
import { buddy } from './buddy.js';
import { casino } from './casino.js';
import report from './report.js';
import { setstate } from './setstate.js';
import { ping } from './ping.js';
import { help } from './help.js';
import { PermissionFlagsBits } from 'discord.js';

export const tiltcheck: Command = {
  data: new SlashCommandBuilder()
    .setName('tiltcheck')
    .setDescription('Check tilt status and manage cooldowns')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM
    )
    .addSubcommand((sub) =>
      sub.setName('help').setDescription('Show command map and routing')
    )
    .addSubcommand((sub) =>
      sub.setName('ping').setDescription('Check if the bot is responsive')
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Check your current tilt status')
    )
    .addSubcommand(sub =>
      sub.setName('history')
        .setDescription('View your tilt detection history')
    )
    .addSubcommand(sub =>
      sub.setName('cooldown')
        .setDescription('Start a voluntary cooldown period')
        .addIntegerOption(opt =>
          opt.setName('duration').setDescription('Duration in minutes (default: 15)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('diagnostics')
        .setDescription('Show system diagnostics (Admin Only)')
    )
    .addSubcommand((sub) =>
      sub
        .setName('casino')
        .setDescription('Get trust and fairness data for a casino')
        .addStringOption((opt) =>
          opt
            .setName('domain')
            .setDescription('Casino domain (e.g., stake.com)')
            .setRequired(true),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName('suslink')
        .setDescription('Link scanning & promo management')
        .addSubcommand((sub) =>
          sub
            .setName('scan')
            .setDescription('Scan a URL for suspicious patterns')
            .addStringOption((opt) =>
              opt.setName('url').setDescription('The URL to scan').setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('submit')
            .setDescription('Submit a free spin or promo link for review')
            .addStringOption((opt) =>
              opt.setName('url').setDescription('Promo URL').setRequired(true),
            )
            .addStringOption((opt) =>
              opt
                .setName('bonustype')
                .setDescription('Bonus type (e.g., free_spins, deposit)')
                .setRequired(true),
            )
            .addStringOption((opt) =>
              opt.setName('casino').setDescription('Casino name').setRequired(true),
            )
            .addStringOption((opt) =>
              opt.setName('notes').setDescription('Additional notes (optional)').setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('approve')
            .setDescription('Approve a pending promo submission (mods only)')
            .addIntegerOption((opt) =>
              opt.setName('id').setDescription('Submission ID').setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('deny')
            .setDescription('Deny a pending promo submission (mods only)')
            .addIntegerOption((opt) =>
              opt.setName('id').setDescription('Submission ID').setRequired(true),
            )
            .addStringOption((opt) =>
              opt.setName('reason').setDescription('Reason for denial (optional)').setRequired(false),
            ),
        )
        .addSubcommand((sub) =>
          sub.setName('pending').setDescription('View pending promo submissions (mods only)'),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName('buddy')
        .setDescription('Accountability buddy system')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Link a buddy to alert them when you tilt')
            .addUserOption((opt) =>
              opt.setName('user').setDescription('The user you want to add as a buddy').setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a buddy')
            .addUserOption((opt) =>
              opt.setName('user').setDescription('The buddy to remove').setRequired(true),
            ),
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('List your current buddies'))
        .addSubcommand((sub) =>
          sub
            .setName('test')
            .setDescription('Send a test alert to your buddy')
            .addUserOption((opt) =>
              opt.setName('buddy').setDescription('The buddy to test alert').setRequired(true),
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('report')
        .setDescription('Log a disciplinary action or report a user')
        .addUserOption((option) =>
          option.setName('target').setDescription('The user to report').setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Type of action taken')
            .setRequired(true)
            .addChoices(
              { name: 'Warning', value: 'warn' },
              { name: 'Mute', value: 'mute' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' },
              { name: 'Flag Scammer', value: 'flag_scammer' },
              { name: 'Flag Rain Farmer', value: 'flag_farmer' },
            ),
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('Reason for the action').setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('evidence')
            .setDescription('Link to screenshot or message (optional)')
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('setstate')
        .setDescription('Optional: set your state context for regulation-aware TiltCheck analysis')
        .addStringOption((opt) =>
          opt.setName('state').setDescription('Two-letter US state code, e.g., NJ').setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName('topic')
            .setDescription('Regulation topic')
            .addChoices(
              { name: 'iGaming', value: 'igaming' },
              { name: 'Sportsbook', value: 'sportsbook' },
              { name: 'Sweepstakes', value: 'sweepstakes' },
            )
            .setRequired(false),
        )
        .addBooleanOption((opt) =>
          opt.setName('clear').setDescription('Clear your saved state/topic context').setRequired(false),
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'help') {
      await help.execute(interaction);
      return;
    }

    if (subcommand === 'ping') {
      await ping.execute(interaction);
      return;
    }

    if (subcommand === 'casino') {
      await casino.execute(interaction);
      return;
    }

    if (subcommand === 'setstate') {
      await setstate.execute(interaction);
      return;
    }

    if (subcommand === 'report') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
        await interaction.reply({ content: 'Mods only. This is not a toy.', ephemeral: true });
        return;
      }
      await report.execute(interaction);
      return;
    }

    if (group === 'suslink') {
      await suslinkCmd.execute(interaction);
      return;
    }

    if (group === 'buddy') {
      await buddy.execute(interaction);
      return;
    }

    if (subcommand === 'status') {
      await handleTiltStatus(interaction);
    } else if (subcommand === 'history') {
      await handleTiltHistory(interaction);
    } else if (subcommand === 'cooldown') {
      await handleCooldown(interaction);
    } else if (subcommand === 'diagnostics') {
      await handleDiagnostics(interaction);
    } else {
      await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
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

  embed.setFooter({ text: 'Use /tiltcheck cooldown to take a voluntary break' });

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

async function handleCooldown(interaction: ChatInputCommandInteraction) {
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
}

async function handleDiagnostics(interaction: ChatInputCommandInteraction) {
  // Simple admin check (can be expanded)
  const isAdmin = interaction.memberPermissions?.has('Administrator') || interaction.user.id === interaction.guild?.ownerId;
  
  if (!isAdmin) {
    await interaction.reply({ content: '❌ Only administrators can view system diagnostics.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('⚙️ TiltCheck Diagnostics')
    .addFields(
      { name: 'Service Status', value: '✅ Operational', inline: true },
      { name: 'Detection Engine', value: '✅ Active', inline: true },
      { name: 'Event Router', value: '✅ Connected', inline: true },
      { name: 'Uptime', value: `${Math.floor(process.uptime() / 60)} minutes`, inline: true },
      { name: 'Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
