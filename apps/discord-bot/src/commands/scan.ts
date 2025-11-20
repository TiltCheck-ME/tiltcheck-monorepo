/**
 * Scan Command
 * 
 * Scans a URL for suspicious patterns using SusLink module.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { suslink } from '@tiltcheck/suslink';
import { linkScanEmbed, errorEmbed, isValidUrl } from '@tiltcheck/discord-utils';
import type { Command } from '../types';

export const scan: Command = {
  data: new SlashCommandBuilder()
    .setName('scan')
    .setDescription('Scan a URL for suspicious patterns')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('The URL to scan')
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const url = interaction.options.getString('url', true);

    // Validate URL
    if (!isValidUrl(url)) {
      const embed = errorEmbed(
        'Invalid URL',
        'Please provide a valid URL starting with http:// or https://'
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    try {
      // Scan the URL using SusLink
      const result = await suslink.scanUrl(url, interaction.user.id);

      // Create embed with results
      const embed = linkScanEmbed({
        url: result.url,
        riskLevel: result.riskLevel,
        reason: result.reason,
        scannedAt: result.scannedAt,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[ScanCommand] Error:', error);
      
      const embed = errorEmbed(
        'Scan Failed',
        'An error occurred while scanning the URL. Please try again.'
      );
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
