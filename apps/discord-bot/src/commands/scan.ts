/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Scan Command
 * 
 * Scans a URL for suspicious patterns using SusLink module.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { suslink } from '@tiltcheck/suslink';
import { isValidUrl } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const scan: Command = {
  data: new SlashCommandBuilder()
    .setName('scan')
    .setDescription('Scan a sketchy link before it drains your wallet.')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('The sketchy URL you\'re about to click')
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const url = interaction.options.getString('url', true);

    if (!isValidUrl(url)) {
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('That\'s not a f***ing URL, ape.')
        .setDescription('I need a real URL. You know, `http://` or `https://`. Try again, but this time with a real link.');
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      const result = await suslink.scanUrl(url, interaction.user.id);

      let color = 0x00FF00; // Green
      if (result.riskLevel === 'medium') color = 0xFFD700; // Yellow
      if (result.riskLevel === 'high') color = 0xFF0000; // Red

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Scan Result: ${result.riskLevel.toUpperCase()}`)
        .setDescription(`**URL:** ${result.url}`)
        .addFields({ name: 'The Verdict', value: result.reason || 'Looks clean, but don\'t trust anyone.' })
        .setFooter({ text: `Scanned at: ${new Date(result.scannedAt).toISOString()}` });
      
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('[ScanCommand] Error:', error);
      
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('Scan F***ed. Try Again.')
        .setDescription('Something went wrong on our end. The link might be dead, or our scanner is just having a moment. Blame the blockchain.');

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
