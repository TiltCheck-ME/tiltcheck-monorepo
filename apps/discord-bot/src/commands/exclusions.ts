// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * Surgical Self-Exclusion Commands
 * Block specific games or whole categories without nuking your account.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AutocompleteInteraction,
} from 'discord.js';
import type { Command } from '../types.js';
import { config } from '../config.js';
import type { GameCategory, ForbiddenGamesProfile } from '@tiltcheck/types';

const GAME_CATEGORIES: { name: string; value: GameCategory }[] = [
  { name: 'Chicken / Mines (the "I\'m-chasing" games)', value: 'chicken_mines' },
  { name: 'Bonus Buys (bankroll killers)', value: 'bonus_buy' },
  { name: 'Live Dealer (degens only zone)', value: 'live_dealer' },
  { name: 'Slots (all slot machines)', value: 'slots' },
  { name: 'Crash Games (Aviator / JetX / Spaceman)', value: 'crash' },
  { name: 'Table Games (blackjack, roulette, baccarat)', value: 'table_games' },
];

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

async function apiDelete(path: string): Promise<void> {
  const resp = await fetch(`${config.backendUrl}${path}`, {
    method: 'DELETE',
    headers: { 'x-internal-secret': config.internalApiSecret },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`API ${resp.status}: ${txt}`);
  }
}

// ─── /block-game ─────────────────────────────────────────────────────────────

export const blockGame: Command = {
  data: new SlashCommandBuilder()
    .setName('block-game')
    .setDescription('Surgically block a specific game or category from yourself.')
    .addStringOption((opt) =>
      opt
        .setName('category')
        .setDescription('Block a whole game category (e.g. Crash, Bonus Buys)')
        .setRequired(false)
        .addChoices(...GAME_CATEGORIES)
    )
    .addStringOption((opt) =>
      opt
        .setName('game_id')
        .setDescription('Block a specific game slug (e.g. chicken_orig_01)')
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
    const reason = interaction.options.getString('reason');

    if (!category && !gameId) {
      await interaction.reply({
        content: 'You need to specify at least a category or a game ID. Not running from nothing here.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const discordId = interaction.user.id;
      await apiPost(`/user/${discordId}/exclusions`, { gameId, category, reason });

      const label = gameId
        ? `game \`${gameId}\``
        : `category **${GAME_CATEGORIES.find((c) => c.value === category)?.name ?? category}**`;

      const embed = new EmbedBuilder()
        .setColor(0xdc2626)
        .setTitle('Blocked.')
        .setDescription(
          `${label} is now on your no-fly list.\n\nThe extension will intercept it. The API will return a 403. Past-you just did present-you a solid.`
        )
        .addFields(
          ...(reason ? [{ name: 'Your note to yourself', value: `"${reason}"` }] : []),
          { name: 'Remove it later', value: 'Use `/my-exclusions` to see IDs, then `/unblock-game` to lift the block.' }
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.editReply({ embeds: [embed] });
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
    .setDescription('Remove a surgical exclusion. You sure about this?')
    .addStringOption((opt) =>
      opt
        .setName('exclusion_id')
        .setDescription('Exclusion ID — get it from /my-exclusions')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const exclusionId = interaction.options.getString('exclusion_id', true);

    await interaction.deferReply({ ephemeral: true });

    try {
      const discordId = interaction.user.id;
      await apiDelete(`/user/${discordId}/exclusions/${exclusionId}`);

      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('Unblocked.')
        .setDescription(
          "Exclusion lifted. That game is accessible again.\n\nHopefully you know what you're doing. Touch grass if not."
        )
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await interaction.editReply({ content: `Could not remove exclusion: ${msg}` });
    }
  },
};

// ─── /my-exclusions ───────────────────────────────────────────────────────────

export const myExclusions: Command = {
  data: new SlashCommandBuilder()
    .setName('my-exclusions')
    .setDescription('List your current surgical self-exclusions.'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const discordId = interaction.user.id;
      const result = await apiGet<{ success: boolean; data: ForbiddenGamesProfile }>(
        `/user/${discordId}/exclusions`
      );

      const profile = result.data;

      if (profile.exclusions.length === 0) {
        await interaction.editReply({
          content: 'No exclusions set. Either you have iron self-control or you have not blocked anything yet.',
        });
        return;
      }

      const lines = profile.exclusions.map((e, i) => {
        const target = e.gameId ? `Game: \`${e.gameId}\`` : `Category: **${e.category?.replace(/_/g, ' ')}**`;
        const note = e.reason ? ` — _"${e.reason}"_` : '';
        return `\`${i + 1}.\` ${target}${note}\nID: \`${e.id}\``;
      });

      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('Your Surgical Exclusion List')
        .setDescription(lines.join('\n\n'))
        .addFields([
          {
            name: 'Quick Stats',
            value: `${profile.blockedGameIds.length} specific games | ${profile.blockedCategories.length} categories blocked`,
            inline: false,
          },
        ])
        .setFooter({ text: 'Made for Degens. By Degens.' });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await interaction.editReply({ content: `Could not load exclusions: ${msg}` });
    }
  },
};
