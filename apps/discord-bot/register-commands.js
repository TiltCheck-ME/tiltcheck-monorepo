#!/usr/bin/env node

/**
 * Discord Command Registration Script
 * Registers all TiltCheck slash commands with Discord API
 */

import { config } from 'dotenv';
import { REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root
config({ path: join(__dirname, '../../.env') });

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

// Define all commands manually to avoid import issues
const commands = [
  {
    name: 'ping',
    description: 'Check if the bot is responsive'
  },
  {
    name: 'help',
    description: 'Show available commands and features'
  },
  {
    name: 'scan',
    description: 'Scan a URL for scams and phishing',
    options: [{
      type: 3, // STRING
      name: 'url',
      description: 'URL to scan',
      required: true
    }]
  },
  {
    name: 'poker',
    description: 'Start a poker game'
  },
  {
    name: 'cooldown',
    description: 'Set up a cooldown period',
    options: [{
      type: 4, // INTEGER
      name: 'hours',
      description: 'Hours to cool down',
      required: true
    }]
  },
  {
    name: 'tilt',
    description: 'Check your tilt status'
  },
  {
    name: 'justthetip',
    description: 'Send a SOL tip to another user',
    options: [
      {
        type: 6, // USER
        name: 'recipient',
        description: 'User to tip',
        required: true
      },
      {
        type: 10, // NUMBER
        name: 'amount',
        description: 'Amount of SOL to tip',
        required: true
      }
    ]
  },
  {
    name: 'airdrop',
    description: 'Request a test SOL airdrop (testnet/devnet only)'
  },
  {
    name: 'lockvault',
    description: 'Lock funds in a time-locked vault',
    options: [
      {
        type: 10, // NUMBER
        name: 'amount',
        description: 'Amount to lock',
        required: true
      },
      {
        type: 4, // INTEGER
        name: 'hours',
        description: 'Hours to lock',
        required: true
      }
    ]
  },
  {
    name: 'support',
    description: 'Get help from TiltCheck support'
  },
  {
    name: 'trust',
    description: 'Check trust dashboard'
  },
  {
    name: 'casino',
    description: 'Casino-related commands',
    options: [{
      type: 1, // SUB_COMMAND
      name: 'lookup',
      description: 'Look up casino trust information',
      options: [{
        type: 3, // STRING
        name: 'name',
        description: 'Casino name',
        required: true
      }]
    }]
  },
  {
    name: 'security',
    description: 'Security alerts and settings'
  },
  {
    name: 'profile',
    description: 'View your TiltCheck profile'
  },
  {
    name: 'sessionverify',
    description: 'Verify your casino session integrity'
  },
  {
    name: 'submitseed',
    description: 'Submit a provably fair seed',
    options: [{
      type: 3, // STRING
      name: 'seed',
      description: 'Seed value',
      required: true
    }]
  },
  {
    name: 'collectclock',
    description: 'Bonus tracking commands'
  },
  {
    name: 'trust-report',
    description: 'Get comprehensive trust grading for a casino',
    options: [{
      type: 3, // STRING
      name: 'casino',
      description: 'Casino ID or name (auto-complete enabled)',
      required: true,
      autocomplete: true
    }]
  },
  {
    name: 'playanalyze',
    description: 'Analyze your gameplay patterns'
  },
  {
    name: 'tiltcheck',
    description: 'Run tilt detection analysis'
  },
  {
    name: 'triviadrop',
    description: 'Start a trivia game with SOL rewards'
  },
  {
    name: 'submitpromo',
    description: 'Submit a casino promo code',
    options: [{
      type: 3, // STRING
      name: 'code',
      description: 'Promo code',
      required: true
    }]
  },
  {
    name: 'blockdomain',
    description: 'Block a suspicious domain (moderators only)',
    options: [{
      type: 3, // STRING
      name: 'domain',
      description: 'Domain to block',
      required: true
    }]
  },
  {
    name: 'unblockdomain',
    description: 'Unblock a domain (moderators only)',
    options: [{
      type: 3, // STRING
      name: 'domain',
      description: 'Domain to unblock',
      required: true
    }]
  }
];

async function registerCommands() {
  try {
    console.log('🤖 TiltCheck Discord Command Registration');
    console.log('==========================================\n');
    console.log(`📝 Registering ${commands.length} commands...\n`);

    const rest = new REST().setToken(DISCORD_TOKEN);

    if (DISCORD_GUILD_ID) {
      // Guild-specific (faster, for development)
      console.log(`🎯 Deploying to guild: ${DISCORD_GUILD_ID}`);
      await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
        { body: commands }
      );
      console.log('✅ Successfully deployed guild commands!\n');
    } else {
      // Global (slower, for production)
      console.log('🌍 Deploying globally (may take up to 1 hour to propagate)...');
      await rest.put(
        Routes.applicationCommands(DISCORD_CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Successfully deployed global commands!\n');
    }

    console.log('📋 Registered commands:');
    commands.forEach(cmd => {
      console.log(`   /${cmd.name} - ${cmd.description}`);
    });

    console.log('\n✨ All commands registered successfully!');
    console.log('   Commands should be available in Discord now.');
    
  } catch (error) {
    console.error('❌ Error registering commands:', error);
    process.exit(1);
  }
}

registerCommands();
