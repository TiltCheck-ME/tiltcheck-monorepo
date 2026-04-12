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
import { DiscordActivityManager } from '@tiltcheck/discord-activities';
import { getRegisteredCommandData } from './command-registration.js';

async function main() {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('DEGENS AGAINST DECENCY — CARD GAMES AND TRIVIA BOT');
  console.log('='.repeat(60));
  console.log(`SESSION INITIALIZED at: ${new Date().toLocaleString()}`);
  console.log(`ENV: ${process.env.NODE_ENV || 'production'}`);
  console.log('='.repeat(60) + '\n');

  if (process.env.SKIP_DISCORD_LOGIN === 'true') {
    console.log('[Config] SKIP_DISCORD_LOGIN enabled - skipping Discord auth');
  } else {
    console.log('[Config] Validating configuration...');
    validateConfig();
    console.log('[Config] Configuration validated\n');
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

  console.log('[Handlers] Initializing handlers...');
  const commandHandler = new CommandHandler();
  const eventHandler = new EventHandler(client, commandHandler);
  console.log('[Handlers] Handlers initialized\n');

  console.log('[Commands] Loading slash commands...');
  commandHandler.loadCommands();
  console.log('');

  if (config.clientId && config.discordToken && process.env.SKIP_DISCORD_LOGIN !== 'true') {
    const { REST, Routes } = await import('discord.js');
    const rest = new REST().setToken(config.discordToken);
    const allCommands = getRegisteredCommandData(commandHandler);

    try {
      if (config.guildId) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: allCommands });
        await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
        console.log(`[Commands] ${allCommands.length} guild commands registered (incl. activity entry point), global cleared\n`);
      } else {
        await rest.put(Routes.applicationCommands(config.clientId), { body: allCommands });
        console.log(`[Commands] ${allCommands.length} global commands registered (incl. activity entry point)\n`);
      }
    } catch (err) {
      console.error('[Commands] Failed to register slash commands:', err);
    }
  }

  console.log('[Events] Registering Discord events...');
  eventHandler.registerDiscordEvents();
  console.log('[Events] Discord events registered');

  console.log('[Events] Subscribing to EventRouter...');
  eventHandler.subscribeToEvents();
  console.log('[Events] EventRouter subscriptions active\n');

  console.log('[Discord] Connecting to Discord...');
  let ready = false;
  if (process.env.SKIP_DISCORD_LOGIN === 'true') {
    console.log('[Discord] CI mode - skipping Discord login');
    // Initialize activity manager with empty ID in CI mode
    const activityManager = new DiscordActivityManager('');
    setActivityManager(activityManager);
    registerActivityButtonHandlers(activityManager);
    ready = true;
  } else {
    await client.login(config.discordToken);
    client.once('ready', () => {
      // Initialize activity manager after login so client.application.id is available
      console.log('[Activities] Initializing Discord Activities SDK...');
      const activityManager = new DiscordActivityManager(client.application?.id || config.clientId);
      setActivityManager(activityManager);
      registerActivityButtonHandlers(activityManager);
      console.log('[Activities] Discord Activities SDK initialized\n');
      ready = true;
      console.log('[Discord] Connected and ready!');
    });
  }
  console.log('');

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
    console.log(`[Health] Bot health check listening on port ${PORT}`);
    console.log('[Bot] Ready');
  });

  healthServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
      process.exit(1);
    }
    throw err;
  });

  const shutdown = async () => {
    console.log('\n[Bot] Shutting down gracefully...');

    if (healthServer.listening) {
      healthServer.close();
    }

    if (client.isReady()) {
      console.log('[Bot] Destroying Discord client...');
      await client.destroy();
    }

    console.log('[Bot] Shutdown complete.');
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
