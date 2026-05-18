/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18 */

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { getDashboardAppUrl } from '../utils/dashboard-url.js';

const DEFAULT_FEE_PCT = Number(process.env.WALLET_EARLY_UNLOCK_FEE_PERCENT) || 10;
const DEFAULT_DEV_PCT = Number(process.env.WALLET_EARLY_UNLOCK_DEV_PERCENT_OF_BALANCE) || 2;

function feeDisclosureEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xfacc15)
    .setTitle('Wallet lock — fee disclosure')
    .setDescription(
      'Harm-reduction cooldown on vault actions. Not operator self-exclusion. Not on-chain immutability.',
    )
    .addFields(
      {
        name: 'Paid early exit (when allowed)',
        value: `${DEFAULT_FEE_PCT}% of LockVault ledger basis at request time.`,
        inline: false,
      },
      {
        name: 'RG v1 split',
        value: `Trivia jackpot: 0 SOL. Dev skim: ~${DEFAULT_DEV_PCT}% of basis (capped by fee). Remainder: recovery microgrant pool.`,
        inline: false,
      },
      {
        name: 'Timer-only mode',
        value: 'No admin or paid early exit until the timer ends (server policy).',
        inline: false,
      },
      {
        name: 'Configure',
        value: `[Dashboard vault lane](${getDashboardAppUrl('/dashboard?tab=vault')})`,
        inline: false,
      },
    )
    .setFooter({ text: 'Made for Degens. By Degens. See docs/legal/fee-ethics-policy.md' });
}

export const walletlock: Command = {
  data: new SlashCommandBuilder()
    .setName('walletlock')
    .setDescription('Wallet lock fee disclosure and dashboard handoff.')
    .addSubcommand((sub) =>
      sub.setName('disclose').setDescription('Show paid early-exit fee breakdown before you commit.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Where to see live wallet lock state (dashboard).'),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    if (sub === 'disclose') {
      await interaction.editReply({ embeds: [feeDisclosureEmbed()] });
      return;
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x17c3b2)
          .setTitle('Wallet lock status')
          .setDescription(
            `Live lock state lives on the dashboard. Discord only delivers this handoff.\n\n[Open vault controls](${getDashboardAppUrl('/dashboard?tab=vault')})`,
          )
          .setFooter({ text: 'Made for Degens. By Degens.' }),
      ],
    });
  },
};
