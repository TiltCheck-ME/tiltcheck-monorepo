/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Link Safety Command
 * Combines link scanning and promo management
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { suslink } from '@tiltcheck/suslink';
import { linkScanEmbed, errorEmbed, isValidUrl } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const linkCmd: Command = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link scanning for suspicious patterns')
    .addSubcommand(sub =>
      sub
        .setName('scan')
        .setDescription('Scan a URL for suspicious patterns')
        .addStringOption(opt =>
          opt.setName('url').setDescription('The URL to scan').setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'scan':
        await handleScan(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown command', ephemeral: true });
    }
  },
};

async function handleScan(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const url = interaction.options.getString('url', true);

  if (!isValidUrl(url)) {
    const embed = errorEmbed(
      'Invalid URL',
      'Please provide a valid URL starting with http:// or https://'
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  try {
    const result = await suslink.scanUrl(url, interaction.user.id);

    const embed = linkScanEmbed({
      url: result.url,
      riskLevel: result.riskLevel,
      reason: result.reason,
      scannedAt: result.scannedAt,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[SusLink] Scan error:', error);
    const embed = errorEmbed(
      'Scan Failed',
      'An error occurred while scanning the URL. Please try again.'
    );
    await interaction.editReply({ embeds: [embed] });
  }
}
