/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { freespinscan } from '@tiltcheck/freespinscan';
import { successEmbed, errorEmbed, infoEmbed } from '@tiltcheck/discord-utils';

export const submitpromo = {
  data: new SlashCommandBuilder()
    .setName('submitpromo')
    .setDescription('Submit a free spin or promo link for review')
    .addStringOption(option =>
      option.setName('url').setDescription('Promo URL').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('bonustype').setDescription('Bonus type (e.g., free_spins, deposit)').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('casino').setDescription('Casino name').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('notes').setDescription('Additional notes (optional)').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
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
    } catch (error: any) {
      await interaction.reply({ 
        embeds: [errorEmbed('Submission failed', error.message)],
        ephemeral: true 
      });
    }
  },
};

export const approvepromo = {
  data: new SlashCommandBuilder()
    .setName('approvepromo')
    .setDescription('Approve a pending promo submission (mods only)')
    .addIntegerOption(option =>
      option.setName('id').setDescription('Submission ID').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const submissionId = interaction.options.getInteger('id', true);
    const modId = interaction.user.id;

    try {
      const submission = await freespinscan.approveSubmission(submissionId, modId);
      void submission;
      await interaction.reply({ 
        embeds: [successEmbed('Promo approved', `Submission ${submissionId} has been approved`)] 
      });
    } catch (error: any) {
      await interaction.reply({ 
        embeds: [errorEmbed('Approval failed', error.message)],
        ephemeral: true 
      });
    }
  },
};

export const denypromo = {
  data: new SlashCommandBuilder()
    .setName('denypromo')
    .setDescription('Deny a pending promo submission (mods only)')
    .addIntegerOption(option =>
      option.setName('id').setDescription('Submission ID').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for denial (optional)').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const submissionId = interaction.options.getInteger('id', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const modId = interaction.user.id;

    try {
      const submission = await freespinscan.denySubmission(submissionId, modId, reason);
      void submission;
      await interaction.reply({ 
        embeds: [successEmbed('Promo denied', `Submission ${submissionId} has been denied`)] 
      });
    } catch (error: any) {
      await interaction.reply({ 
        embeds: [errorEmbed('Denial failed', error.message)],
        ephemeral: true 
      });
    }
  },
};

export const pendingpromos = {
  data: new SlashCommandBuilder()
    .setName('pendingpromos')
    .setDescription('View pending promo submissions (mods only)'),
  async execute(interaction: ChatInputCommandInteraction) {
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
      .setDescription(pending.map((s: any) => 
        `**ID ${s.id}**: ${s.casino} - ${s.bonusType}\n` +
        `URL: ${s.url}\n` +
        `Risk: ${s.suslinkScore || 'N/A'}\n` +
        `Submitted by: <@${s.userId}>\n`
      ).join('\n---\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
