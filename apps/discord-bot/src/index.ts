/**
 * JustTheTip Discord Bot
 * Powered by TiltCheck
 * 
 * Main entry point for the Discord bot.
 * Integrates all TiltCheck modules via Event Router.
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import http from 'http';
import { config, validateConfig } from './config.js';
import { CommandHandler, EventHandler, registerDMHandler } from './handlers/index.js';

// Import modules to initialize them
import '@tiltcheck/suslink';
import { startTrustAdapter } from '@tiltcheck/discord-utils/trust-adapter';

async function main() {
  console.log('='.repeat(50));
  console.log('🪙 JustTheTip Bot - Powered by TiltCheck');
  console.log('='.repeat(50));

  // Validate configuration unless skipping login (CI smoke)
  if (process.env.SKIP_DISCORD_LOGIN === 'true') {
    console.log('[Bot] SKIP_DISCORD_LOGIN set – skipping config validation');
  } else {
    validateConfig();
  }

  // Create Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel], // Required for DM support
  });

  // Initialize handlers
  const commandHandler = new CommandHandler();
  const eventHandler = new EventHandler(client, commandHandler);

  // Register DM handler for natural language assistance
  registerDMHandler(client);

  // Start trust adapter to listen for trust events and log formatted output
  startTrustAdapter({
    onFormatted: (formatted: string, raw: any) => {
      console.log('[TrustAdapter]', formatted, raw.metadata ? { meta: raw.metadata } : '');
    },
  });

  // Load commands
  commandHandler.loadCommands();

  // Register event handlers
  eventHandler.registerDiscordEvents();
  eventHandler.subscribeToEvents();

  // Login to Discord
  console.log('[Bot] Logging in to Discord...');
  let ready = false;
  if (process.env.SKIP_DISCORD_LOGIN === 'true') {
    console.log('[Bot] SKIP_DISCORD_LOGIN enabled - skipping Discord login (CI smoke)');
    ready = true; // mark ready immediately for health check
  } else {
    await client.login(config.discordToken);
    client.once('ready', () => { ready = true; });
  }

  // Health server
  const HEALTH_PORT = process.env.DISCORD_BOT_HEALTH_PORT || '8081';
  http.createServer((req, res) => {
    if (req.url === '/health') {
      const body = JSON.stringify({ service: 'justthetip-bot', ready, commands: commandHandler.getAllCommands().length });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
      return;
    }
    res.writeHead(404); res.end();
  }).listen(parseInt(HEALTH_PORT, 10), () => {
    console.log(`[Bot] Health server listening on ${HEALTH_PORT}`);
  });
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('[Bot] Unhandled rejection:', error);
});

process.on('SIGINT', () => {
  console.log('\n[Bot] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Bot] Shutting down gracefully...');
  process.exit(0);
});

// Start the bot
main().catch((error) => {
  console.error('[Bot] Fatal error:', error);
  process.exit(1);
});
