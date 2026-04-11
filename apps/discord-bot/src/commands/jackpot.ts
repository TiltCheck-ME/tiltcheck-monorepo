// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * Trivia Prizepool Command
 * Shows and funds the community trivia jackpot.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const jackpot: Command = {
  data: new SlashCommandBuilder()
    .setName('jackpot')
    .setDescription('The community trivia prizepool — check the pot or add to it.')
    .addSubcommand(sub => sub.setName('status').setDescription('Current prizepool balance and last winner.'))
    .addSubcommand(sub =>
      sub.setName('fuel')
        .setDescription('Add SOL to the trivia prizepool.')
        .addIntegerOption(opt => opt.setName('amount').setDescription('How much SOL to add?').setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const amount = interaction.options.getInteger('amount');

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('TRIVIA PRIZEPOOL')
        .setDescription(
          `The community pot is live.\n\n` +
          `Play Degens Against Decency trivia to compete for the pool — winner takes all.\n\n` +
          `Pool balance updates after each trivia round.`
        )
        .addFields(
          { name: 'How to Enter', value: 'Win a Degens Against Decency trivia round. No entry fee.', inline: false },
          { name: 'How to Add', value: 'Use `/jackpot fuel` to contribute SOL.', inline: false }
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'fuel') {
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('ADDING TO THE PRIZEPOOL')
        .setDescription(
          `Adding **${amount} SOL** to the trivia prizepool.\n\n` +
          `Use the link below to complete the transaction. Your wallet, your signature — not our problem.`
        )
        .addFields({ name: 'Contribute via Solana Pay', value: `https://tiltcheck.me/pay/jackpot?amount=${amount}`, inline: false })
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.reply({ embeds: [embed] });
    }
  },
};
