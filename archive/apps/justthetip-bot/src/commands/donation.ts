// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
// JustTheTip Bot — Donation Command
//
// Standalone slash command that presents the optional tip prompt.
// Destination wallets:
//   DEV_WALLET      — TiltCheck development fund
//   RECOVERY_WALLET — Community microgrant fund

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from 'discord.js';
import type { Command } from '../types.js';

const DEV_WALLET = '5SprDbgKNNqBu9WDAi7UFCX7ePZ83wA5MKLnbZL5FjZq';
const RECOVERY_WALLET = 'CCXEVwUyfMLFwEzyusBLZ2VY1PyDe6qYhLHtgRqeBm51';
const DONATION_AMOUNT_LABEL = '0.05 SOL';

export const donation: Command = {
  data: new SlashCommandBuilder()
    .setName('donation')
    .setDescription('Support the TiltCheck dev fund or community recovery grants with an optional tip.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle('[OPTIONAL TIP — YOUR CALL]')
      .setDescription(
        `Want to kick **${DONATION_AMOUNT_LABEL}** somewhere useful?\n\n` +
        `**[Kick the devs a bone]** — Goes to the team that built this thing.\n` +
        `\`${DEV_WALLET}\`\n\n` +
        `**[Stack the recovery fund]** — Goes toward community microgrants for degens who hit rock bottom.\n` +
        `\`${RECOVERY_WALLET}\`\n\n` +
        `All transactions are non-custodial. Your wallet, your signature.`
      )
      .setFooter({ text: 'No pressure. The game runs either way. — Made for Degens. By Degens.' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('[+0.05 SOL — Kick the devs a bone]')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://solana.to/pay?recipient=${DEV_WALLET}&amount=0.05&label=TiltCheck+Dev+Fund`),
      new ButtonBuilder()
        .setLabel('[+0.05 SOL — Stack the recovery fund]')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://solana.to/pay?recipient=${RECOVERY_WALLET}&amount=0.05&label=TiltCheck+Recovery+Fund`),
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
