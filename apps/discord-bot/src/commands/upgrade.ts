// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
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
    .setDescription('View premium tiers and upgrade your degen status'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const tierEmbed = new EmbedBuilder()
      .setColor(TEAL)
      .setTitle('UPGRADE YOUR DEGEN STATUS')
      .setDescription(
        [
          '**DEGEN PRO** -- $4.99/mo',
          '- Unlimited scans, no daily cap',
          '- Full SusLink threat analysis',
          '- Casino trust scores (full detail)',
          '- Priority bot alerts',
          '- Degen Pro Discord role',
          '',
          '**ELITE** -- $14.99/mo',
          '- Everything in Degen Pro',
          '- Full API access',
          '- Custom nudge thresholds',
          '- Beta feature access',
          '- OG Discord role',
          '',
          '**LIFETIME ELITE** -- $99 one-time',
          '- Elite tier forever, no renewals',
          '- Every Elite perk',
          '- Early access to all new modules',
          '- Lifetime Elite Discord role',
        ].join('\n')
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    const solEmbed = new EmbedBuilder()
      .setColor(TEAL)
      .setTitle('PAY WITH SOLANA')
      .setDescription(
        [
          'Prefer crypto over Discord billing? Send SOL directly.',
          '',
          `**Wallet:** \`${SOL_WALLET}\``,
          '',
          '**Amounts:**',
          '- Degen Pro (monthly): `0.05 SOL`',
          '- Elite (monthly): `0.15 SOL`',
          '- Lifetime Elite (one-time): `1.00 SOL`',
          '',
          `After paying, submit your tx hash at:\n${CLAIM_URL}`,
          '',
          'Roles are granted manually within 24 hours after on-chain verification.',
          'No partial payments. Send the exact amount for your tier.',
        ].join('\n')
      )
      .setFooter({ text: 'TiltCheck Payment System' });

    // Build action row with premium SKU buttons or link fallbacks
    const row = new ActionRowBuilder<ButtonBuilder>();

    try {
      const skuProId = process.env.DISCORD_SKU_PRO_ID;
      const skuEliteId = process.env.DISCORD_SKU_ELITE_ID;
      const skuLifetimeId = process.env.DISCORD_SKU_LIFETIME_ID;

      if (skuProId && skuEliteId && skuLifetimeId) {
        // Discord native premium SKU buttons
        row.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Premium)
            .setSKUId(skuProId),
          new ButtonBuilder()
            .setStyle(ButtonStyle.Premium)
            .setSKUId(skuEliteId),
          new ButtonBuilder()
            .setStyle(ButtonStyle.Premium)
            .setSKUId(skuLifetimeId),
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
