/**
 * Copyright (c) 2024-2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Help Command - Credit-based flow documentation
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn the credit-balance flow for tips and payouts'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0x00BFFF)
      .setTitle('JustTheTip - How It Works')
      .setDescription(
        'This bot runs on credit balance. Deposit first, then send.\n\n' +
        '**Getting Started:**\n' +
        '1. Register your wallet: `/tip wallet register-external`\n' +
        '2. Deposit SOL: `/tip deposit` (gives you address + memo code)\n' +
        '   or deposit tokens: `/tip deposit-token token:USDC`\n' +
        '3. Send the deposit to the bot wallet with the code as memo\n' +
        '4. Check credit with `/tip balance`\n' +
        '5. Ship a tip with `/tip direct`\n'
      )
      .addFields(
        {
          name: 'Tipping',
          value:
            '`/tip direct @user $5` - Direct tip from your credit\n' +
            '`/tip send @user $5` - Alias of `/tip direct`\n' +
            '`/tip airdrop $1 @user1 @user2` - Multi-send from credit\n',
        },
        {
          name: 'Balance and Wallet',
          value:
            '`/tip balance` - View credit balance\n' +
            '`/tip deposit` - Get deposit code and address\n' +
            '`/tip deposit-token token:USDC` - Load credit from tokens\n' +
            '`/tip withdraw` - Withdraw all credit to wallet\n' +
            '`/tip wallet view` - View registered wallet\n' +
            '`/tip history` - Recent transactions\n',
        },
        {
          name: 'Vaults',
          value:
            '`/tip lock $50 24h` - Time-lock funds\n' +
            '`/tip unlock <id>` - Unlock after expiry\n' +
            '`/tip vaults` - View active vaults\n',
        },
        {
          name: 'Settings',
          value:
            '`/tip refund-settings` - Configure auto-refund\n' +
            '`/tip claim <sig>` - Manual deposit claim\n',
        },
        {
          name: 'Fees and Refunds',
          value:
            'Flat fee: 0.0007 SOL per tip/airdrop.\n' +
            'Unused credit auto-refunds after 7 days of inactivity (configurable).\n' +
            'Pending tips to walletless users expire after 7 days.',
        },
      )
      .setFooter({ text: 'Fund credit. Then go direct.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
