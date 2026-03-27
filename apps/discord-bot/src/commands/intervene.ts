/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Intervention Toggle Command
 * Opt-in/out of voice-channel safety moves.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const intervene: Command = {
  data: new SlashCommandBuilder()
    .setName('intervene')
    .setDescription('[TETHER TRAY] Opt-in or out of voice channel safety moves.')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Would you like a voice move on critical tilt?').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const isEnabled = interaction.options.getBoolean('enabled') || false;

    const embed = new EmbedBuilder()
      .setColor(isEnabled ? 0x00FF00 : 0xFF4500)
      .setTitle(`📡 [INTERVENTION] ${isEnabled ? 'ACTIVE' : 'DEACTIVATED'}`)
      .setDescription(isEnabled 
        ? 'If telemetry goes red, I will **move you to the voice channel** and ping your **Tether**.' 
        : 'On critical tilt, I will only **DM you and your Tether**. No voice move will occur.')
      .setFooter({ text: 'TiltCheck: YOUR CHOICE. YOUR AUDIT. YOUR BAG.' });

    await interaction.reply({ embeds: [embed] });
  },
};
