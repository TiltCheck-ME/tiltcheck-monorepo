/**
 * Command Deployment Script
 * 
 * Registers slash commands with Discord API.
 * 
 * Usage:
 *   npx tsx bot/src/deploy-commands.ts          # Deploy all commands
 *   npx tsx bot/src/deploy-commands.ts --clear  # Clear all commands first, then deploy
 *   npx tsx bot/src/deploy-commands.ts --clear-only  # Only clear commands (don't deploy)
 */

import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { CommandHandler } from './handlers/commands.js';

const args = process.argv.slice(2);
const shouldClear = args.includes('--clear') || args.includes('--clear-only');
const clearOnly = args.includes('--clear-only');

async function clearCommands(rest: REST) {
  console.log('[Deploy] Clearing existing commands...');

  if (config.guildId) {
    // Clear guild commands
    console.log('[Deploy] Clearing guild commands for:', config.guildId);
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: [] }
    );
    console.log('[Deploy] Guild commands cleared!');
  }

  // Clear global commands
  console.log('[Deploy] Clearing global commands...');
  await rest.put(Routes.applicationCommands(config.clientId), {
    body: [],
  });
  console.log('[Deploy] Global commands cleared!');
}

async function deployCommands() {
  try {
    const rest = new REST().setToken(config.discordToken);

    // Clear commands if requested
    if (shouldClear) {
      await clearCommands(rest);
      
      if (clearOnly) {
        console.log('[Deploy] Clear only mode - skipping deployment');
        return;
      }
    }

    console.log('[Deploy] Loading commands...');

    // Create CommandHandler to load commands
    const commandHandler = new CommandHandler();
    commandHandler.loadCommands();

    const commands = commandHandler.getCommandData();

    console.log(`[Deploy] Deploying ${commands.length} commands...`);

    if (config.guildId) {
      // Deploy to specific guild (faster, for development)
      console.log('[Deploy] Deploying to guild:', config.guildId);
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log('[Deploy] Successfully deployed guild commands!');
    } else {
      // Deploy globally (slower, for production)
      console.log('[Deploy] Deploying globally...');
      await rest.put(Routes.applicationCommands(config.clientId), {
        body: commands,
      });
      console.log('[Deploy] Successfully deployed global commands!');
    }

    console.log('[Deploy] Commands:');
    commands.forEach((cmd: any) => {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    });
  } catch (error) {
    console.error('[Deploy] Error deploying commands:', error);
    process.exit(1);
  }
}

// Run deployment
deployCommands();
