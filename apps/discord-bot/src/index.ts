/**
 * TiltCheck Discord Bot
 * Main entry point for the safety and moderation bot.
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import http from 'http';
import fs from 'fs';
import { config, validateConfig } from './config.js';
import {
  CommandHandler,
  EventHandler,
  registerDMHandler,
  initializeTiltEventsHandler,
} from './handlers/index.js';
import { initializeAlertService } from './services/alert-service.js';
import { TrustAlertsHandler } from './handlers/trust-alerts-handler.js';
import { ensureTelemetryIndex } from './services/elastic-telemetry.js';
import { ensureTiltAgentContextIndex } from './services/tilt-agent-context-store.js';
import { startTiltAgentLoop, stopTiltAgentLoop } from './services/tilt-agent.js';
import { startRegulationsNotifier, stopRegulationsNotifier } from './services/regulations-notifier.js';
import { initializeGameplayComplianceBridge } from './services/gameplay-compliance-bridge.js';

import { startTrustAdapter } from '@tiltcheck/discord-utils/trust-adapter';
import { Connection } from '@solana/web3.js';
import { DatabaseClient } from '@tiltcheck/database';
import { CreditManager, DepositMonitor, AutoRefundScheduler } from '@tiltcheck/justthetip';
import { BotWalletService } from './services/tipping/bot-wallet.js';
import { TokenSwapService } from './services/tipping/token-swap.js';
import { TokenDepositMonitor } from './services/tipping/token-deposit-monitor.js';
import { setCreditDeps } from './commands/tip.js';

async function main() {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('TiltCheck Discord Bot - Powered by TiltCheck');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toLocaleString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
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

  console.log('[Alerts] Initializing alert service...');
  initializeAlertService(client);
  console.log('[Alerts] Alert service ready\n');

  console.log('[Trust] Initializing trust alerts...');
  TrustAlertsHandler.initialize();
  console.log('[Trust] Trust alerts subscribed\n');

  console.log('[Tilt] Initializing tilt events handler...');
  initializeTiltEventsHandler();
  console.log('[Tilt] Tilt events handler ready\n');

  console.log('[Elastic] Ensuring telemetry index...');
  await ensureTelemetryIndex();
  console.log('[Elastic] Telemetry index ready\n');

  console.log('[Elastic] Ensuring tilt-agent context index...');
  await ensureTiltAgentContextIndex();
  console.log('[Elastic] Tilt-agent context index ready\n');

  console.log('[TiltAgent] Starting background scan loop...');
  startTiltAgentLoop(async (userId, message, severity) => {
    try {
      const user = await client.users.fetch(userId);
      const prefix = severity === 'high' ? '[HIGH]' : severity === 'medium' ? '[MED]' : '[INFO]';
      await user.send(`${prefix} TiltCheck Intervention\n\n${message}`);
      console.log(`[TiltAgent] Intervention DM sent to ${userId} (${severity})`);
    } catch (err) {
      console.error(`[TiltAgent] Failed to DM user ${userId}:`, err);
    }
  });
  console.log('[TiltAgent] Scan loop active\n');
  if (process.env.ELASTIC_URL && process.env.ELASTIC_API_KEY) {
    const regsChannelId = process.env.REGULATIONS_ALERTS_CHANNEL_ID || '1447524353263665252';
    const regsGuildId = process.env.REGULATIONS_ALERTS_GUILD_ID || '1446973117472964620';

    startRegulationsNotifier(client, {
      elasticUrl: process.env.ELASTIC_URL,
      elasticApiKey: process.env.ELASTIC_API_KEY,
      channelId: regsChannelId,
      guildId: regsGuildId,
      intervalMs: Number(process.env.REGULATIONS_NOTIFIER_INTERVAL_MS || 6 * 60 * 60 * 1000),
      maxRowsInMessage: Number(process.env.REGULATIONS_NOTIFIER_MAX_ROWS || 15),
    });
  } else {
    console.log('[Regulations] Skipping notifier (Elastic not configured)');
  }

  initializeGameplayComplianceBridge(client);

  console.log('[DM] Registering direct message handler...');
  registerDMHandler(client);
  console.log('[DM] DM handler ready\n');

  console.log('[Adapter] Starting trust adapter...');
  startTrustAdapter({
    onFormatted: (formatted: string) => {
      console.log('[TrustAdapter]', formatted);
    },
  });
  console.log('[Adapter] Trust adapter ready\n');

  console.log('[Commands] Loading slash commands...');
  commandHandler.loadCommands();
  console.log('');

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
    ready = true;
    try {
      fs.writeFileSync('/tmp/bot-ready', 'ready');
      console.log('[Health] Ready marker written');
    } catch (e) {
      console.error('[Health] Failed to write ready marker:', e);
    }
  } else {
    await client.login(config.discordToken);
    client.once('ready', () => {
      ready = true;
      console.log('[Discord] Connected and ready!');
      try {
        fs.writeFileSync('/tmp/bot-ready', 'ready');
        console.log('[Health] Ready marker written');
      } catch (e) {
        console.error('[Health] Failed to write ready marker:', e);
      }
    });
  }
  console.log('');

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

  // Tipping & Solana Consolidation
  let autoRefund: AutoRefundScheduler | undefined;
  let dMonitor: DepositMonitor | undefined;
  let tdMonitor: TokenDepositMonitor | undefined;

  if (config.botWalletPrivateKey) {
    console.log('[Tipping] Initializing consolidated credit system...');
    const solConnection = new Connection(config.solanaRpcUrl, 'confirmed');
    const botWallet = new BotWalletService(config.botWalletPrivateKey, solConnection);

    const dbClient = new DatabaseClient({
      url: config.supabaseUrl,
      apiKey: config.supabaseServiceRoleKey,
    });

    const cm = new CreditManager(dbClient);
    dMonitor = new DepositMonitor(solConnection, botWallet.address, cm);

    const swapService = new TokenSwapService(config.botWalletPrivateKey, solConnection);
    tdMonitor = new TokenDepositMonitor(solConnection, botWallet.address, cm, swapService);

    autoRefund = new AutoRefundScheduler(cm, botWallet.sendSOL.bind(botWallet), 12 * 60 * 60 * 1000);

    setCreditDeps(cm, dMonitor, botWallet, tdMonitor);

    dMonitor.start();
    tdMonitor.start();
    autoRefund.start();
    console.log('[Tipping] Credit system active\n');
  }

  const shutdown = async () => {
    console.log('\n[Bot] Shutting down gracefully...');

    stopTiltAgentLoop();
    stopRegulationsNotifier();

    if (autoRefund) autoRefund.stop();
    if (dMonitor) dMonitor.stop();
    if (tdMonitor) tdMonitor.stop();

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



