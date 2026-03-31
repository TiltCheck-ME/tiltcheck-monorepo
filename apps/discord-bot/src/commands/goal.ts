/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Redeem Goal Command
 * Set starting balance and redeem point for a session.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const goal: Command = {
  data: new SlashCommandBuilder()
    .setName('goal')
    .setDescription('Set your starting balance and the point where you cash out.')
    .addIntegerOption(opt => opt.setName('starting_balance').setDescription('What are you walking in with? (USD equivalent)').setRequired(true))
    .addIntegerOption(opt => opt.setName('redeem_point').setDescription('What balance triggers a cash out? (USD equivalent)').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const start = interaction.options.getInteger('starting_balance') ?? 0;
    const redeem = interaction.options.getInteger('redeem_point') ?? 0;
    const profit = redeem - start;

    if (redeem <= start) {
      await interaction.reply({ content: `That redeem point is lower than your starting balance. The math doesn't work like that.`, ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00CED1)
      .setTitle('TARGET LOCKED')
      .setDescription(
        `Starting balance: **$${start}**\n` +
        `Redeem point: **$${redeem}**\n` +
        `That's **$${profit} profit** if you actually pull the trigger.\n\n` +
        `When you hit it, I'll remind you to cash out before the house notices.`
      )
      .setFooter({ text: "Winning is easy. Keeping it is legendary." });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
