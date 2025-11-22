import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import fs from 'fs/promises';
import path from 'path';
import { eventRouter } from '@tiltcheck/event-router';

interface SeedEntry {
  seed: string;
  submittedBy: string; // discord user id
  ts: number; // epoch ms
  casinoId: string;
}

async function persistSeed(entry: SeedEntry): Promise<void> {
  const dir = path.resolve('data/seeds');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${entry.casinoId}.json`);
  let existing: SeedEntry[] = [];
  try {
    existing = JSON.parse(await fs.readFile(file, 'utf-8'));
  } catch (_) {
    existing = [];
  }
  existing.push(entry);
  await fs.writeFile(file, JSON.stringify(existing, null, 2), 'utf-8');
}

function isValidSeed(seed: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(seed);
}

export const submitseed: Command = {
  data: new SlashCommandBuilder()
    .setName('submit-seed')
    .setDescription('Submit a client seed rotation for transparency tracking')
    .addStringOption(o =>
      o.setName('casino')
        .setDescription('Casino ID (e.g., stake-us)')
        .setRequired(true)
        .addChoices(
          { name: 'Stake.us', value: 'stake-us' },
          { name: 'Rollbit', value: 'rollbit' }
        )
    )
    .addStringOption(o =>
      o.setName('seed')
        .setDescription('Client seed value (8-64 chars, alphanumeric/_-)')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const casinoId = interaction.options.getString('casino', true);
    const seed = interaction.options.getString('seed', true).trim();

    if (!isValidSeed(seed)) {
      await interaction.reply({ content: '❌ Invalid seed format. Use 8-64 chars alphanumeric, dash, underscore.', ephemeral: true });
      return;
    }

    const entry: SeedEntry = {
      seed,
      submittedBy: interaction.user.id,
      ts: Date.now(),
      casinoId,
    };

    try {
      await persistSeed(entry);
      await eventRouter.publish('seed.submitted', 'discord-bot', {
        casinoId,
        seed,
        submittedBy: interaction.user.id,
        ts: entry.ts,
      });
      await interaction.reply({ content: `✅ Seed submitted for \`${casinoId}\`. Thank you for contributing to transparency.`, ephemeral: true });
    } catch (err) {
      console.error('[submit-seed] Persist error', err);
      await interaction.reply({ content: '❌ Failed to persist seed submission. Try again later.', ephemeral: true });
    }
  },
};
