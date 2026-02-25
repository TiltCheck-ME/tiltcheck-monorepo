/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '@tiltcheck/database';
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
      const data = await db.getCasino(domain);

      if (!data) {
        await interaction.editReply({
          content: `❌ No data found for **${domain}**.\n\nTry domains like \`stake.com\`, \`rollbit.com\`, or \`duelbits.com\`.`
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🎰 ${data.name} (${data.domain})`)
        .setColor(data.status === 'active' ? 0x00FF00 : 0xFF0000)
        .setDescription(`Trust and fairness data for ${data.name}.`)
        .addFields(
          { name: 'Status', value: data.status.toUpperCase(), inline: true },
          { name: 'Claimed RTP', value: data.claimed_rtp ? `${data.claimed_rtp}%` : 'N/A', inline: true },
          { name: 'Verified RTP', value: data.verified_rtp ? `${data.verified_rtp}%` : 'N/A', inline: true },
        );

      if (data.license_info) {
        const license = typeof data.license_info === 'string' 
          ? JSON.parse(data.license_info) 
          : data.license_info;
        
        const licenseDetails = Object.entries(license)
          .map(([k, v]) => `• **${k}:** ${v}`)
          .join('\n');
          
        embed.addFields({ name: '📜 License Info', value: licenseDetails || 'No details', inline: false });
      }

      embed.setFooter({ text: 'TiltCheck Trust Engine • Verified Data' });
      embed.setTimestamp(new Date(data.updated_at));

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Casino] Error:', error);
      await interaction.editReply({ content: '❌ Failed to fetch casino data.' });
    }
  }
};