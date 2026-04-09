// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
/**
 * Bonuses Command
 *
 * Fetches the daily bonus digest from CollectClock and displays it as a
 * Discord embed. Supports an optional brand filter.
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

const COLLECTCLOCK_URL =
  'https://raw.githubusercontent.com/TiltCheck-ME/CollectClock/main/bonus-data.json';

const MAX_RESULTS = 10;

interface BonusEntry {
  brand: string;
  bonus: string;
  url: string;
  verified: string;
  code: string | null;
}

async function fetchBonuses(): Promise<BonusEntry[]> {
  const res = await fetch(COLLECTCLOCK_URL, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!res.ok) {
    throw new Error(`CollectClock responded with HTTP ${res.status}`);
  }
  return (await res.json()) as BonusEntry[];
}

export const bonuses: Command = {
  data: new SlashCommandBuilder()
    .setName('bonuses')
    .setDescription('Show today\'s casino bonus digest from CollectClock.')
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
    try {
      data = await fetchBonuses();
    } catch (err) {
      await interaction.editReply(
        '[ERROR] Failed to retrieve bonus data from CollectClock. Try again shortly.'
      );
      return;
    }

    if (filter) {
      data = data.filter((entry) => entry.brand.toLowerCase().includes(filter));
    }

    if (data.length === 0) {
      const msg = filter
        ? `[NO RESULTS] No bonuses found matching "${filter}".`
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

    // Build claim buttons — Discord limits ActionRow to 5 buttons.
    // Chunk into rows of 5.
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const BUTTONS_PER_ROW = 5;
    const MAX_ROWS = 5; // Discord allows max 5 action rows per message
    const buttonEntries = results.slice(0, BUTTONS_PER_ROW * MAX_ROWS);

    for (let i = 0; i < buttonEntries.length; i += BUTTONS_PER_ROW) {
      const chunk = buttonEntries.slice(i, i + BUTTONS_PER_ROW);
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
