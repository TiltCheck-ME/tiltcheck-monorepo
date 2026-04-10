// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
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
      .setColor(0x22d3a6)
      .setTitle('TARGET LOCKED')
      .setDescription(
        `Starting balance: **$${start}**\n` +
        `Redeem point: **$${redeem}**\n` +
        `That's **$${profit} profit** if you actually pull the trigger.\n\n` +
        `When you hit it, cash out before the house notices.`
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
