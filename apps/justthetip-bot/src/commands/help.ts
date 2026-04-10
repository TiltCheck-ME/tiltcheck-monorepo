// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('JustTheTip bot command map.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle('JUSTTHETIP — COMMAND MAP')
      .setDescription('Non-custodial SOL tipping, profit drops, wallet linking, and bonus tracking. Your keys never leave your wallet.')
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

    embed.addFields(
      {
        name: 'Profit Drops',
        value:
          '`/juicedrop` — Drop SOL to reactors in the channel\n' +
          '`/profitdrop` — Alias for juicedrop',
        inline: false,
      },
      {
        name: 'Wallet',
        value:
          '`/linkwallet` — Link your Solana wallet for payouts',
        inline: false,
      },
      {
        name: 'Lock and Protect',
        value:
          '`/lockvault` — Time-lock winnings before you bet them back',
        inline: false,
      },
      {
        name: 'Bonuses',
        value:
          '`/bonuses` — Daily bonus digest from the CollectClock feed',
        inline: false,
      },
      {
        name: 'Other Bots',
        value:
          'Session auditing and casino trust: **TiltCheck** bot\n' +
          'Card games and trivia: **DAD** (Degens Against Decency) bot',
        inline: false,
      }
    );

    embed.setFooter({ text: 'JustTheTip — Made for Degens. By Degens.' });
    await interaction.reply({ embeds: [embed] });
  },
};
