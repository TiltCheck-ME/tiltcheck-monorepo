// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10

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

    const commandHandler = new CommandHandler();
    commandHandler.loadCommands();

    const commands = commandHandler.getCommandData();

    console.log(`[Deploy] Deploying ${commands.length} commands...`);

    const rest = new REST().setToken(config.discordToken);

    if (config.guildId) {
      console.log('[Deploy] Deploying to guild:', config.guildId);
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
      console.log('[Deploy] Guild commands deployed, global commands cleared!');
    } else {
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

deployCommands();
