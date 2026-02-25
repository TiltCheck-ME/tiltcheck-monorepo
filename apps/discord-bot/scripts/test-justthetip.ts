/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Quick JustTheTip Command Test
 * Tests if /justthetip command structure is valid
 */

import { SlashCommandBuilder } from 'discord.js';

const command = new SlashCommandBuilder()
  .setName('justthetip')
  .setDescription('Non-custodial Solana tipping')
  .addSubcommand(sub =>
    sub
      .setName('wallet')
      .setDescription('Manage your wallet')
      .addStringOption(opt =>
        opt
          .setName('action')
          .setDescription('Wallet action')
          .setRequired(true)
          .addChoices(
            { name: 'View', value: 'view' },
            { name: 'Register (Magic Link)', value: 'register-magic' },
            { name: 'Register (External)', value: 'register-external' },
          )
      )
      .addStringOption(opt =>
        opt
          .setName('address')
          .setDescription('Wallet address (for external registration)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('tip')
      .setDescription('Send a tip to another user')
      .addUserOption(opt =>
        opt
          .setName('user')
          .setDescription('User to tip')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt
          .setName('amount')
          .setDescription('Amount (e.g., "5 sol", "$10", "all")')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('balance')
      .setDescription('Check your wallet balance')
  )
  .addSubcommand(sub =>
    sub
      .setName('pending')
      .setDescription('View pending tips sent to you')
  );

const json = command.toJSON();
console.log('✅ JustTheTip command structure valid!');
console.log(`Name: ${json.name}`);
console.log(`Description: ${json.description}`);
console.log(`Subcommands: ${json.options?.map(o => o.name).join(', ')}`);
console.log('\nReady to register with Discord!');
