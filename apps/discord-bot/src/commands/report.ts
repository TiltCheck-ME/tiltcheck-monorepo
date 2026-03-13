/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fetch from 'node-fetch';

export default {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Drop the hammer. Log a disciplinary action on a degen.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => 
      option.setName('target')
        .setDescription('Who\'s the problem?')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('action')
        .setDescription('What\'s the verdict?')
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
        .setDescription('What\'s the damage? Be specific.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('evidence')
        .setDescription('Proof or it didn\'t happen (link to screenshot/message)')
        .setRequired(false)),

  async execute(interaction: any) {
    const target = interaction.options.getUser('target');
    const action = interaction.options.getString('action');
    const reason = interaction.options.getString('reason');
    const evidence = interaction.options.getString('evidence');
    const moderator = interaction.user;

    await interaction.deferReply({ ephemeral: true });

    try {
      const backendUrl = process.env.BACKEND_URL;
      const internalApiSecret = process.env.INTERNAL_API_SECRET;

      if (!backendUrl || !internalApiSecret) {
        throw new Error('Backend or API secret not configured. Yell at an admin.');
      }

      const response = await fetch(`${backendUrl}/api/mod/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${internalApiSecret}`,
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
        throw new Error(`API shat the bed: ${response.statusText}`);
      }

      const result = await response.json();

      await interaction.editReply({
        content: `**Done. The verdict is in.**
**Offender:** ${target.tag}
**Action:** ${action.toUpperCase().replace('_', ' ')}
**Case ID:** \`${result.id || 'Pending...'}\``
      });

    } catch (error) {
      console.error('Report command error:', error);
      await interaction.editReply({
        content: `**Report failed.** Something is f***ed. Yell at an admin.
Error: ${error instanceof Error ? error.message : 'Unknown sh**'}`,
      });
    }
  }
};
