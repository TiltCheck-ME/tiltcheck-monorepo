/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getAlertService } from '../services/alert-service.js';
import type { Command } from '../types.js';

const SUPPORT_CHANNEL_ID = '1437295074856927363';
const OWNER_MENTION = '<@jmenichole>';

export const support: Command = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Request help from TiltCheck support')
    .addStringOption(option =>
      option.setName('topic').setDescription('What do you need help with?').setRequired(false)
    )
    .addStringOption(option =>
      option.setName('message').setDescription('Describe your issue (optional)').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const topic = interaction.options.getString('topic') || 'General Support';
    const message = interaction.options.getString('message') || '';

    // Send a message in the support channel pinging the owner
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }
    const channel = guild.channels.cache.get(SUPPORT_CHANNEL_ID);
    if (!channel || !('send' in channel)) {
      await interaction.reply({ content: '❌ Support channel not found.', ephemeral: true });
      return;
    }

    // Post to support channel via traditional message
    const supportMsg = `🔔 **Support Request** from <@${interaction.user.id}> ${OWNER_MENTION}\n📌 **Topic:** ${topic}${message ? `\n💬 **Message:** ${message}` : ''}`;
    await (channel as any).send({ content: supportMsg });

    // Also post to support alerts channel via AlertService
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

    await interaction.reply({ content: '✅ Support request sent! Someone will be with you soon.', ephemeral: true });
  },
};
