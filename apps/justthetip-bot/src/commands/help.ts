/**
 * Help Command
 * JustTheTip bot commands and features
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
// import { getProfile } from '@tiltcheck/identity-core'; // TODO: Re-enable when identity-core package exists
import type { Command } from '../types.js';

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show JustTheTip commands and features'),

  async execute(interaction: ChatInputCommandInteraction) {
    // const profile = getProfile(interaction.user.id); // TODO: Re-enable
    const embed = new EmbedBuilder()
      .setColor(0x14F195)
      .setTitle('💸 JustTheTip - Non-Custodial Solana Tipping')
      .setDescription('Send and receive SOL tips with zero custody risk!')
      .addFields(
        {
          name: '💳 Wallet Management',
          value:
            '`/wallet action:view` - View your connected wallet\n' +
            '`/wallet action:register address:<addr>` - Connect Phantom/Solflare wallet\n' +
            '`/balance` - Check your SOL balance',
          inline: false,
        },
        {
          name: '💸 Tipping',
          value:
            '`/tip user:@user amount:$10` - Send USD tip (auto-converts to SOL)\n' +
            '`/tip user:@user amount:0.5 sol` - Send SOL tip directly\n' +
            '`/history` - View transaction history (sent via DM for privacy)',
          inline: false,
        },
        {
          name: '🎁 Airdrops & Drops',
          value:
            '`/airdrop amount:$5 max_claims:10` - Create claimable drop\n' +
            'Users click "Claim Drop" button to join\n' +
            'You pay $5 + $0.07 fee for each person who claims',
          inline: false,
        },
        {
          name: '🎯 Leaderboards',
          value:
            '`/leaderboard type:sent` - Top tippers leaderboard\n' +
            '`/leaderboard type:received` - Top receivers leaderboard',
          inline: false,
        },
        {
          name: '🛠️ Support & Utility',
          value:
            '`/help` - Show this help message\n' +
            '`/support` - Contact support team',
          inline: false,
        },
        {
          name: '✨ Key Features',
          value:
            '✅ **Non-custodial** - You control your funds\n' +
            '✅ **USD amounts** - Tip in dollars, auto-converted to SOL\n' +
            '✅ **Flat fees** - Only $0.07 USD per tip\n' +
            '✅ **Auto-claim** - Pending tips claimed when you register wallet\n' +
            '✅ **Solana Pay** - Opens in Phantom, Solflare, Backpack, etc.\n' +
            '✅ **Welcome DM** - Automatic setup guide for new users\n' +
            '✅ **Privacy** - Transaction history sent via DM',
          inline: false,
        }
      )
      .setFooter({ text: 'Powered by Solana Pay • Non-custodial tipping' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
