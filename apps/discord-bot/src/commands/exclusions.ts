// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19
/**
 * Surgical Self-Exclusion Commands
 * Block specific games or whole categories without nuking your account.
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
import { config } from '../config.js';
import {
  GAME_EXCLUSION_CATEGORIES,
  GAME_EXCLUSION_CATEGORY_LABELS,
  type GameCategory,
  type ForbiddenGamesProfile,
} from '@tiltcheck/types';

const GAME_CATEGORIES: { name: string; value: GameCategory }[] = GAME_EXCLUSION_CATEGORIES.map((value) => ({
  name: GAME_EXCLUSION_CATEGORY_LABELS[value],
  value,
}));

function humanizeSlug(value: string | null | undefined): string {
  return String(value ?? '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatExclusionTarget(exclusion: {
  gameId?: string | null;
  category?: GameCategory | null;
  provider?: string | null;
  casino?: string | null;
}): string {
  if (exclusion.gameId) return `Game: \`${exclusion.gameId}\``;
  if (exclusion.category) return `Category: **${GAME_EXCLUSION_CATEGORY_LABELS[exclusion.category] ?? exclusion.category}**`;
  if (exclusion.provider) return `Provider: **${humanizeSlug(exclusion.provider)}**`;
  if (exclusion.casino) return `Casino: **${humanizeSlug(exclusion.casino)}**`;
  return 'Unknown exclusion target';
}

function getDashboardBaseUrl(): string {
  const configuredUrl = process.env.DASHBOARD_URL?.trim();
  if (configuredUrl && /^https?:\/\//i.test(configuredUrl)) {
    return configuredUrl.replace(/\/+$/, '');
  }

  return 'https://dashboard.tiltcheck.me';
}

function getSafetyControlsUrl(): string {
  return `${getDashboardBaseUrl()}/dashboard?tab=safety`;
}

function buildSafetyControlsRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('Open Safety Controls')
      .setStyle(ButtonStyle.Link)
      .setURL(getSafetyControlsUrl())
  );
}

async function apiGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${config.backendUrl}${path}`, {
    headers: { 'x-internal-secret': config.internalApiSecret },
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`API ${resp.status}: ${body}`);
  }
  return resp.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${config.backendUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': config.internalApiSecret,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`API ${resp.status}: ${txt}`);
  }
  return resp.json() as Promise<T>;
}

// ─── /block-game ─────────────────────────────────────────────────────────────

export const blockGame: Command = {
  data: new SlashCommandBuilder()
    .setName('block-game')
    .setDescription('Quick-add a temptation filter, then manage the full set in the dashboard.')
    .addStringOption((opt) =>
      opt
        .setName('category')
        .setDescription('Quick-block a whole game category')
        .setRequired(false)
        .addChoices(...GAME_CATEGORIES)
    )
    .addStringOption((opt) =>
      opt
        .setName('game_id')
        .setDescription('Quick-block a specific game slug')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('provider')
        .setDescription('Quick-block a provider slug (e.g. pragmatic-play)')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('casino')
        .setDescription('Quick-block a casino slug (e.g. stake)')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('reason')
        .setDescription('Optional: remind yourself why you blocked it')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const category = interaction.options.getString('category') as GameCategory | null;
    const gameId = interaction.options.getString('game_id');
    const provider = interaction.options.getString('provider');
    const casino = interaction.options.getString('casino');
    const reason = interaction.options.getString('reason');
    const targets = [category, gameId, provider, casino].filter(Boolean);

    if (targets.length === 0) {
      await interaction.reply({
        content: 'Pick one thing to block: category, game ID, provider, or casino.',
        ephemeral: true,
      });
      return;
    }

    if (targets.length > 1) {
      await interaction.reply({
        content: 'One target per hit. Stack another `/block-game` if you want more.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const discordId = interaction.user.id;
      await apiPost(`/user/${discordId}/exclusions`, { gameId, category, provider, casino, reason });

      const label = gameId
        ? `game \`${gameId}\``
        : category
          ? `category **${GAME_CATEGORIES.find((c) => c.value === category)?.name ?? category}**`
          : provider
            ? `provider **${humanizeSlug(provider)}**`
            : `casino **${humanizeSlug(casino)}**`;

      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('BLOCKED')
        .setDescription(
          `${label} is now on your no-fly list.\n\nDiscord is doing the quick-add. The dashboard still owns the full filter set and any cleanup.`
        )
        .addFields(
          ...(reason ? [{ name: 'Your note to yourself', value: `"${reason}"` }] : []),
          { name: 'Manage the rest', value: 'Need edits, removals, or the full filter list? Use the dashboard safety controls.' }
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.editReply({ embeds: [embed], components: [buildSafetyControlsRow()] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await interaction.editReply({ content: `Failed to add exclusion: ${msg}` });
    }
  },
};

// ─── /unblock-game ────────────────────────────────────────────────────────────

export const unblockGame: Command = {
  data: new SlashCommandBuilder()
    .setName('unblock-game')
    .setDescription('Open dashboard safety controls to remove or edit a temptation filter.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle('DASHBOARD-OWNED')
      .setDescription(
        'Discord is not the manager for filter removals anymore.\n\nUse the dashboard safety controls to review, edit, or remove temptation filters.'
      )
      .setFooter({ text: 'Made for Degens. By Degens.' });

    await interaction.reply({ embeds: [embed], components: [buildSafetyControlsRow()], ephemeral: true });
  },
};

// ─── /my-exclusions ───────────────────────────────────────────────────────────

export const myExclusions: Command = {
  data: new SlashCommandBuilder()
    .setName('my-exclusions')
    .setDescription('Summarize your temptation filters. Full management stays in the dashboard.'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const discordId = interaction.user.id;
      const result = await apiGet<{ success: boolean; data: ForbiddenGamesProfile }>(
        `/user/${discordId}/exclusions`
      );

      const profile = result.data;

      if (profile.exclusions.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x22d3a6)
          .setTitle('TEMPTATION FILTERS')
          .setDescription('No filters armed right now.\n\nUse `/block-game` for a quick add, or the dashboard for full safety control setup.')
          .setFooter({ text: 'Made for Degens. By Degens.' });

        await interaction.editReply({
          embeds: [embed],
          components: [buildSafetyControlsRow()],
        });
        return;
      }

      const lines = profile.exclusions.slice(0, 8).map((e, i) => {
        const target = formatExclusionTarget(e);
        const note = e.reason ? ` — _"${e.reason}"_` : '';
        return `\`${i + 1}.\` ${target}${note}`;
      });
      const remaining = profile.exclusions.length - lines.length;

      const embed = new EmbedBuilder()
        .setColor(0x22d3a6)
        .setTitle('TEMPTATION FILTER SUMMARY')
        .setDescription(
          `${lines.join('\n\n')}${remaining > 0 ? `\n\n...and ${remaining} more in the dashboard.` : ''}`
        )
        .addFields([
          {
            name: 'Quick Stats',
            value: `${profile.blockedGameIds.length} games | ${profile.blockedCategories.length} categories | ${profile.blockedProviders.length} providers | ${profile.blockedCasinos.length} casinos`,
            inline: false,
          },
          {
            name: 'Canonical manager',
            value: 'Dashboard safety controls own edits and removals. Discord stays summary-first.',
            inline: false,
          },
        ])
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.editReply({ embeds: [embed], components: [buildSafetyControlsRow()] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await interaction.editReply({ content: `Could not load exclusions: ${msg}` });
    }
  },
};
