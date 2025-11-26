/**
 * Help Command
 * 
 * Displays available commands and module information.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { createEmbed, Colors } from '@tiltcheck/discord-utils';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands and features'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = createEmbed(
      '🪙 JustTheTip Bot',
      'Non-custodial Solana tipping • Powered by TiltCheck',
      Colors.PRIMARY
    );

    embed.addFields(
      {
        name: '💰 /tip - Tipping & Wallet',
        value:
          '`/tip send @user <amount>` - Send SOL to a user\n' +
          '`/tip airdrop @users <amount>` - Multi-user tips\n' +
          '`/tip wallet` - Register/view your wallet\n' +
          '`/tip balance` - Check your balance',
        inline: false,
      },
      {
        name: '🔒 /tip - Vault (Time-lock)',
        value:
          '`/tip lock <amount> <duration>` - Lock funds\n' +
          '`/tip unlock <id>` - Unlock after expiry\n' +
          '`/tip vaults` - View your vaults',
        inline: false,
      },
      {
        name: '🎯 /tip trivia - Trivia Drops',
        value:
          '`/tip trivia $5 15s` - Start a trivia round\n' +
          'Random category, prize split among winners!\n' +
          'Time accepts: "15s", "30 secs", "1 min"',
        inline: false,
      },
      {
        name: '🔗 /suslink - Link Safety',
        value:
          '`/suslink scan <url>` - Scan for scams\n' +
          '`/suslink submit <url>` - Submit a promo\n' +
          '`/suslink pending` - View pending promos',
        inline: false,
      },
      {
        name: '🛠️ Utility',
        value: '`/ping` - Check bot status\n`/help` - Show this message',
        inline: false,
      },
      {
        name: '📊 Features',
        value:
          '✅ Non-custodial (you control your funds)\n' +
          '✅ Flat $0.07 fee per tip\n' +
          '✅ Direct wallet-to-wallet transfers\n' +
          '✅ Time-locked vaults for self-control\n' +
          '✅ Automatic link scanning',
        inline: false,
      }
    );

    embed.setFooter({
      text: 'JustTheTip Bot • Powered by TiltCheck',
    });

    await interaction.reply({ embeds: [embed] });
  },
};
