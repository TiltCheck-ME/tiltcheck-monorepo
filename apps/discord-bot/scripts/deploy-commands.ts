// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-08
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

const ENTRY_POINT_TYPE = 4; // Discord command type for Activity Entry Points

async function deployCommands() {
  if (process.env.SKIP_DISCORD_LOGIN !== 'true') {
    validateConfig();
  }

  const rest = new REST().setToken(config.discordToken);
  const commandHandler = new CommandHandler();
  const useGuild = process.argv.includes('--guild');
  const shouldClear = process.argv.includes('--clear');

  try {
    if (shouldClear) {
      console.log('Clearing existing commands...');
      if (useGuild && config.guildId) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: [] });
      } else {
        await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
      }
      console.log('Existing commands cleared');
    }

    console.log('Loading commands...');
    commandHandler.loadCommands();

    const commands = commandHandler.getCommandData();
    console.log(`Found ${commands.length} commands to register`);

    interface RegisteredCommand { id: string; name: string; description: string; type?: number; }

    // Fetch existing commands to preserve Entry Point commands (type 4)
    // Discord requires Entry Point commands to be included in bulk PUT operations
    let existingEntryPoints: RESTPostAPIApplicationCommandsJSONBody[] = [];
    if (!useGuild) {
      const existing = await rest.get(Routes.applicationCommands(config.clientId)) as RegisteredCommand[];
      existingEntryPoints = existing
        .filter(cmd => cmd.type === ENTRY_POINT_TYPE)
        .map(({ id, name, description, type }) => ({ id, name, description, type } as unknown as RESTPostAPIApplicationCommandsJSONBody));
      if (existingEntryPoints.length > 0) {
        console.log(`Preserving ${existingEntryPoints.length} Entry Point command(s)`);
      }
    }

    const body = [...commands, ...existingEntryPoints];

    let data: RegisteredCommand[];
    if (useGuild && config.guildId) {
      console.log(`Registering commands to guild: ${config.guildId}...`);
      data = await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body }) as RegisteredCommand[];
    } else {
      console.log('Registering commands globally...');
      data = await rest.put(Routes.applicationCommands(config.clientId), { body }) as RegisteredCommand[];
    }

    console.log(`\nRegistered ${data.length} commands:`);
    data.forEach(cmd => console.log(`  /${cmd.name}`));

    if (!useGuild) {
      console.log('\nNote: Global commands may take up to 1 hour to propagate.');
    }
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
}

deployCommands();
