/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * SusLink Command
 * Combines link scanning and promo management
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { suslink } from '@tiltcheck/suslink';
import { freespinscan } from '@tiltcheck/freespinscan';
import { linkScanEmbed, errorEmbed, successEmbed, infoEmbed, isValidUrl } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const suslinkCmd: Command = {
  data: new SlashCommandBuilder()
    .setName('suslink')
    .setDescription('Link scanning & promo management')
    .addSubcommand(sub =>
      sub
        .setName('scan')
        .setDescription('Scan a URL for suspicious patterns')
        .addStringOption(opt =>
          opt.setName('url').setDescription('The URL to scan').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('submit')
        .setDescription('Submit a free spin or promo link for review')
        .addStringOption(opt =>
          opt.setName('url').setDescription('Promo URL').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('bonustype').setDescription('Bonus type (e.g., free_spins, deposit)').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('casino').setDescription('Casino name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('notes').setDescription('Additional notes (optional)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('approve')
        .setDescription('Approve a pending promo submission (mods only)')
        .addIntegerOption(opt =>
          opt.setName('id').setDescription('Submission ID').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('deny')
        .setDescription('Deny a pending promo submission (mods only)')
        .addIntegerOption(opt =>
          opt.setName('id').setDescription('Submission ID').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for denial (optional)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('pending')
        .setDescription('View pending promo submissions (mods only)')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'scan':
        await handleScan(interaction);
        break;
      case 'submit':
        await handleSubmit(interaction);
        break;
      case 'approve':
        await handleApprove(interaction);
        break;
      case 'deny':
        await handleDeny(interaction);
        break;
      case 'pending':
        await handlePending(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown command', ephemeral: true });
    }
  },
};

async function handleScan(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const url = interaction.options.getString('url', true);

  if (!isValidUrl(url)) {
    const embed = errorEmbed(
      'Invalid URL',
      'Please provide a valid URL starting with http:// or https://'
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  try {
    const result = await suslink.scanUrl(url, interaction.user.id);

    const embed = linkScanEmbed({
      url: result.url,
      riskLevel: result.riskLevel,
      reason: result.reason,
      scannedAt: result.scannedAt,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[SusLink] Scan error:', error);
    const embed = errorEmbed(
      'Scan Failed',
      'An error occurred while scanning the URL. Please try again.'
    );
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleSubmit(interaction: ChatInputCommandInteraction) {
  const url = interaction.options.getString('url', true);
  const bonusType = interaction.options.getString('bonustype', true);
  const casino = interaction.options.getString('casino', true);
  const notes = interaction.options.getString('notes') || '';
  const userId = interaction.user.id;

  try {
    const submission = await freespinscan.submitPromo({ userId, url, bonusType, notes, casino });
    
    if (submission.status === 'blocked') {
      await interaction.reply({ 
        embeds: [errorEmbed('Submission blocked', submission.blockReason || 'This link is blocked')],
        ephemeral: true 
      });
    } else {
      await interaction.reply({ 
        embeds: [successEmbed('Promo submitted', `Your promo has been submitted for review (ID: ${submission.id})`)] 
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await interaction.reply({ 
      embeds: [errorEmbed('Submission failed', message)],
      ephemeral: true 
    });
  }
}

async function handleApprove(interaction: ChatInputCommandInteraction) {
  const submissionId = interaction.options.getInteger('id', true);
  const modId = interaction.user.id;

  try {
    const submission = await freespinscan.approveSubmission(submissionId, modId);
    void submission;
    await interaction.reply({ 
      embeds: [successEmbed('Promo approved', `Submission ${submissionId} has been approved`)] 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await interaction.reply({ 
      embeds: [errorEmbed('Approval failed', message)],
      ephemeral: true 
    });
  }
}

async function handleDeny(interaction: ChatInputCommandInteraction) {
  const submissionId = interaction.options.getInteger('id', true);
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const modId = interaction.user.id;

  try {
    const submission = await freespinscan.denySubmission(submissionId, modId, reason);
    void submission;
    await interaction.reply({ 
      embeds: [successEmbed('Promo denied', `Submission ${submissionId} has been denied`)] 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await interaction.reply({ 
      embeds: [errorEmbed('Denial failed', message)],
      ephemeral: true 
    });
  }
}

async function handlePending(interaction: ChatInputCommandInteraction) {
  const pending = freespinscan.getSubmissions('pending');
  
  if (pending.length === 0) {
    await interaction.reply({ 
      embeds: [infoEmbed('No pending promos', 'All submissions have been reviewed')],
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Pending Promo Submissions')
    .setColor(0xFFA500)
    .setDescription(pending.map((s: { id: number; casino: string; bonusType: string; url: string; suslinkScore?: string; userId: string }) => 
      `**ID ${s.id}**: ${s.casino} - ${s.bonusType}\n` +
      `URL: ${s.url}\n` +
      `Risk: ${s.suslinkScore || 'N/A'}\n` +
      `Submitted by: <@${s.userId}>\n`
    ).join('\n---\n'))
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
