/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { findCasinoByDomain } from '@tiltcheck/db';
import type { Command } from '../types.js';

export const casino: Command = {
  data: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Get trust and fairness data for a casino')
    .addStringOption(option =>
      option
        .setName('domain')
        .setDescription('Casino domain (e.g., stake.com)')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const domain = interaction.options.getString('domain', true).toLowerCase();

    try {
      const data = await findCasinoByDomain(domain);

      if (!data) {
        await interaction.editReply({
          content: `[DATA NOT FOUND] No data found for **${domain}**.\n\nTry domains like \`stake.com\`, \`rollbit.com\`, or \`duelbits.com\`.`
        });
        return;
      }

      const metadata = (data.metadata || {}) as any;
      const status = metadata.status || 'unknown';
      const claimed_rtp = metadata.claimed_rtp;
      const verified_rtp = metadata.verified_rtp;
      const license_info = metadata.license_info;

      const embed = new EmbedBuilder()
        .setTitle(`[CASINO TRUST] ${data.name} (${data.domain})`)
        .setColor(status === 'active' ? 0x00FF00 : 0xFF0000)
        .setDescription(`Trust and fairness data for ${data.name}.`)
        .addFields(
          { name: 'Status', value: String(status).toUpperCase(), inline: true },
          { name: 'Claimed RTP', value: claimed_rtp ? `${claimed_rtp}%` : 'N/A', inline: true },
          { name: 'Verified RTP', value: verified_rtp ? `${verified_rtp}%` : 'N/A', inline: true },
        );

      if (license_info) {
        const license = typeof license_info === 'string' 
          ? JSON.parse(license_info) 
          : license_info;
        
        const licenseDetails = Object.entries(license)
          .map(([k, v]) => `• **${k}:** ${v}`)
          .join('\n');
          
        embed.addFields({ name: '[LICENSE INFO]', value: licenseDetails || 'No details', inline: false });
      }

      embed.setFooter({ text: 'TiltCheck Trust Engine • Verified Data' });
      embed.setTimestamp(new Date(data.updated_at));

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Casino] Error:', error);
      await interaction.editReply({ content: '[ERROR] Failed to fetch casino data.' });
    }
  }
};