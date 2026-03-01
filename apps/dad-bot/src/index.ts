/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * DA&D Discord Bot
 * 
 * Dedicated bot for Degens Against Decency game and Poker.
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import http from 'http';
import { config, validateConfig } from './config.js';
import { CommandHandler, EventHandler, registerDMHandler } from './handlers/index.js';

async function main() {
  console.log('='.repeat(50));
  console.log('🃏 DA&D Game Bot');
  console.log('Degens Against Decency + Poker');
  console.log('='.repeat(50));

  validateConfig();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  const commandHandler = new CommandHandler();
  const eventHandler = new EventHandler(client, commandHandler);

  commandHandler.loadCommands();
  eventHandler.registerDiscordEvents();
  eventHandler.subscribeToEvents();
  registerDMHandler(client);

  console.log('[Bot] Logging in to Discord...');
  await client.login(config.discordToken);

  // Health check endpoint
  const HEALTH_PORT = process.env.DAD_BOT_HEALTH_PORT || '8082';
  http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        bot: 'dad-bot',
        ready: client.isReady()
      }));
    } else {
      res.writeHead(404);
      res.end();

      console.log('[Bot] Logging in to Discord...');
      await client.login(config.discordToken);

      // Health check endpoint
      const HEALTH_PORT = process.env.DAD_BOT_HEALTH_PORT || '8082';
      http.createServer((req, res) => {
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            bot: 'dad-bot',
            ready: client.isReady()
          }));
        } else {
          res.writeHead(404);
          res.end();
        }
      }).listen(HEALTH_PORT, () => {
        console.log(`[Bot] Health server listening on ${HEALTH_PORT}`);
      });

      const shutdown = async () => {
        console.log('\n[Bot] Shutting down gracefully...');
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
