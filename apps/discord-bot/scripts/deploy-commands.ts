/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Deploy Discord Commands
 * Registers slash commands with Discord API
 * 
 * Usage:
 *   npx tsx scripts/deploy-commands.ts           # Deploy globally
 *   npx tsx scripts/deploy-commands.ts --guild   # Deploy to guild only (faster)
 *   npx tsx scripts/deploy-commands.ts --clear   # Clear before deploying
 */

import { REST, Routes, type RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { config, validateConfig } from '../src/config.js';
import { CommandHandler } from '../src/handlers/commands.js';

async function deployCommands() {
  // Skip validation in CI/smoke mode
  if (process.env.SKIP_DISCORD_LOGIN !== 'true') {
    validateConfig();
  }

  const rest = new REST().setToken(config.discordToken);
  const commandHandler = new CommandHandler();
  const useGuild = process.argv.includes('--guild');
  const shouldClear = process.argv.includes('--clear');

  try {
    // Clear existing commands if requested
    if (shouldClear) {
      console.log('🗑️  Clearing existing commands...');
      if (useGuild && config.guildId) {
        await rest.put(
          Routes.applicationGuildCommands(config.clientId, config.guildId),
          { body: [] }
        );
      } else {
        await rest.put(
          Routes.applicationCommands(config.clientId),
          { body: [] }
        );
      }
      console.log('✅ Existing commands cleared');
    }

    console.log('📋 Loading commands...');
    commandHandler.loadCommands();
    
    const commands = commandHandler.getCommandData();
    console.log(`📦 Found ${commands.length} commands to register`);

    // Discord API response includes name and description
    interface RegisteredCommand {
      name: string;
      description: string;
    }

    let data: RegisteredCommand[];
    if (useGuild && config.guildId) {
      console.log(`🚀 Registering commands to guild: ${config.guildId}...`);
      data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      ) as RegisteredCommand[];
    } else {
      console.log('🌐 Registering commands globally...');
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      ) as RegisteredCommand[];
    }

    console.log(`\n✅ Successfully registered ${data.length} commands:`);
    data.forEach(cmd => console.log(`  /${cmd.name} - ${cmd.description}`));
    
    if (!useGuild) {
      console.log('\n💡 Note: Global commands may take up to 1 hour to propagate.');
    }
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  }
}

deployCommands();
