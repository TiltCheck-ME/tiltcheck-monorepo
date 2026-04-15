// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-14

import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { juicedrop } from './juicedrop.js';

export const rain: Command = {
  data: new SlashCommandBuilder()
    .setName('rain')
    .setDescription('Run a live SOL airdrop in the current channel.')
    .addStringOption((opt) =>
      opt.setName('amount').setDescription('Total amount to drop (e.g. "1 SOL" or "$50")').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName('users').setDescription('Maximum number of users who can claim').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName('time').setDescription('Time in seconds to collect claims (default 60)').setMinValue(10).setMaxValue(300)
    ),
  execute: juicedrop.execute,
};
