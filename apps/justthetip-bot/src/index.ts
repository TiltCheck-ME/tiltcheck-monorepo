// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12
// JustTheTip Bot — Main Entry Point

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { config, validateConfig } from './config.js';
import {
  CommandHandler,
  EventHandler,
  registerDMHandler,
} from './handlers/index.js';
import { Connection } from '@solana/web3.js';
import { DatabaseClient } from '@tiltcheck/database';
import { CreditManager } from './services/tipping/credit-manager.js';
import { DepositMonitor } from './services/tipping/deposit-monitor.js';
import { AutoRefundScheduler } from './services/tipping/auto-refund.js';
import { BotWalletService } from './services/tipping/bot-wallet.js';
import { TokenSwapService } from './services/tipping/token-swap.js';
import { TokenDepositMonitor } from './services/tipping/token-deposit-monitor.js';

async function main() {
  const startTime = Date.now();
  const readyMarkerPath = path.join(os.tmpdir(), 'justthetip-bot-ready');
  console.log('\n' + '='.repeat(60));
  console.log('JUSTTHETIP — NON-CUSTODIAL SOL TIPPING BOT');
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
      GatewayIntentBits.GuildVoiceStates,
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

  console.log('[DM] Registering direct message handler...');
  registerDMHandler(client);
  console.log('[DM] DM handler ready\n');

  console.log('[Commands] Loading slash commands...');
  commandHandler.loadCommands();
  console.log('');

  if (config.clientId && config.discordToken && process.env.SKIP_DISCORD_LOGIN !== 'true') {
    const { REST, Routes } = await import('discord.js');
    const rest = new REST().setToken(config.discordToken);
    const commandData = commandHandler.getCommandData();
    try {
      if (config.guildId) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commandData });
        await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
        console.log(`[Commands] ${commandData.length} guild commands registered, global commands cleared\n`);
      } else {
        await rest.put(Routes.applicationCommands(config.clientId), { body: commandData });
        console.log(`[Commands] ${commandData.length} global slash commands registered\n`);
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
    ready = true;
    try {
      fs.writeFileSync(readyMarkerPath, 'ready');
    } catch (e) {
      console.error('[Health] Failed to write ready marker:', e);
    }
  } else {
    await client.login(config.discordToken);
    client.once('ready', () => {
      ready = true;
      console.log('[Discord] Connected and ready!');
      try {
        fs.writeFileSync(readyMarkerPath, 'ready');
      } catch (e) {
        console.error('[Health] Failed to write ready marker:', e);
      }
    });
  }
  console.log('');

  const PORT = config.jttHealthPort;

  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
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
