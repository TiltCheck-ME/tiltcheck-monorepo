// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * Intervention Toggle Command
 * Opt-in/out of voice-channel safety moves.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const intervene: Command = {
  data: new SlashCommandBuilder()
    .setName('intervene')
    .setDescription('Opt-in or out of voice channel safety moves.')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Would you like a voice move on critical tilt?').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const isEnabled = interaction.options.getBoolean('enabled') || false;

    const embed = new EmbedBuilder()
      .setColor(isEnabled ? 0x22d3a6 : 0xef4444)
      .setTitle(`INTERVENTION ${isEnabled ? 'ACTIVE' : 'OFF'}`)
      .setDescription(isEnabled 
        ? 'If telemetry goes red, you will be moved to the voice channel and your Tether gets pinged.' 
        : 'On critical tilt, only a DM goes out to you and your Tether. No voice move.')
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed] });
  },
};
