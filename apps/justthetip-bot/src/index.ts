/**
 * JustTheTip Discord Bot
 * Non-custodial Solana tipping bot
 */

import { Client, Events, GatewayIntentBits } from 'discord.js';
import http from 'http';
// import { eventRouter } from '@tiltcheck/event-router';
import { config, validateConfig } from './config.js';
import { CommandHandler, EventHandler } from './handlers/index.js';
import { registerTipEventHandlers } from './handlers/tip-events.js';

async function main() {
  console.log('='.repeat(50));
  console.log('💸 JustTheTip Discord Bot');
  console.log('='.repeat(50));

  validateConfig();

  // Create Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  // Initialize handlers
  const commandHandler = new CommandHandler();
  const eventHandler = new EventHandler(client, commandHandler);

  // Load commands
  commandHandler.loadCommands();

  // Register event handlers
  eventHandler.registerDiscordEvents();

  // Register tip event handlers for transaction monitoring
  registerTipEventHandlers(client);

  // Login to Discord
  console.log('[JTT Bot] Logging in to Discord...');
  let ready = false;
  
  await client.login(config.discordToken);
  client.once(Events.ClientReady, () => {
    ready = true;
  });

  // Health server
  const HEALTH_PORT = process.env.JTT_HEALTH_PORT || process.env.BOT_PORT || process.env.PORT || '8082';

  function startHealthServer(attempt = 0) {
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        // const history = eventRouter.getHistory({ limit: 300 });
        // const tipEvents = history.filter(e => e.type.startsWith('tip.')).length;
        const tipEvents = 0; // Temporarily disabled
        const mem = process.memoryUsage();
        const body = JSON.stringify({
          service: 'justthetip-bot',
          ready,
          commands: commandHandler.getCommandCount(),
          tipEvents,
          memory: {
            rssMB: +(mem.rss / 1024 / 1024).toFixed(2),
            heapUsedMB: +(mem.heapUsed / 1024 / 1024).toFixed(2)
          },
          uptimeSeconds: Math.round(process.uptime()),
          port: HEALTH_PORT
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(body); return;
      }
      if (req.url === '/ready') {
        if (ready) {
          res.writeHead(200); res.end('OK');
        } else {
          res.writeHead(503); res.end('NOT_READY');
        }
        return;
      }
      res.writeHead(404); res.end();
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && attempt < 5) {
        const nextPort = (parseInt(HEALTH_PORT, 10) + attempt + 1).toString();
        console.warn(`[JTT Bot] Port ${HEALTH_PORT} in use. Retrying on ${nextPort} (attempt ${attempt + 1})`);
        process.env.JTT_HEALTH_PORT = nextPort;
        setTimeout(() => startHealthServer(attempt + 1), 400 * (attempt + 1));
      } else {
        console.error('[JTT Bot] Health server failed to start:', err);
      }
    });

    server.listen(parseInt(HEALTH_PORT, 10), () => {
      console.log(`[JTT Bot] Health server listening on ${HEALTH_PORT}`);
    });
  }

  startHealthServer();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('[JTT Bot] Unhandled rejection:', error);
});

process.on('SIGINT', () => {
  console.log('\n[JTT Bot] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[JTT Bot] Shutting down gracefully...');
  process.exit(0);
});

// Start the bot
main().catch((error) => {
  console.error('[JTT Bot] Fatal error:', error);
  process.exit(1);
});
