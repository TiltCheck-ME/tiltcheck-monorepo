// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { suslink } from '@tiltcheck/suslink';
import { linkScanEmbed, isValidUrl } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const scan: Command = {
  data: new SlashCommandBuilder()
    .setName('scan')
    .setDescription('Scan a link before you click the obvious skem.')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('Link to audit')
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
        .setDescription('That URL is busted. Use http:// or https:// so SusLink has something real to scan.')
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
        .setDescription('Scan bricked. Run it again.')
        .setFooter({ text: 'Made for Degens. By Degens.' });
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
