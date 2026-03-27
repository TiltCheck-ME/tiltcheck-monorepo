/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Profit Goal Command
 * Set session exit milestones.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const goal: Command = {
  data: new SlashCommandBuilder()
    .setName('goal')
    .setDescription('[PROFIT SECURE] Set your session exit milestone.')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Profit Target (USD/SOL equivalent)').setRequired(true))
    .addBooleanOption(opt => opt.setName('total_balance').setDescription('Is this a total balance goal?').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('amount');
    const isTotal = interaction.options.getBoolean('total_balance') || false;

    const embed = new EmbedBuilder()
      .setColor(0x00CED1)
      .setTitle('💰 [PROFIT SECURE] TARGET SET')
      .setDescription(`Target Audit: **$${amount}** ${isTotal ? '(Total Balance)' : '(Profit)'}.\n\nWhen you hit this, I'll notify your Tether to come celebrate while you SECURE THE BAG.`)
      .setFooter({ text: 'Edge Equalizer: DONT OVERRUN THE MATH.' });

    await interaction.reply({ embeds: [embed] });
  },
};
