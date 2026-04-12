// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('JustTheTip bot command map.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle('JUSTTHETIP — COMMANDS')
      .setDescription('Non-custodial SOL drops, wallet linking, and bonus tracking. Use the commands below.')
      .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

    embed.addFields(
      {
        name: 'Drops',
        value:
          '`/juicedrop` — Run a live SOL drop in the current channel\n' +
          '`/profitdrop` — Reserved command. Not live yet. Use `/juicedrop`.',
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
        name: 'Utility',
        value:
          '`/bonuses` — Pull the latest bonus digest from CollectClock\n' +
          '`/donation` — Show the optional support links\n' +
          '`/ping` — Check bot latency\n' +
          '`/help` — Show this command map',
        inline: false,
      }
    );

    embed.setFooter({ text: 'JustTheTip | Non-custodial. No hidden custody.' });
    await interaction.reply({ embeds: [embed] });
  },
};
