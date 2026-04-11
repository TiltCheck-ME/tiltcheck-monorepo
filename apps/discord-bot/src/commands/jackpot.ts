// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

const JACKPOT_WALLET = process.env.JACKPOT_WALLET_ADDRESS || '5SprDbgKNNqBu9WDAi7UFCX7ePZ83wA5MKLnbZL5FjZq';

export const jackpot: Command = {
  data: new SlashCommandBuilder()
    .setName('jackpot')
    .setDescription('The community trivia prizepool — check the pot or add to it.')
    .addSubcommand(sub => sub.setName('status').setDescription('Current prizepool balance and last winner.'))
    .addSubcommand(sub =>
      sub.setName('fuel')
        .setDescription('Contribute SOL to the trivia prizepool.')
        .addNumberOption(opt =>
          opt.setName('amount')
            .setDescription('SOL amount to contribute (e.g. 0.1)')
            .setMinValue(0.01)
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('TRIVIA PRIZEPOOL')
        .setDescription(
          'The community pot is live.\n\n' +
          'Win a Degens Against Decency trivia round — winner takes all.\n\n' +
          'Pool balance updates after each completed trivia round.'
        )
        .addFields(
          { name: 'How to Enter', value: 'Win a trivia round. No entry fee.', inline: true },
          { name: 'How to Fuel', value: 'Run `/jackpot fuel <amount>`', inline: true },
          { name: 'Fuel Wallet', value: `\`${JACKPOT_WALLET}\``, inline: false }
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'fuel') {
      const amount = interaction.options.getNumber('amount', true);

      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('FUEL THE POT')
        .setDescription(
          `Send **${amount} SOL** to the jackpot wallet and the pot goes up.\n\n` +
          'Your wallet, your signature. No escrow, no middleman.\n\n' +
          'Once confirmed on-chain, the prizepool balance updates automatically.'
        )
        .addFields(
          { name: 'Send To', value: `\`${JACKPOT_WALLET}\``, inline: false },
          { name: 'Amount', value: `**${amount} SOL**`, inline: true },
          { name: 'Memo', value: '`jackpot-fuel`', inline: true }
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.reply({ embeds: [embed] });
    }
  },
};
