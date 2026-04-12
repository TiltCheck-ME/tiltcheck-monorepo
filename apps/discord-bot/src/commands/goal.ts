// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const goal: Command = {
  data: new SlashCommandBuilder()
    .setName('goal')
    .setDescription('Set the number where you cash out instead of punting it back.')
    .addIntegerOption(opt => opt.setName('starting_balance').setDescription('Starting bankroll in USD').setRequired(true))
    .addIntegerOption(opt => opt.setName('redeem_point').setDescription('Cash-out number in USD').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const start = interaction.options.getInteger('starting_balance') ?? 0;
    const redeem = interaction.options.getInteger('redeem_point') ?? 0;
    const profit = redeem - start;

    if (redeem <= start) {
      await interaction.reply({ content: `Redeem point has to beat your starting balance. Otherwise you just invented losing.`, ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x22d3a6)
      .setTitle('EXIT NUMBER LOCKED')
      .setDescription(
        `Walk-in stack: **$${start}**\n` +
        `Cash-out target: **$${redeem}**\n` +
        `That is **$${profit} profit** if you actually stop clicking.\n\n` +
        `When you hit it, leave. Do not start negotiating with slot goblin brain.`
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
