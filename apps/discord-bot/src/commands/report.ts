/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fetch from 'node-fetch';

export default {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Log a disciplinary action or report a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The user to report')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Type of action taken')
        .setRequired(true)
        .addChoices(
          { name: 'Warning', value: 'warn' },
          { name: 'Mute', value: 'mute' },
          { name: 'Kick', value: 'kick' },
          { name: 'Ban', value: 'ban' },
          { name: 'Flag Scammer', value: 'flag_scammer' },
          { name: 'Flag Rain Farmer', value: 'flag_farmer' }
        ))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the action')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('evidence')
        .setDescription('Link to screenshot or message (optional)')
        .setRequired(false)),

  async execute(interaction: any) {
    const target = interaction.options.getUser('target');
    const action = interaction.options.getString('action');
    const reason = interaction.options.getString('reason');
    const evidence = interaction.options.getString('evidence');
    const moderator = interaction.user;

    // Defer reply since DB operations might take a moment
    await interaction.deferReply({ ephemeral: true });

    try {
      // Send to your backend API which handles the DB insertion
      const response = await fetch(`${process.env.BACKEND_URL}/api/mod/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DISCORD_TOKEN}` // Secure server-to-server comms
        },
        body: JSON.stringify({
          targetId: target.id,
          targetUsername: target.username,
          moderatorId: moderator.id,
          actionType: action,
          reason,
          evidenceUrl: evidence
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const result = await response.json();

      await interaction.editReply({
        content: `✅ **Report Logged Successfully**\n\n**Target:** ${target.tag}\n**Action:** ${action.toUpperCase().replace('_', ' ')}\n**Case ID:** \`${result.id || 'Pending'}\``
      });

    } catch (error) {
      console.error('Report command error:', error);
      await interaction.editReply({
        content: `❌ Failed to log report. Please check the backend connection.`
      });
    }
  }
};