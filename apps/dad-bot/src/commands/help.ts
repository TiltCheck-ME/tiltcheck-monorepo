// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export function buildHelpEmbed(): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0xff4500)
    .setTitle('DEGENS AGAINST DECENCY — COMMAND MAP')
    .setDescription('DAD runs card games, trivia drops, jackpots, and Discord activities. It does not custody funds or handle wallet linking.')
    .setThumbnail('https://tiltcheck.me/assets/logo/logocurrent.png');

  embed.addFields(
    {
      name: 'Card Game',
      value:
        '`/lobby create rounds:<1-20> players:<2-10>` — Open a game in this channel\n' +
        '`/lobby join` — Join the open game\n' +
        '`/lobby start` — Start the game if you host it\n' +
        '`/lobby hand` — View your cards privately\n' +
        '`/lobby submit card:<number>` — Play a white card\n' +
        '`/lobby pick submission:<number>` — Judge picks the round winner\n' +
        '`/lobby scores` — Current scoreboard\n' +
        '`/lobby end` — Kill the game if you host it',
      inline: false,
    },
    {
      name: 'Trivia and Prizes',
      value:
        '`/triviadrop topic:<topic> prize_total:<sol> rounds:<1-5> timer:<15-60>` — Run a funded trivia drop\n' +
        '`/jackpot status` — Check the trivia pot\n' +
        '`/jackpot fuel amount:<sol>` — Add SOL to the pot',
      inline: false,
    },
    {
      name: 'Activities',
      value:
        '`/play game:<trivia|blackjack>` — Launch a live Discord activity',
      inline: false,
    },
    {
      name: 'Wallets and Other Bots',
      value:
        'Wallet linking lives outside DAD. Link a wallet in **TiltCheck** or **JustTheTip** first.\n' +
        'DAD only reads that existing wallet record when trivia payouts go out.',
      inline: false,
    }
  );

  embed.setFooter({ text: 'Degens Against Decency — Made for Degens. By Degens.' });
  return embed;
}

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('DAD bot command map.'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ embeds: [buildHelpEmbed()] });
  },
};
