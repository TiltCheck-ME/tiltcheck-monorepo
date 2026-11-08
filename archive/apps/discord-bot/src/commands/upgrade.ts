// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
/**
 * Upgrade Command
 *
 * Surfaces Discord game add-on SKUs only (TIL-36). Retired platform passes
 * and SOL claim flows are not advertised from this command.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getConfiguredGameAddonSkuIds } from '@tiltcheck/discord-monetization';
import type { Command } from '../types.js';

const TEAL = 0x22d3a6;
const APP_DIR_BASE = `https://discord.com/application-directory/${process.env.DISCORD_CLIENT_ID || 'PENDING'}`;

export const upgrade: Command = {
  data: new SlashCommandBuilder()
    .setName('upgrade')
    .setDescription('Buy Discord game add-ons for TiltCheck Activities (platform passes are retired).'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const gameAddonSkuIds = getConfiguredGameAddonSkuIds();

    const policyEmbed = new EmbedBuilder()
      .setColor(TEAL)
      .setTitle('GAME ADD-ONS ONLY')
      .setDescription(
        [
          'Non-game-add-on passes (Degen / Platinum / Lifetime / SOL claim ladder) are retired. No cap, that lane was platform monetization.',
          '',
          '**What still bills:** Discord **game add-ons** tied to the embedded Activity — consumables, rounds, cosmetics, whatever you actually ship as an add-on SKU.',
          '',
          '**What you do:** open the TiltCheck Activity in Discord and buy from the in-app shelf, or use the buttons below when SKUs are configured.',
        ].join('\n')
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    if (gameAddonSkuIds.length > 0) {
      try {
        for (let i = 0; i < gameAddonSkuIds.length; i += 5) {
          const chunk = gameAddonSkuIds.slice(i, i + 5);
          const row = new ActionRowBuilder<ButtonBuilder>();
          for (const skuId of chunk) {
            row.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId(skuId));
          }
          rows.push(row);
        }
      } catch (_err) {
        rows.length = 0;
      }
    }

    if (rows.length === 0) {
      const fallback = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('Open app directory')
          .setURL(APP_DIR_BASE),
      );
      rows.push(fallback);
    }

    await interaction.editReply({
      embeds: [policyEmbed],
      components: rows,
    });
  },
};
