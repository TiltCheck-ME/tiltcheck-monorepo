// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { suslink } from '@tiltcheck/suslink';
import { linkScanEmbed, isValidUrl } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

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
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('INVALID URL')
        .setDescription('That is not a valid URL. Must start with http:// or https://')
        .setFooter({ text: 'Made for Degens. By Degens.' });
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
      
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('SCAN FAILED')
        .setDescription('Scan did not complete. Try again.')
        .setFooter({ text: 'Made for Degens. By Degens.' });
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
