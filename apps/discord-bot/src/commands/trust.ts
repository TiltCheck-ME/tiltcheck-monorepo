/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Trust Commands
 * 
 * Display trust scores from Casino Trust Engine and Degen Trust Engine.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { trustEngines } from '@tiltcheck/trust-engines';

export const trustDashboard: Command = {
  data: new SlashCommandBuilder()
    .setName('trust')
    .setDescription('The brutal, unfiltered truth. See who\'s a degen and who\'s a scammer.')
    .addSubcommand(sub =>
      sub.setName('casino')
        .setDescription('Check if a casino is legit or just another sh**coin.')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Casino name or domain (e.g., stake.com)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('user')
        .setDescription('Check a user\'s degen score. Or your own.')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Who are we judging today? (leave empty for yourself)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('explain')
        .setDescription('Learn how we separate the saints from the sinners.')
    ) as any as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'casino') {
        await showCasinoTrust(interaction);
      } else if (subcommand === 'user') {
        await showUserTrust(interaction);
      } else if (subcommand === 'explain') {
        await showExplanation(interaction);
      }
    } catch (err) {
      console.error('[TrustCommand] Error:', err);
      await interaction.reply({
        content: '❌ Failed to fetch trust data. Please try again.',
        ephemeral: true
      });
    }
  },
};

async function showCasinoTrust(interaction: ChatInputCommandInteraction) {
  const casinoName = interaction.options.getString('name', true);
  const normalized = casinoName.toLowerCase().replace(/^https?:\/\/(www\.)?/, '');
  
  const score = trustEngines.getCasinoScore(normalized);
  const breakdown = trustEngines.getCasinoBreakdown(normalized);
  const explanations = trustEngines.explainCasinoScore(normalized);

  let color = 0x718093; // Gray
  if (score >= 80) color = 0x38A169; // Green
  else if (score >= 60) color = 0xD69E2E; // Yellow
  else color = 0xE53E3E; // Red

  const embed = new EmbedBuilder()
    .setTitle(`The Verdict on ${casinoName}`)
    .setColor(color)
    .setDescription(`**Overall Score: ${score}/100**`)
    .addFields(
      { name: 'Fairness', value: `${breakdown.fairnessScore}/100`, inline: true },
      { name: 'Payouts', value: `${breakdown.payoutScore}/100`, inline: true },
      { name: 'Bonuses', value: `${breakdown.bonusScore}/100`, inline: true },
      { name: 'User Reports', value: `${breakdown.userReportScore}/100`, inline: true },
      { name: 'Promo Integrity', value: `${breakdown.freespinScore}/100`, inline: true },
      { name: 'Compliance', value: `${breakdown.complianceScore}/100`, inline: true },
      { name: 'Support', value: `${breakdown.supportScore}/100`, inline: true },
    )
    .setTimestamp()
    .setFooter({ text: `Based on ${breakdown.history.length} tracked events. The data doesn't lie.` });

  if (explanations.length > 0) {
    embed.addFields({
      name: 'What This Means',
      value: explanations.slice(0, 5).join('\n'),
      inline: false
    });
  } else {
    embed.addFields({
      name: 'What This Means',
      value: 'Not enough data to form a strong opinion. Tread carefully.',
      inline: false
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function showUserTrust(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const userId = targetUser.id;
  
  const score = trustEngines.getDegenScore(userId);
  const breakdown = trustEngines.getDegenBreakdown(userId);
  const level = trustEngines.getTrustLevel(score);
  const explanations = trustEngines.explainDegenScore(userId);

  let color = 0x718093; // Gray
  if (level === 'very-high' || level === 'high') color = 0x38A169; // Green
  else if (level === 'neutral') color = 0xD69E2E; // Yellow
  else color = 0xE53E3E; // Red

  const embed = new EmbedBuilder()
    .setTitle(`Degen Report Card: ${targetUser.username}`)
    .setColor(color)
    .setDescription(`**${score}/100** - ${level.toUpperCase().replace('-', ' ')}`)
    .addFields(
      { name: 'Behavior Score', value: `${breakdown.behaviorScore}/100`, inline: true },
      { name: 'Tilt Indicators', value: `${breakdown.tiltIndicators}`, inline: true },
      { name: 'Accountability', value: `+${breakdown.accountabilityBonus}`, inline: true },
      { name: 'Scam Flags', value: `${breakdown.scamFlags}`, inline: true },
      { name: 'Community Reports', value: `${breakdown.communityReports > 0 ? '+' : ''}${breakdown.communityReports}`, inline: true },
    )
    .setThumbnail(targetUser.displayAvatarURL())
    .setTimestamp()
    .setFooter({ text: `Based on ${breakdown.history.length} tracked events. Numbers don't lie.` });

  if (explanations.length > 0) {
    embed.addFields({
      name: 'Insights',
      value: explanations.slice(0, 6).join('\n'),
      inline: false
    });
  }

  const isSelf = targetUser.id === interaction.user.id;
  if (!isSelf) {
    embed.addFields({
      name: 'A Note on Privacy',
      value: 'We\'re all degens here. This is for community safety, not to make you feel bad. Or maybe it is.',
      inline: false
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function showExplanation(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('The Gospel of Trust According to TiltCheck')
    .setColor(0x4ec9f0)
    .setDescription('This isn\'t about feelings. It\'s about data. Here\'s how we judge everyone, including you.')
    .addFields(
      {
        name: 'Casino Trust Score (Are they gonna screw you?)',
        value: 'We watch everything: if they pay out, if their bonuses are real, and what other degens say about them. It\'s all weighted and scored. Simple.',
        inline: false
      },
      {
        name: 'User Trust Score (Are YOU a liability?)',
        value: 'We measure your degen level. High scores mean you\'re a trusted member of the community. Low scores mean you\'re probably a walking disaster.',
        inline: false
      },
      {
        name: 'How to Not Look Like a Total Degenerate',
        value: '• Use the cooldown and vault tools. It shows you have some self-control.\n• Don\'t be a dick in the community.\n• Tip people. Don\'t be cheap.',
        inline: false
      },
      {
        name: 'How to Tank Your Score',
        value: '• Act like a maniac (we call it "tilt behavior").\n• Try to cheat your cooldowns.\n• Get flagged as a scammer (this one hurts).',
        inline: false
      },
      {
        name: 'A Note on Privacy',
        value: 'We don\'t store your personal sh**. This is all based on your behavior here. We\'re not your mom, we\'re just watching.',
        inline: false
      }
    )
    .setFooter({ text: 'The numbers don\'t lie.' });

  await interaction.reply({ embeds: [embed] });
}
