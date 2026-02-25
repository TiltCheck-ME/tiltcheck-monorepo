/**
 * Command Deployment Script
 * 
 * Registers slash commands with Discord API.
 */

import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { CommandHandler } from './handlers/commands.js';

async function deployCommands() {
  try {
    console.log('[Deploy] Pre-flight check...');
    console.log(`  - Client ID: ${config.clientId}`);
    console.log(`  - Guild ID: ${config.guildId || 'Not set (Global deploy)'}`);
    if (!config.clientId || !config.discordToken) throw new Error('Missing Client ID or Bot Token in config!');

    console.log('[Deploy] Loading commands...');

    // Create CommandHandler to load commands
    const commandHandler = new CommandHandler();
    commandHandler.loadCommands();

    const commands = commandHandler.getCommandData();

    console.log(`[Deploy] Deploying ${commands.length} commands...`);

    const rest = new REST().setToken(config.discordToken);

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
