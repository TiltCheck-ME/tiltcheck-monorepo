/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db } from '@tiltcheck/database';
import type { Command } from '../types.js';

export const casino: Command = {
  data: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Uncover the truth about a casino. Are they legit or just another sh**?')
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
          content: `❌ Well, sh**. Couldn't find any data for **${domain}**. Maybe try a real casino, or check your spelling, degen. Example: \`stake.com\`, \`rollbit.com\`.\n\n(Unless it's an outright sh**, then we won't have data for it, obviously.)`
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🎰 ${data.name} (${data.domain}) - The Brutal Truth`)
        .setColor(data.status === 'active' ? 0x00FF00 : 0xFF0000)
        .setDescription(`Don't gamble blind. Here's what we know about ${data.name}'s shananigans.`)
        .addFields(
          { name: 'Status', value: data.status === 'active' ? '🟢 Active (for now)' : '🔴 Suspect (avoid like the plague)', inline: true },
          { name: 'Claimed RTP', value: data.claimed_rtp ? `${data.claimed_rtp}%` : 'N/A (They\'re hiding something)', inline: true },
          { name: 'Verified RTP', value: data.verified_rtp ? `${data.verified_rtp}%` : 'N/A (Unverified claim = Red flag)', inline: true },
        );

      if (data.license_info) {
        const license = typeof data.license_info === 'string' 
          ? JSON.parse(data.license_info) 
          : data.license_info;
        
        const licenseDetails = Object.entries(license)
          .map(([k, v]) => `• **${k}:** ${v}`)
          .join('\n');
          
        embed.addFields({ name: '📜 License (The Paperwork)', value: licenseDetails || 'Barely hanging on to a piece of paper, probably offshore.', inline: false });
      }

      embed.setFooter({ text: 'TiltCheck Trust Engine • We don\'t trust them, so you don\'t have to.' });
      embed.setTimestamp(new Date(data.updated_at));

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Casino] Error:', error);
      await interaction.editReply({ content: '❌ Our system just glitched trying to uncover the truth. Try again, degen.' });
    }
  }
};