// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09
/**
 * Trivia Treasury Command
 * Shows the voluntary community treasury while prize rules are under review.
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const jackpot: Command = {
  data: new SlashCommandBuilder()
    .setName('jackpot')
    .setDescription('The voluntary trivia treasury - check status or open the donation rail.')
    .addSubcommand(sub => sub.setName('status').setDescription('Current treasury status and review gate.'))
    .addSubcommand(sub =>
      sub.setName('fuel')
        .setDescription('Open a voluntary SOL treasury donation link.')
        .addIntegerOption(opt => opt.setName('amount').setDescription('How much SOL to add?').setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const amount = interaction.options.getInteger('amount');

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('TRIVIA TREASURY')
        .setDescription(
          `The community treasury is voluntary-only.\n\n` +
          `No entry fee. No guaranteed prize pool. No payout promise until the public rules clear legal review.\n\n` +
          `*Treasury address is public on the web page.*`
        )
        .addFields(
          { name: 'Rules Status', value: 'Contest and payout rules are deferred pending counsel review.', inline: false },
          { name: 'Voluntary Donations', value: 'Use `/jackpot fuel` only if you want the public Solana Pay link. It does not buy entry or odds.', inline: false }
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'fuel') {
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('VOLUNTARY TREASURY DONATION')
        .setDescription(
          `You're opening a **${amount} SOL** voluntary treasury link.\n\n` +
          `This does not buy entry, odds, or a promised payout. Your wallet, your signature - we don't touch it.`
        )
        .addFields({ name: 'Open Solana Pay', value: `https://tiltcheck.me/pay/jackpot?amount=${amount}`, inline: false })
        .setFooter({ text: 'Rules stay gated until counsel clears them.' });

      await interaction.reply({ embeds: [embed] });
    }
  },
};
