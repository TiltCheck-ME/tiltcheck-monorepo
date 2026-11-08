// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
/**
 * Intervention Toggle Command
 * Opt-in/out of voice-channel safety moves.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { getOrCreateUserPreferences, saveUserPreferences } from '../handlers/onboarding.js';

export const intervene: Command = {
  data: new SlashCommandBuilder()
    .setName('intervene')
    .setDescription('Toggle the hard brake for critical tilt sessions.')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Let TiltCheck move you into accountability VC on critical tilt.').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const isEnabled = interaction.options.getBoolean('enabled') || false;
    const prefs = getOrCreateUserPreferences(interaction.user.id);
    prefs.voiceInterventionEnabled = isEnabled;
    saveUserPreferences(prefs);

    const embed = new EmbedBuilder()
      .setColor(isEnabled ? 0x22d3a6 : 0xef4444)
      .setTitle(`INTERVENTION ${isEnabled ? 'ACTIVE' : 'OFF'}`)
      .setDescription(isEnabled 
        ? 'Hard brake is live. On critical tilt, TiltCheck DMs you, pings your buddy, and moves you if you are already in voice.'
        : 'Auto-move is off. You still get the DM and accountability ping — just no VC shove.')
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed] });
  },
};
