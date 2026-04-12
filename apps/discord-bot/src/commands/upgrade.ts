// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
/**
 * Upgrade Command
 *
 * Shows available premium tiers, SOL payment instructions,
 * and Discord SKU subscription buttons.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { Command } from '../types.js';

const TEAL = 0x22d3a6;
const SOL_WALLET = 'BvzEqVRUicmW8Y6HFncLYrGXESpMbSNDkWUNTQj5GGGi';
const PREMIUM_URL = `https://discord.com/application-directory/${process.env.DISCORD_CLIENT_ID || 'PENDING'}/premium`;
const CLAIM_URL = 'https://hub.tiltcheck.me/premium';

export const upgrade: Command = {
  data: new SlashCommandBuilder()
    .setName('upgrade')
    .setDescription('See the paid tiers if you want more tools and less rate-limit pain.'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const tierEmbed = new EmbedBuilder()
      .setColor(TEAL)
      .setTitle('UPGRADE YOUR DEGEN STATUS')
      .setDescription(
        [
          '**DEGEN PASS** -- $4.99/mo',
          '- Unlimited scans, no daily cap',
          '- Full SusLink threat analysis',
          '- Casino trust scores (full detail)',
          '- Priority bot alerts',
          '- Degen Pass Discord role',
          '',
          '**PLATINUM PASS** -- $14.99/mo',
          '- Everything in Degen Pass',
          '- Full API access',
          '- Custom nudge thresholds',
          '- Beta feature access',
          '- Platinum Discord role',
          '',
          '**LIFETIME PASS** -- $199.99 one-time',
          '- Platinum tier forever, no renewals',
          '- Every current Platinum perk',
          '- Early access to all new modules',
          '- Lifetime Pass Discord role',
          '',
          '**OG LIFETIME PASS** -- $99.99 one-time (beta price)',
          '- Everything in Lifetime Pass',
          '- Locked in at beta price forever',
          '- OG Lifetime Discord role',
          '- Beta tester credit in release notes',
          '',
          '**SUPPORT THE PROJECT** -- $9.99 one-time',
          '- No tier. No role. No perks.',
          '- Just fuel for the team keeping this thing alive.',
        ].join('\n')
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    const solEmbed = new EmbedBuilder()
      .setColor(TEAL)
      .setTitle('PAY WITH SOLANA')
      .setDescription(
        [
           'Prefer crypto over Discord billing? Fine. Send SOL directly.',
          '',
          `**Wallet:** \`${SOL_WALLET}\``,
          '',
          '**Amounts:**',
          '- Degen Pass (monthly): `0.05 SOL`',
          '- Platinum Pass (monthly): `0.15 SOL`',
          '- Lifetime Pass (one-time): `1.00 SOL`',
          '- OG Lifetime Pass / Beta (one-time): `0.65 SOL`',
          '',
          `After paying, submit your tx hash at:\n${CLAIM_URL}`,
          '',
           'Roles are granted manually within 24 hours after on-chain verification.',
           'No partial payments. Send the exact amount or you just created paperwork.',
        ].join('\n')
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    // Build action row with premium SKU buttons or link fallbacks
    const row = new ActionRowBuilder<ButtonBuilder>();

    try {
      const skuProId = process.env.DISCORD_SKU_PRO_ID;
      const skuEliteId = process.env.DISCORD_SKU_ELITE_ID;
      const skuLifetimeId = process.env.DISCORD_SKU_LIFETIME_ID;
      const skuOgLifetimeId = process.env.DISCORD_SKU_OG_LIFETIME_ID;
      const skuSupportId = process.env.DISCORD_SKU_SUPPORT_ID;

      if (skuProId && skuEliteId && skuLifetimeId && skuOgLifetimeId && skuSupportId) {
        row.addComponents(
          new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId(skuProId),
          new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId(skuEliteId),
          new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId(skuLifetimeId),
          new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId(skuOgLifetimeId),
          new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId(skuSupportId),
        );
      } else {
        // Fallback: link button to app directory premium page
        row.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Subscribe via Discord')
            .setURL(PREMIUM_URL),
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Pay with SOL')
            .setURL(CLAIM_URL),
        );
      }
    } catch (_err) {
      // If ButtonStyle.Premium is unavailable in this environment, fall back to links
      row.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('Subscribe via Discord')
          .setURL(PREMIUM_URL),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('Pay with SOL')
          .setURL(CLAIM_URL),
      );
    }

    await interaction.editReply({
      embeds: [tierEmbed, solEmbed],
      components: [row],
    });
  },
};
