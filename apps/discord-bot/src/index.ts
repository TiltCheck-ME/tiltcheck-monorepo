/* Copyright (c) 2026 TiltCheck. All rights reserved. */
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
  initializeAccountabilityPings,
  registerActivityButtonHandlers,
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
import { CreditManager } from './services/tipping/credit-manager.js';
import { DepositMonitor } from './services/tipping/deposit-monitor.js';
import { AutoRefundScheduler } from './services/tipping/auto-refund.js';
import { BotWalletService } from './services/tipping/bot-wallet.js';
import { TokenSwapService } from './services/tipping/token-swap.js';
import { TokenDepositMonitor } from './services/tipping/token-deposit-monitor.js';

import { startLockVaultBackgroundTasks, stopLockVaultBackgroundTasks } from '@tiltcheck/lockvault';
import { getUserBuddies } from '@tiltcheck/db';
import { DiscordActivityManager } from '@tiltcheck/discord-activities';
import { setActivityManager } from './commands/play.js';

async function main() {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('TILTCHECK TRANSPARENCY LAYER - NEUTRALIZE THE HOUSE EDGE');
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

  console.log('[Alerts] Initializing alert service...');
  initializeAlertService(client);
  console.log('[Alerts] Alert service ready\n');

  console.log('[Trust] Initializing trust alerts...');
  TrustAlertsHandler.initialize();
  console.log('[Trust] Trust alerts subscribed\n');

  console.log('[Tilt] Initializing tilt events handler...');
  initializeTiltEventsHandler();
  console.log('[Tilt] Tilt events handler ready\n');

  console.log('[Accountability] Initializing accountability ping system...');
  initializeAccountabilityPings(client);
  console.log('[Accountability] Accountability pings active\n');

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
      const prefix = severity === 'high' ? '[HIGH RISK]' : severity === 'medium' ? '[AUDIT ALERT]' : '[EDGE EQUALIZER]';
      
      // Notify the User
      await user.send(`${prefix} TILTCHECK EDGE EQUALIZER AUDIT\n\n${message}\n\nDo not get rinsed. Secure the profit.\nView Hub: https://tiltcheck.me/dashboard`);
      console.log(`[TiltAgent] Transparency signal sent to ${userId} (${severity})`);


      // Notify Buddies (Accountability)
      if (severity === 'high' || severity === 'medium') {
          const buddies = await getUserBuddies(userId);
          if (buddies && buddies.length > 0) {
              const buddyMsg = `[BUDDY ALERT]: Your friend <@${userId}> is showing **${severity.toUpperCase()}** signs of tilt.\n\nTiltCheck Message Sent to Them:\n> ${message.substring(0, 500)}${message.length > 500 ? '...' : ''}\n\nCheck in on them. Friends don't let friends tilt-drain.`;
              
              for (const buddyRel of buddies) {
                  try {
                      const buddy = await client.users.fetch(buddyRel.buddy_id);
                      await buddy.send(buddyMsg);
                      console.log(`[Buddy] Alert sent to ${buddyRel.buddy_id} for user ${userId}`);
                  } catch (e) {
                      console.warn(`[Buddy] Failed to alert ${buddyRel.buddy_id}:`, e);
                  }
              }
          }
      }
    } catch (err) {
      console.error(`[TiltAgent] Failed to process intervention for ${userId}:`, err);
    }
  });
  console.log('[TiltAgent] Scan loop active\n');
  if (process.env.ELASTIC_URL && process.env.ELASTIC_API_KEY) {
    const regsChannelId = process.env.REGULATIONS_ALERTS_CHANNEL_ID || '';
    const regsGuildId = process.env.REGULATIONS_ALERTS_GUILD_ID || '';

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

  console.log('[LockVault] Starting background timer tasks...');
  startLockVaultBackgroundTasks();

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

  // Auto-register slash commands with Discord on every startup
  if (config.clientId && config.discordToken && process.env.SKIP_DISCORD_LOGIN !== 'true') {
    const { REST, Routes } = await import('discord.js');
    const rest = new REST().setToken(config.discordToken);
    const commandData = commandHandler.getCommandData();
    try {
      if (config.guildId) {
        // Guild deploy — also clear global to prevent duplicates showing in Discord
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commandData });
        await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
        console.log(`[Commands] ${commandData.length} guild commands registered, global commands cleared\n`);
      } else {
        // Global deploy — clear any stale guild commands if guildId was previously set
        await rest.put(Routes.applicationCommands(config.clientId), { body: commandData });
        console.log(`[Commands] ${commandData.length} global slash commands registered\n`);
      }
    } catch (err) {
      console.error('[Commands] Failed to register slash commands:', err);
    }
  }

  console.log('[Activities] Initializing Discord Activities SDK...');
  const activityManager = new DiscordActivityManager(client.application?.id || '');
  setActivityManager(activityManager);
  registerActivityButtonHandlers(activityManager);
  console.log('[Activities] Discord Activities SDK initialized\n');

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

  const HEALTH_PORT = process.env.PORT || '8080';
  const PORT = parseInt(HEALTH_PORT, 10);

  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const body = JSON.stringify({
        service: 'discord-bot',
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

    const autoRefundIntervalMs = Math.max(
      60_000,
      Number(process.env.JUSTTHETIP_AUTO_REFUND_INTERVAL_MS || 5 * 60 * 1000)
    );
    autoRefund = new AutoRefundScheduler(cm, botWallet.sendSOL.bind(botWallet), autoRefundIntervalMs);



    dMonitor.start();
    tdMonitor.start();
    autoRefund.start();
    console.log('[Tipping] Credit system active\n');
  }

  const shutdown = async () => {
    console.log('\n[Bot] Shutting down gracefully...');

    stopTiltAgentLoop();
    stopRegulationsNotifier();
    stopLockVaultBackgroundTasks();

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



