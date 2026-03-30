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
    .setName('reputation')
    .setDescription('[EDGE EQUALIZER] View casino and user reputation scores.')
    .addSubcommand(sub =>
      sub.setName('casino')
        .setDescription('Check a casino reputation')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Casino name or domain (e.g., stake.com)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('user')
        .setDescription('Check a user reputation score')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to check (leave empty for yourself)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('explain')
        .setDescription('Learn how the Transparency protocol works')
    ) as SlashCommandBuilder,

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
        content: 'Couldn\'t pull that data right now. The engine\'s having a moment — try again in a sec.',
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
  let color;
  if (score >= 80) color = 0x43b581; // Green (good)
  else if (score >= 60) color = 0xfaa61a; // Yellow (ok)
  else color = 0xf04747; // Red (bad)

  const embed = new EmbedBuilder()
    .setTitle(`[GAME] ${casinoName} REPUTATION`)
    .setColor(color)
    .setDescription(`**TRUST SCORE: ${score}/100**`)
    .addFields(
      { name: '[SCALES] Fairness', value: `${breakdown.fairnessScore}/100`, inline: true },
      { name: '[CASH] Payout', value: `${breakdown.payoutScore}/100`, inline: true },
      { name: '[GIFT] Bonus', value: `${breakdown.bonusScore}/100`, inline: true },
      { name: '[USERS] User Reports', value: `${breakdown.userReportScore}/100`, inline: true },
      { name: '[TICKET] Promo Integrity', value: `${breakdown.freespinScore}/100`, inline: true },
      { name: '[LIST] Compliance', value: `${breakdown.complianceScore}/100`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '[HANDS] Support', value: `${breakdown.supportScore}/100`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
    )
    .setTimestamp()
    .setFooter({ text: `${breakdown.history.length} events tracked — the math doesn't judge you. Neither do we.` });

  // Add warnings/explanations
  if (explanations.length > 0) {
    embed.addFields({
      name: '[STATS] Analysis',
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

  // Score color and symbol based on trust level
  let color = 0x4ec9f0;
  let symbol = '[NEUTRAL]';
  if (level === 'very-high') { color = 0x43b581; symbol = '[ELITE]'; }
  else if (level === 'high') { color = 0x43b581; symbol = '[SAFE]'; }
  else if (level === 'neutral') { color = 0xfaa61a; symbol = '[NEUTRAL]'; }
  else if (level === 'low') { color = 0xf04747; symbol = '[RISK]'; }
  else if (level === 'high-risk') { color = 0xf04747; symbol = '[DANGER]'; }

  const embed = new EmbedBuilder()
    .setTitle(`${symbol} ${targetUser.username} [AUDIT]`)
    .setColor(color)
    .setDescription(`**REPUTATION: ${score}/100** - ${level.toUpperCase().replace('-', ' ')}`)
    .addFields(
      { name: '[TARGET] Behavior', value: `${breakdown.behaviorScore}/100`, inline: true },
      { name: '[ALERT] Audit Signals', value: `${breakdown.tiltIndicators}`, inline: true },
      { name: '[HANDS] Accountability', value: `+${breakdown.accountabilityBonus}`, inline: true },
      { name: '[RISK] Scam Flags', value: `${breakdown.scamFlags}`, inline: true },
      { name: '[COMM] Community', value: `${breakdown.communityReports > 0 ? '+' : ''}${breakdown.communityReports}`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
    )
    .setThumbnail(targetUser.displayAvatarURL())
    .setTimestamp()
    .setFooter({ text: `${breakdown.history.length} events tracked` });

  // Add insights
  if (explanations.length > 0) {
    embed.addFields({
      name: '[STATS] Insights',
      value: explanations.slice(0, 6).join('\n'),
      inline: false
    });
  }

  // Privacy note
  const isSelf = targetUser.id === interaction.user.id;
  if (!isSelf) {
    embed.addFields({
      name: '👁️ Heads up',
      value: 'This score is visible to others. We do that to keep the community honest — not to put anyone on blast.',
      inline: false
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function showExplanation(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('[EDGE EQUALIZER] THE TRANSPARENCY PROTOCOL')
    .setColor(0x4ec9f0)
    .setDescription('TiltCheck uses automated audits and math-based verification to monitor the arena:')
    .addFields(
      {
        name: '[GAME] Casino Trust (0-100)',
        value: '**30%** Fairness consistency\n**20%** Payout reliability\n**15%** Bonus stability\n**15%** User reports\n**10%** Freespin validation\n**5%** Compliance\n**5%** Support quality',
        inline: false
      },
      {
        name: '[USER] User Trust (0-100)',
        value: '**Very High (95-100)** - Excellent reputation\n**High (80-94)** - Trusted member\n**Neutral (60-79)** - Normal standing\n**Low (40-59)** - Some concerns\n**High Risk (<40)** - Serious issues',
        inline: false
      },
      {
        name: '[DONE] What Improves Trust',
        value: '• Using accountability tools (vault, tethers, status audits)\n• Completing tips and being generous\n• Good community behavior\n• Following server rules',
        inline: false
      },
      {
        name: '[RISK] What Lowers Trust',
        value: '• Tilt behavior (temporary, recovers over time)\n• Ignoring Tether alerts\n• Confirmed scams (-15 points)\n• False accusations\n• Repeated rule breaking',
        inline: false
      },
      {
        name: '[TIME] Recovery',
        value: 'Audit signals naturally decay at 0.5 points/hour. Trust scores can improve over time with positive behavior.',
        inline: false
      },
      {
        name: '[INFO] Privacy',
        value: 'No sensitive personal data is stored. Trust is behavioral, not judgmental. Scores are not addiction assessments.',
        inline: false
      }
    )
    .setFooter({ text: 'TiltCheck Edge Equalizer - Fair, Transparent, Non-Punitive' });

  await interaction.reply({ embeds: [embed] });
}

