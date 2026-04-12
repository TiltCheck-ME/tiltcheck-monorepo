// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { trustEngines } from '@tiltcheck/trust-engines';

export const trustDashboard: Command = {
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('Audit casino and user rep scores.')
    .addSubcommand(sub =>
      sub.setName('casino')
        .setDescription('Check a casino trust score')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Casino name or domain to audit (example: stake.com)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('user')
        .setDescription('Check a user reputation score')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to audit. Leave empty to check yourself.')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('explain')
        .setDescription('See how the Transparency protocol scores things')
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
         content: 'Trust data pull failed. Run it again.',
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
    .setTitle(`${casinoName.toUpperCase()} — TRUST AUDIT`)
    .setColor(color)
    .setDescription(`**TRUST SCORE: ${score}/100**`)
    .addFields(
      { name: 'Financial Payouts', value: `${breakdown.financialPayouts}/100`, inline: true },
      { name: 'Fairness', value: `${breakdown.fairnessTransparency}/100`, inline: true },
      { name: 'Promotional', value: `${breakdown.promotionalHonesty}/100`, inline: true },
      { name: 'Operations', value: `${breakdown.operationalSupport}/100`, inline: true },
      { name: 'Reputation', value: `${breakdown.communityReputation}/100`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'Made for Degens. By Degens.' });

  // Add warnings/explanations
  if (explanations.length > 0) {
    embed.addFields({
       name: 'Why it scored like this',
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
    .setTitle(`${targetUser.username.toUpperCase()} — REPUTATION AUDIT`)
    .setColor(color)
    .setDescription(`**REPUTATION: ${score}/100** - ${level.toUpperCase().replace('-', ' ')}`)
    .addFields(
      { name: 'Behavior', value: `${breakdown.behaviorScore}/100`, inline: true },
      { name: 'Audit Signals', value: `${breakdown.tiltIndicators}`, inline: true },
      { name: 'Accountability', value: `+${breakdown.accountabilityBonus}`, inline: true },
      { name: 'Scam Flags', value: `${breakdown.scamFlags}`, inline: true },
      { name: 'Community', value: `${breakdown.communityReports > 0 ? '+' : ''}${breakdown.communityReports}`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
    )
    .setThumbnail(targetUser.displayAvatarURL())
    .setTimestamp()
    .setFooter({ text: 'Made for Degens. By Degens.' });

  // Add insights
  if (explanations.length > 0) {
    embed.addFields({
       name: 'What moved the score',
      value: explanations.slice(0, 6).join('\n'),
      inline: false
    });
  }

  // Privacy note
  const isSelf = targetUser.id === interaction.user.id;
  if (!isSelf) {
    embed.addFields({
      name: 'HEADS UP',
      value: 'This score is public. Community stays honest that way.',
      inline: false
    });
  }

  await interaction.reply({ embeds: [embed] });
}

async function showExplanation(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('THE TRANSPARENCY PROTOCOL')
    .setColor(0x4ec9f0)
     .setDescription('TiltCheck scores the arena with audits, receipts, and math — not casino vibes:')
    .addFields(
      {
        name: 'Casino Trust (0-100)',
        value: '**30%** Fairness consistency\n**20%** Payout reliability\n**15%** Bonus stability\n**15%** User reports\n**10%** Freespin validation\n**5%** Compliance\n**5%** Support quality',
        inline: false
      },
      {
        name: 'User Trust (0-100)',
         value: '**Very High (95-100)** - rock solid\n**High (80-94)** - trusted\n**Neutral (60-79)** - normal read\n**Low (40-59)** - sus behavior showing\n**High Risk (<40)** - big yikes',
        inline: false
      },
      {
        name: 'What Improves Trust',
         value: '- Using accountability tools instead of degening blind\n- Completing tips and paying what you said you would\n- Not acting like a menace in the community\n- Following server rules without needing babysitting',
        inline: false
      },
      {
        name: 'What Lowers Trust',
         value: '- Tilt behavior spikes (temporary, but still ugly)\n- Ignoring Tether alerts\n- Confirmed scams (-15 points)\n- False accusations\n- Repeated rule breaking',
        inline: false
      },
      {
        name: 'Recovery',
         value: 'Audit signals decay at 0.5 points per hour. Stop acting cooked long enough and the score can recover.',
        inline: false
      },
      {
        name: 'Privacy',
         value: 'No sensitive personal data is stored. This is behavior scoring, not armchair diagnosis.',
        inline: false
      }
    )
    .setFooter({ text: 'Made for Degens. By Degens.' });

  await interaction.reply({ embeds: [embed] });
}

