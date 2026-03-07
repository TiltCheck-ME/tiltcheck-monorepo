/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
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
    .setDescription('View TiltCheck trust scores')
    .addSubcommand(sub =>
      sub.setName('casino')
        .setDescription('Check a casino trust score')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Casino name or domain (e.g., stake.com)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('user')
        .setDescription('Check a user trust score')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to check (leave empty for yourself)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('explain')
        .setDescription('Learn how trust scoring works')
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
  
  // Normalize casino name
  const normalized = casinoName.toLowerCase().replace(/^https?:\/\/(www\.)?/, '');
  
  const score = trustEngines.getCasinoScore(normalized);
  const breakdown = trustEngines.getCasinoBreakdown(normalized);
  const explanations = trustEngines.explainCasinoScore(normalized);

  // Score color based on trust level
  let color = 0x4ec9f0; // Blue (neutral)
  if (score >= 80) color = 0x43b581; // Green (good)
  else if (score >= 60) color = 0xfaa61a; // Yellow (ok)
  else color = 0xf04747; // Red (bad)

  const embed = new EmbedBuilder()
    .setTitle(`🎰 ${casinoName} Trust Score`)
    .setColor(color)
    .setDescription(`**Overall Score: ${score}/100**`)
    .addFields(
      { name: '⚖️ Fairness', value: `${breakdown.fairnessScore}/100`, inline: true },
      { name: '💰 Payout', value: `${breakdown.payoutScore}/100`, inline: true },
      { name: '🎁 Bonus', value: `${breakdown.bonusScore}/100`, inline: true },
      { name: '👥 User Reports', value: `${breakdown.userReportScore}/100`, inline: true },
      { name: '🎟️ Promo Integrity', value: `${breakdown.freespinScore}/100`, inline: true },
      { name: '📋 Compliance', value: `${breakdown.complianceScore}/100`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '🤝 Support', value: `${breakdown.supportScore}/100`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
    )
    .setTimestamp()
    .setFooter({ text: `${breakdown.history.length} events tracked` });

  // Add warnings/explanations
  if (explanations.length > 0) {
    embed.addFields({
      name: '📊 Analysis',
      value: explanations.slice(0, 5).join('\n'),
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

  // Score color and emoji based on trust level
  let color = 0x4ec9f0;
  let emoji = '😐';
  if (level === 'very-high') { color = 0x43b581; emoji = '⭐'; }
  else if (level === 'high') { color = 0x43b581; emoji = '✅'; }
  else if (level === 'neutral') { color = 0xfaa61a; emoji = '😐'; }
  else if (level === 'low') { color = 0xf04747; emoji = '⚠️'; }
  else if (level === 'high-risk') { color = 0xf04747; emoji = '🚨'; }

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${targetUser.username} Trust Score`)
    .setColor(color)
    .setDescription(`**${score}/100** - ${level.toUpperCase().replace('-', ' ')}`)
    .addFields(
      { name: '🎯 Behavior', value: `${breakdown.behaviorScore}/100`, inline: true },
      { name: '🔥 Tilt Indicators', value: `${breakdown.tiltIndicators}`, inline: true },
      { name: '🤝 Accountability', value: `+${breakdown.accountabilityBonus}`, inline: true },
      { name: '⚠️ Scam Flags', value: `${breakdown.scamFlags}`, inline: true },
      { name: '💬 Community', value: `${breakdown.communityReports > 0 ? '+' : ''}${breakdown.communityReports}`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
    )
    .setThumbnail(targetUser.displayAvatarURL())
    .setTimestamp()
    .setFooter({ text: `${breakdown.history.length} events tracked` });

  // Add insights
  if (explanations.length > 0) {
    embed.addFields({
      name: '📊 Insights',
      value: explanations.slice(0, 6).join('\n'),
      inline: false
    });
  }

  // Privacy note
  const isSelf = targetUser.id === interaction.user.id;
  if (!isSelf) {
    embed.addFields({
      name: 'ℹ️ Privacy',
      value: 'Trust scores are visible to help maintain community safety.',
      inline: false
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function showExplanation(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('📚 How Trust Scoring Works')
    .setColor(0x4ec9f0)
    .setDescription('TiltCheck uses two trust engines to promote safety and transparency:')
    .addFields(
      {
        name: '🎰 Casino Trust (0-100)',
        value: '**30%** Fairness consistency\n**20%** Payout reliability\n**15%** Bonus stability\n**15%** User reports\n**10%** Freespin validation\n**5%** Compliance\n**5%** Support quality',
        inline: false
      },
      {
        name: '👤 User Trust (0-100)',
        value: '**Very High (95-100)** - Excellent reputation\n**High (80-94)** - Trusted member\n**Neutral (60-79)** - Normal standing\n**Low (40-59)** - Some concerns\n**High Risk (<40)** - Serious issues',
        inline: false
      },
      {
        name: '✅ What Improves Trust',
        value: '• Using accountability tools (vault, cooldowns)\n• Completing tips and being generous\n• Good community behavior\n• Following server rules',
        inline: false
      },
      {
        name: '⚠️ What Lowers Trust',
        value: '• Tilt behavior (temporary, recovers over time)\n• Violating cooldowns\n• Confirmed scams (-15 points)\n• False accusations\n• Repeated rule breaking',
        inline: false
      },
      {
        name: '🔄 Recovery',
        value: 'Tilt indicators naturally decay at 0.5 points/hour. Trust scores can improve over time with positive behavior.',
        inline: false
      },
      {
        name: '🔒 Privacy',
        value: 'No sensitive personal data is stored. Trust is behavioral, not judgmental. Scores are not addiction assessments.',
        inline: false
      }
    )
    .setFooter({ text: 'TiltCheck Trust Engines - Fair, Transparent, Non-Punitive' });

  await interaction.reply({ embeds: [embed] });
}
