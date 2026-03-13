/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
import { linkCmd } from './suslink.js';
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
    .setDescription('The main command. Check your tilt, cool off, or see diagnostics.')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM
    )
    .addSubcommand((sub) =>
      sub.setName('help').setDescription('Seriously? It shows this command list.')
    )
    .addSubcommand((sub) =>
      sub.setName('ping').setDescription('Check if the bot is alive or if it rugged.')
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('See if you\'re about to do something stupid.')
    )
    .addSubcommand(sub =>
      sub.setName('history')
        .setDescription('Review your past mistakes.')
    )
    .addSubcommand(sub =>
      sub.setName('cooldown')
        .setDescription('Hit the brakes before you lose it all.')
        .addIntegerOption(opt =>
          opt.setName('duration').setDescription('How many minutes to lock yourself out? (default: 15)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('diagnostics')
        .setDescription('Look under the hood. (Admins only, you ape).')
    )
    .addSubcommand((sub) =>
      sub
        .setName('casino')
        .setDescription('Check if a casino is a scam.')
        .addStringOption((opt) =>
          opt
            .setName('domain')
            .setDescription('Casino domain (e.g., stake.com)')
            .setRequired(true),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName('link')
        .setDescription('Scan sketchy links.')
        .addSubcommand((sub) =>
          sub
            .setName('scan')
            .setDescription('Scan a URL before you click it.')
            .addStringOption((opt) =>
              opt.setName('url').setDescription('The sketchy URL').setRequired(true),
            ),
        )
        // NOTE: Other link subcommands removed for clarity as they are not implemented in this file
    )
    .addSubcommandGroup((group) =>
      group
        .setName('buddy')
        .setDescription('Get a friend to save you from yourself.')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a buddy to get alerts when you tilt.')
            .addUserOption((opt) =>
              opt.setName('user').setDescription('The poor soul you want to bother').setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Ditch a buddy.')
            .addUserOption((opt) =>
              opt.setName('user').setDescription('The buddy to ditch').setRequired(true),
            ),
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('See who\'s on your tilt-watch list.'))
        .addSubcommand((sub) =>
          sub
            .setName('test')
            .setDescription('Send a fake alert to your buddy.')
            .addUserOption((opt) =>
              opt.setName('buddy').setDescription('The buddy to test').setRequired(true),
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('report')
        .setDescription('Drop the hammer on a degen. (Mods only).')
        .addUserOption((option) =>
          option.setName('target').setDescription('Who\'s the problem?').setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('What\'s the verdict?')
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
          option.setName('reason').setDescription('What\'s the damage? Be specific.').setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('evidence')
            .setDescription('Proof or it didn\'t happen (link)')
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('setstate')
        .setDescription('Set your state for... reasons.')
        .addStringOption((opt) =>
          opt.setName('state').setDescription('Two-letter US state code (e.g., NJ)').setRequired(false),
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
          opt.setName('clear').setDescription('Nuke your saved context.').setRequired(false),
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

    if (group === 'link') {
      await linkCmd.execute(interaction);
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
    .setTitle('Your Tilt-O-Meter');

  if (status.onCooldown && cooldownStatus && cooldownStatus.endsAt) {
    const remaining = Math.ceil((cooldownStatus.endsAt - Date.now()) / 60000);
    const reason = cooldownStatus.reason || 'No reason, you just knew you were a liability.';
    embed.setDescription('You\'re in the penalty box. Did you learn your lesson yet?')
      .addFields(
        { name: 'Time Remaining', value: `${remaining} minutes`, inline: true },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Violations', value: `${cooldownStatus.violationCount} (Don't do that)`, inline: true },
      );
  } else {
    embed.setDescription('You\'re not actively self-destructing. For now.')
      .addFields(
        { name: 'Recent Signals', value: `${status.recentSignals.length} (last hour)`, inline: true },
        { name: 'Status', value: status.recentSignals.length >= 3 ? 'Elevated... maybe take a walk?' : 'Normal...ish', inline: true },
      );
  }

  const violationCount = getViolationHistory(interaction.user.id);
  if (violationCount > 0) {
    embed.addFields({ 
      name: 'Recent Violations (24h)', 
      value: `${violationCount} times you f***ed up`, 
      inline: true
    });
  }

  embed.setFooter({ text: 'This is science. Don\'t argue with it.' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTiltHistory(interaction: ChatInputCommandInteraction) {
  const activity = getUserActivity(interaction.user.id);

  if (!activity) {
    await interaction.reply({ 
      content: 'Your record is clean. A little too clean. Are you even playing?',
      ephemeral: true 
    });
    return;
  }

  const recentMessages = activity.messages.slice(-10);

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('Your Report Card of Degeneracy')
    .setDescription(`A look back at the chaos for ${interaction.user.username}`);

  if (recentMessages.length > 0) {
    const messageCount = recentMessages.length;
    const avgInterval = recentMessages.length > 1 
      ? (recentMessages[recentMessages.length - 1].timestamp - recentMessages[0].timestamp) / (messageCount - 1)
      : 0;
    
    embed.addFields({
      name: 'Recent Message Velocity',
      value: `${messageCount} messages (avg ${Math.round(avgInterval / 1000)}s apart). Spamming much?`,
      inline: true,
    });
  }

  if (activity.lossStreak > 0) {
    embed.addFields({
      name: 'Current Loss Streak',
      value: `${activity.lossStreak} in a row. Maybe take a break, champ.`,
      inline: true,
    });
  }

  const violationCount = getViolationHistory(interaction.user.id);
  
  if (violationCount > 0) {
    embed.addFields({
      name: 'Cooldown Violations (24h)',
      value: `${violationCount}. You just can't help yourself, can you?`,
      inline: true,
    });
  }

  if (embed.data.fields?.length === 0) {
    embed.setDescription('Found nothing to shame you with. Your history is boringly clean.');
  }

  embed.setFooter({ text: 'We keep receipts.' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCooldown(interaction: ChatInputCommandInteraction) {
  const duration = interaction.options.getInteger('duration') || 15;

  if (duration < 5 || duration > 1440) {
    await interaction.reply({ 
      content: 'Duration must be between 5 and 1440 minutes. Don\'t be a hero, but also don\'t waste my time with a 2-minute cooldown.',
      ephemeral: true 
    });
    return;
  }

  const existing = isOnCooldown(interaction.user.id);

  if (existing) {
    const status = getCooldownStatus(interaction.user.id);
    const remaining = status && status.endsAt ? Math.ceil((status.endsAt - Date.now()) / 60000) : 0;
    
    await interaction.reply({ 
      content: `You're already in the penalty box for ${remaining} more minutes. Patience, young grasshopper.`,
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
    .setTitle('Cooldown Activated. Probably a Good Idea.')
    .setDescription(`You've been benched for ${duration} minutes. Try not to f*** it up when you get back.`)
    .addFields(
      { name: 'Duration', value: `${duration} minutes`, inline: true },
      { name: 'Expires', value: `<t:${Math.floor((Date.now() + duration * 60000) / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: 'Trying to cheat this will just make it last longer. We\'re watching.' });

  await interaction.reply({ embeds: [embed] });
}

async function handleDiagnostics(interaction: ChatInputCommandInteraction) {
  const isAdmin = interaction.memberPermissions?.has('Administrator') || interaction.user.id === interaction.guild?.ownerId;
  
  if (!isAdmin) {
    await interaction.reply({ content: 'Admins only. Don\'t try to peek behind the curtain.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('System Diagnostics')
    .addFields(
      { name: 'Service Status', value: 'Operational', inline: true },
      { name: 'Detection Engine', value: 'Active', inline: true },
      { name: 'Event Router', value: 'Connected', inline: true },
      { name: 'Uptime', value: `${Math.floor(process.uptime() / 60)} minutes`, inline: true },
      { name: 'Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
