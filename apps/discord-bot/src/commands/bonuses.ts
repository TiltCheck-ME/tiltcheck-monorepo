// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { Command } from '../types.js';
import { config } from '../config.js';

const MAX_RESULTS = 10;

interface BonusEntry {
  brand: string;
  bonus: string;
  url: string;
  verified: string;
  code: string | null;
}

interface BonusFeedResponse {
  data?: BonusEntry[];
  suppression?: {
    active?: boolean;
    hiddenCount?: number;
  };
}

async function fetchBonuses(discordId: string): Promise<{ entries: BonusEntry[]; hiddenCount: number }> {
  const url = new URL('/bonuses', config.backendUrl);
  url.searchParams.set('discordId', discordId);

  const res = await fetch(url.toString(), {
    headers: {
      'Cache-Control': 'no-cache',
      'x-internal-secret': config.internalApiSecret,
    },
  });
  if (!res.ok) {
    throw new Error(`Bonus API responded with HTTP ${res.status}`);
  }
  const body = await res.json() as BonusFeedResponse;
  return {
    entries: Array.isArray(body.data) ? body.data : [],
    hiddenCount: Math.max(0, Number(body.suppression?.hiddenCount ?? 0)),
  };
}

export const bonuses: Command = {
  data: new SlashCommandBuilder()
    .setName('bonuses')
    .setDescription("Show today's casino bonus digest from CollectClock.")
    .addStringOption((opt) =>
      opt
        .setName('filter')
        .setDescription('Filter results by brand name (partial match, case-insensitive).')
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const filter = interaction.options.getString('filter')?.toLowerCase().trim() ?? null;

    let data: BonusEntry[];
    let hiddenCount: number;
    try {
      const response = await fetchBonuses(interaction.user.id);
      data = response.entries;
      hiddenCount = response.hiddenCount;
    } catch {
      await interaction.editReply(
        '[ERROR] Failed to retrieve bonus data from the TiltCheck bonus feed. Try again shortly.'
      );
      return;
    }

    if (filter) {
      data = data.filter((entry) => entry.brand.toLowerCase().includes(filter));
    }

    if (data.length === 0) {
      const msg = filter
        ? `[NO RESULTS] No bonuses found matching "${filter}".${hiddenCount > 0 ? ` ${hiddenCount} hidden by your active filters.` : ''}`
        : hiddenCount > 0
          ? `[NO RESULTS] ${hiddenCount} matching casinos are hidden by your active filters.`
          : '[NO RESULTS] No bonus data available at this time.';
      await interaction.editReply(msg);
      return;
    }

    const results = data.slice(0, MAX_RESULTS);
    const totalCount = data.length;

    const embed = new EmbedBuilder()
      .setColor(0x17c3b2)
      .setTitle('DAILY BONUS TRACKER')
      .setFooter({ text: 'Data from CollectClock | tiltcheck.me/bonuses' })
      .setTimestamp();

    const descLines: string[] = [];
    if (filter) {
      descLines.push(`Filter: "${filter}"`);
    }
    descLines.push(
      `Showing ${results.length} of ${totalCount} result${totalCount !== 1 ? 's' : ''}.`
    );
    if (hiddenCount > 0) {
      descLines.push(`${hiddenCount} hidden by your active filters.`);
    }
    embed.setDescription(descLines.join('\n'));

    for (const entry of results) {
      const fieldLines: string[] = [`${entry.bonus}`];
      if (entry.code) {
        fieldLines.push(`[CODE] ${entry.code}`);
      }
      fieldLines.push(`[VERIFY] ${entry.verified}`);
      embed.addFields({
        name: entry.brand,
        value: fieldLines.join('\n'),
        inline: false,
      });
    }

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const buttonsPerRow = 5;
    const maxRows = 5;
    const buttonEntries = results.slice(0, buttonsPerRow * maxRows);

    for (let i = 0; i < buttonEntries.length; i += buttonsPerRow) {
      const chunk = buttonEntries.slice(i, i + buttonsPerRow);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        chunk.map((entry) =>
          new ButtonBuilder()
            .setLabel(`[CLAIM] ${entry.brand}`)
            .setStyle(ButtonStyle.Link)
            .setURL(entry.url)
        )
      );
      rows.push(row);
    }

    await interaction.editReply({
      embeds: [embed],
      components: rows,
    });
  },
};
