/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Support Command
 * DMs the user a support ticket confirmation and notifies the owner.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

const OWNER_ID = process.env.BOT_OWNER_ID || '1472601571496951932';

export const support: Command = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Something broken? Flag it and we\'ll look at it.')
    .addStringOption(option =>
      option.setName('topic').setDescription('What\'s the issue?').setRequired(false)
    )
    .addStringOption(option =>
      option.setName('message').setDescription('Any extra context?').setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const topic = interaction.options.getString('topic') || 'General';
    const message = interaction.options.getString('message') || '';

    // Confirm to the user
    const userEmbed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('SUPPORT REQUEST LOGGED')
      .setDescription(
        `Got it. Your ticket is in.\n\n` +
        `**Topic:** ${topic}${message ? `\n**Details:** ${message}` : ''}\n\n` +
        `Someone will follow up shortly. If it's urgent, ping directly in the server.`
      )
      .setFooter({ text: "We actually read these." });

    await interaction.reply({ embeds: [userEmbed], ephemeral: true });

    // DM the owner
    try {
      const owner = await interaction.client.users.fetch(OWNER_ID);
      await owner.send(
        `**Support Request** from ${interaction.user.username} (\`${interaction.user.id}\`)\n` +
        `**Topic:** ${topic}\n` +
        (message ? `**Message:** ${message}\n` : '') +
        `**Server:** ${interaction.guild?.name || 'DM'}`
      );
    } catch (err) {
      console.error('[Support] Failed to DM owner:', err);
    }
  },
};
