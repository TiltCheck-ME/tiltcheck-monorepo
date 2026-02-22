/**
 * Deploy Commands Script
 *
 * Registers slash commands with Discord API.
 */

import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { CommandHandler } from './handlers/commands.js';

async function deployCommands() {
  const commandHandler = new CommandHandler();
  commandHandler.loadCommands();

  const commands = commandHandler.getCommandData();

  console.log(`[Deploy] Registering ${commands.length} commands with Discord...`);

  const rest = new REST().setToken(config.discordToken);

  try {
    if (config.guildId) {
      console.log(`[Deploy] Deploying to guild: ${config.guildId}`);

      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );

      console.log(`[Deploy] Successfully registered ${commands.length} guild commands`);
    } else {
      console.log('[Deploy] Deploying globally...');

      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );

      console.log(`[Deploy] Successfully registered ${commands.length} global commands`);
      console.log('[Deploy] Global commands may take up to 1 hour to propagate');
    }

    console.log('\n[Deploy] Registered commands:');
    for (const cmd of commands) {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    }
  } catch (error) {
    console.error('[Deploy] Failed to register commands:', error);
    process.exit(1);
  }
}

deployCommands();
