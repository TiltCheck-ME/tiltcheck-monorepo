/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Community Jackpot Command
 * Status and contributions.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const jackpot: Command = {
  data: new SlashCommandBuilder()
    .setName('jackpot')
    .setDescription('[COMMUNITY POOL] Shared Trivia Jackpot status.')
    .addSubcommand(sub => sub.setName('status').setDescription('Current pool balance and history.'))
    .addSubcommand(sub => 
      sub.setName('fuel')
        .setDescription('Add to the community jackpot.')
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount (SOL equivalent)').setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const amount = interaction.options.getInteger('amount');

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('🏆 [COMMUNITY JACKPOT] AUDIT')
      .setTimestamp();

    if (sub === 'status') {
      embed.setDescription(`**CURRENT POOL:** 1.45 SOL\n**LAST WINNER:** @Degen123 (0.5 SOL)\n\n[TRIVIA] Play DA&D DAD Bot trivia to claim the pool.`)
        .addFields({ name: 'Upcoming Audit', value: 'Today at 9 PM EST', inline: true })
        .setFooter({ text: 'Edge Equalizer: THE HOUSE GIVES BACK.' });

      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'fuel') {
      // Mocking the Solana Pay link generation
      embed.setTitle('💰 [COMMUNITY FUEL] INITIALIZED')
        .setDescription(`You are adding **$${amount}** equivalent to the jackpot.\n\n[SOLANA PAY] Link to contribute: https://tiltcheck.me/pay/jackpot?amount=${amount}`)
        .setFooter({ text: 'TiltCheck: SECURE THE COMMUNITY BAG.' });

      await interaction.reply({ embeds: [embed] });
    }
  },
};
