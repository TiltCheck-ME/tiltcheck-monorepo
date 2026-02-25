/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Clear Discord Commands
 * Removes all slash commands from Discord API registry
 * 
 * Usage:
 *   npx tsx scripts/clear-commands.ts           # Clear global commands
 *   npx tsx scripts/clear-commands.ts --guild   # Clear guild commands only
 */

import { REST, Routes } from 'discord.js';
import { config, validateConfig } from '../src/config.js';

async function clearCommands() {
  // Skip validation in CI/smoke mode
  if (process.env.SKIP_DISCORD_LOGIN !== 'true') {
    validateConfig();
  }

  const rest = new REST().setToken(config.discordToken);
  const clearGuildOnly = process.argv.includes('--guild');
  const clearGlobalOnly = process.argv.includes('--global');
  const shouldClearGuild = config.guildId && (clearGuildOnly || !clearGlobalOnly);
  const shouldClearGlobal = !clearGuildOnly;

  try {
    if (shouldClearGuild) {
      // Clear guild-specific commands
      console.log(`🗑️  Clearing guild commands for guild: ${config.guildId}...`);
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId!),
        { body: [] }
      );
      console.log('✅ Guild commands cleared successfully');
    }

    if (shouldClearGlobal) {
      // Clear global commands
      console.log('🗑️  Clearing global commands...');
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: [] }
      );
      console.log('✅ Global commands cleared successfully');
    }

    console.log('\n📋 All commands have been removed from the Discord registry.');
    console.log('💡 Run `npx tsx scripts/deploy-commands.ts` to re-register commands.');
  } catch (error) {
    console.error('❌ Failed to clear commands:', error);
    process.exit(1);
  }
}

clearCommands();
