/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getAlertService } from '../services/alert-service.js';
import type { Command } from '../types.js';

const SUPPORT_CHANNEL_ID = '1437295074856927363';
const OWNER_MENTION = '<@jmenichole>';

export const support: Command = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Yell into the void (request help from an admin).')
    .addStringOption(option =>
      option.setName('topic').setDescription('What\'s broken now?').setRequired(false)
    )
    .addStringOption(option =>
      option.setName('message').setDescription('Give us the details. Or don\'t. Your call.').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const topic = interaction.options.getString('topic') || 'General F***-up';
    const message = interaction.options.getString('message') || '';

    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'Don\'t slide into my DMs. Use this in a real server.', ephemeral: true });
      return;
    }
    const channel = guild.channels.cache.get(SUPPORT_CHANNEL_ID);
    if (!channel || !('send' in channel)) {
      await interaction.reply({ content: 'Support channel is missing. Yell at an admin to fix their sh**.', ephemeral: true });
      return;
    }

    const supportMsg = `**SUPPORT TICKET** from <@${interaction.user.id}> for ${OWNER_MENTION}
**Topic:** ${topic}
**Message:** ${message || 'No details. They probably just f***ed up.'}`;
    await (channel as any).send({ content: supportMsg });

    const alertService = getAlertService();
    if (alertService) {
      try {
        await alertService.postSupportTicket({
          userId: interaction.user.id,
          username: interaction.user.username,
          topic,
          message: message || '(No additional details provided)',
          status: 'open',
        });
      } catch (error) {
        console.error('[Support] Error posting support ticket alert:', error);
      }
    }

    await interaction.reply({ content: 'Fine. I sent your plea for help to the admins. Don\'t hold your breath.', ephemeral: true });
  },
};
