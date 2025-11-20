/**
 * Deploy Discord Commands
 * Registers slash commands with Discord API
 */

import { REST, Routes } from 'discord.js';
import { config } from '../src/config.js';
import { CommandHandler } from '../src/handlers/commands.js';

const rest = new REST().setToken(config.discordToken);
const commandHandler = new CommandHandler();

async function deployCommands() {
  try {
    console.log('Loading commands...');
    commandHandler.loadCommands();
    
    const commands = commandHandler.getCommandData();
    console.log(`Found ${commands.length} commands to register`);

    console.log('Registering commands with Discord...');
    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    ) as any[];

    console.log(`✅ Successfully registered ${data.length} commands:`);
    data.forEach(cmd => console.log(`  - /${cmd.name}`));
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  }
}

deployCommands();
