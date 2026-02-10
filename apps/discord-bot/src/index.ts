/**
 * JustTheTip Discord Bot
 * Powered by TiltCheck
 * 
 * Main entry point for the Discord bot.
 * Integrates all TiltCheck modules via Event Router.
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import http from 'http';
import fs from 'fs';
import { config, validateConfig } from './config.js';
import { CommandHandler, EventHandler, registerDMHandler, initializeTiltEventsHandler, initializeCollectClock } from './handlers/index.js';
import { initializeAlertService } from './services/alert-service.js';
import { TrustAlertsHandler } from './handlers/trust-alerts-handler.js';

// Import modules to initialize them
// import '@tiltcheck/suslink';
import { startTrustAdapter } from '@tiltcheck/discord-utils/trust-adapter';

async function main() {
  const startTime = Date.now();
  console.log('\n' + '═'.repeat(60));
  console.log('🪙  JustTheTip Discord Bot - Powered by TiltCheck');
  console.log('═'.repeat(60));
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('═'.repeat(60) + '\n');

  // Validate configuration unless skipping login (CI smoke)
  if (process.env.SKIP_DISCORD_LOGIN === 'true') {
    console.log('⚠️  [Config] SKIP_DISCORD_LOGIN enabled - skipping Discord auth');
  } else {
    console.log('📋 [Config] Validating configuration...');
    validateConfig();
    console.log('✅ [Config] Configuration validated\n');
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
  console.log('🔌 [Handlers] Initializing handlers...');
  const commandHandler = new CommandHandler();
  const eventHandler = new EventHandler(client, commandHandler);
  console.log('✅ [Handlers] Handlers initialized\n');

  // Initialize alert service for posting to channels
  console.log('🚨 [Alerts] Initializing alert service...');
  initializeAlertService(client);
  console.log('✅ [Alerts] Alert service ready\n');

  // Initialize trust alerts handler to post events to Discord
  console.log('📊 [Trust] Skipped - Trust alerts disabled');
  // TrustAlertsHandler.initialize();
  // console.log('✅ [Trust] Trust alerts subscribed\n');

  // Initialize tilt events handler to persist to backend
  console.log('💾 [Tilt] Skipped - Tilt events handler disabled');
  // initializeTiltEventsHandler();
  // console.log('✅ [Tilt] Tilt events handler ready\n');

  // Register DM handler for natural language assistance
  console.log('💬 [DM] Registering direct message handler...');
  registerDMHandler(client);
  console.log('✅ [DM] DM handler ready\n');

  // Initialize CollectClock
  initializeCollectClock();

  // Start trust adapter to listen for trust events and log formatted output
  console.log('📈 [Adapter] Skipped - Trust adapter disabled');
  /*
  startTrustAdapter({
    onFormatted: (formatted: string) => {
      console.log('  📡 [TrustAdapter]', formatted);
    },
  });
  console.log('✅ [Adapter] Trust adapter ready\n');
  */

  // Load commands
  console.log('⚡ [Commands] Loading slash commands...');
  commandHandler.loadCommands();
  console.log('');

  // Register event handlers
  console.log('👂 [Events] Registering Discord events...');
  eventHandler.registerDiscordEvents();
  console.log('✅ [Events] Discord events registered');
  
  console.log('📡 [Events] Subscribing to EventRouter...');
  eventHandler.subscribeToEvents();
  console.log('✅ [Events] EventRouter subscriptions active\n');

  // Login to Discord
  console.log('🔐 [Discord] Connecting to Discord...');
  let ready = false;
  if (process.env.SKIP_DISCORD_LOGIN === 'true') {
    console.log('⚠️  [Discord] CI mode - skipping Discord login');
    ready = true; // mark ready immediately for health check
    // Write ready marker for health checks
    try {
      fs.writeFileSync('/tmp/bot-ready', 'ready');
      console.log('✅ [Health] Ready marker written');
    } catch (e) {
      console.error('❌ [Health] Failed to write ready marker:', e);
    }
  } else {
    await client.login(config.discordToken);
    client.once('ready', () => {
      ready = true;
      console.log('✅ [Discord] Connected and ready!');
      // Write ready marker for health checks
      try {
        fs.writeFileSync('/tmp/bot-ready', 'ready');
        console.log('✅ [Health] Ready marker written');
      } catch (e) {
        console.error('❌ [Health] Failed to write ready marker:', e);
      }
    });
  }
  console.log('');

  // Health server
  const HEALTH_PORT = process.env.DISCORD_BOT_HEALTH_PORT || '8081';
  const PORT = parseInt(HEALTH_PORT, 10);
  
  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      const body = JSON.stringify({ 
        service: 'justthetip-bot', 
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
    console.log(`🏥 [Health] Bot health check listening on port ${PORT}`);
    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ JustTheTip Bot fully initialized and ready!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📊 Status Summary:');
    console.log(`  ├─ Health Endpoint: http://localhost:${PORT}/health`);
    console.log(`  ├─ Status: Ready`);
    console.log(`  ├─ Commands Loaded: ${commandHandler.getAllCommands().length}`);
    console.log(`  └─ Uptime: ${Math.round((Date.now() - startTime) / 1000)}s`);
    console.log('');
  });

  healthServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error('\n❌ [Error] Port conflict!');
      console.error(`   Port ${PORT} is already in use.`);
      console.error('   ✨ Solution: Use a different port:');
      console.error(`      export DISCORD_BOT_HEALTH_PORT=9081`);
      console.error(`      pnpm --filter @tiltcheck/discord-bot dev`);
      process.exit(1);
    }
    throw err;
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
