// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
// DAD Bot — Main Entry Point

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import http from 'http';
import { config, validateConfig } from './config.js';
import {
  CommandHandler,
  EventHandler,
  registerActivityButtonHandlers,
} from './handlers/index.js';
import { setActivityManager } from './commands/play.js';
import { setLaunchActivityManager } from './commands/launch.js';
import { DiscordActivityManager } from '@tiltcheck/discord-activities';
import { getRegisteredCommandData } from './command-registration.js';

async function main() {
  const startTime = Date.now();
  console.log('[DAD-BOT] Booting...');

  if (process.env.SKIP_DISCORD_LOGIN !== 'true') {
    validateConfig();
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  const commandHandler = new CommandHandler();
  const eventHandler = new EventHandler(client, commandHandler);
  commandHandler.loadCommands();

  if (config.clientId && config.discordToken && process.env.SKIP_DISCORD_LOGIN !== 'true') {
    const { REST, Routes } = await import('discord.js');
    const rest = new REST().setToken(config.discordToken);
    const allCommands = getRegisteredCommandData(commandHandler);

    try {
      if (config.guildId) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: allCommands });
        await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
      } else {
        await rest.put(Routes.applicationCommands(config.clientId), { body: allCommands });
      }
      console.log(`[DAD-BOT] ${allCommands.length} commands registered`);
    } catch (err) {
      console.error('[DAD-BOT] Command registration failed:', err);
    }
  }

  eventHandler.registerDiscordEvents();
  eventHandler.subscribeToEvents();

  let ready = false;
  if (process.env.SKIP_DISCORD_LOGIN === 'true') {
    const activityManager = new DiscordActivityManager('');
    setActivityManager(activityManager);
    setLaunchActivityManager(activityManager);
    registerActivityButtonHandlers(activityManager);
    ready = true;
  } else {
    await client.login(config.discordToken);
    client.once('ready', () => {
      const activityManager = new DiscordActivityManager(client.application?.id || config.clientId);
      setActivityManager(activityManager);
      setLaunchActivityManager(activityManager);
      registerActivityButtonHandlers(activityManager);
      ready = true;
      console.log('[DAD-BOT] Ready');
    });
  }

  const HEALTH_PORT = process.env.PORT || process.env.DAD_BOT_HEALTH_PORT || process.env.DISCORD_BOT_HEALTH_PORT || '8080';
  const PORT = parseInt(HEALTH_PORT, 10);

  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const body = JSON.stringify({
        service: 'dad-bot',
        ready,
        uptime: Math.round((Date.now() - startTime) / 1000),
        commands: commandHandler.getAllCommands().length
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  healthServer.listen(PORT, () => {
    console.log(`[DAD-BOT] Health on :${PORT}`);
  });

  healthServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
      process.exit(1);
    }
    throw err;
  });

  const shutdown = async () => {
    if (healthServer.listening) healthServer.close();
    if (client.isReady()) await client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

process.on('unhandledRejection', (error) => {
  console.error('[Bot] Unhandled rejection:', error);
});

main().catch((error) => {
  console.error('[Bot] Fatal error:', error);
  process.exit(1);
});
