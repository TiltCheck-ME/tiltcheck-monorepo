/**
 * Help Command — Credit-based flow documentation
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn how to use JustTheTip credit-based tipping'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x00BFFF)
      .setTitle('JustTheTip — How to Degen')
      .setDescription(
        'Send SOL instantly. Custodial (fast) or Non-Custodial (safe). Pick your poison.\n\n' +
        '**Getting Started:**\n' +
        '1. Register your wallet: `/tip wallet register-external`\n' +
        '2. Deposit SOL: `/tip deposit` (sends you a deposit code)\n' +
        '3. Send the deposit to the bot wallet with the code as memo\n' +
        '4. Start tipping!\n'
      )
      .addFields(
        {
          name: 'Tipping',
          value:
            '`/tip send @user $5` — Send from your credit\n' +
            '`/tip airdrop $1 @user1 @user2` — Multi-send\n',
        },
        {
          name: 'Balance & Wallet',
          value:
            '`/tip balance` — View credit balance\n' +
            '`/tip deposit` — Get deposit code + address\n' +
            '`/tip withdraw` — Withdraw all credit to wallet\n' +
            '`/tip wallet view` — View registered wallet\n' +
            '`/tip history` — Recent transactions\n',
        },
        {
          name: 'Vaults',
          value:
            '`/tip lock $50 24h` — Time-lock funds\n' +
            '`/tip unlock <id>` — Unlock after expiry\n' +
            '`/tip vaults` — View active vaults\n',
        },
        {
          name: 'Settings',
          value:
            '`/tip refund-settings` — Configure auto-refund\n' +
            '`/tip claim <sig>` — Manual deposit claim\n',
        },
        {
          name: 'Fees & Refunds',
          value:
            'Flat fee: 0.0007 SOL per tip/airdrop.\n' +
            'Unused credit auto-refunds after 7 days of inactivity (configurable).\n' +
            'Pending tips to walletless users expire after 7 days.',
        },
      )
      .setFooter({ text: 'JustTheTip — Powered by Degens' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
