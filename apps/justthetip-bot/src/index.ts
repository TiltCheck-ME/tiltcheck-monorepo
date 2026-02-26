/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * JustTheTip Bot — Custodial Credit-Based Solana Tipping
 */

import { Client, GatewayIntentBits } from 'discord.js';
import { Connection } from '@solana/web3.js';
import http from 'http';
import { config, validateConfig } from './config.js';
import { CommandHandler, EventHandler } from './handlers/index.js';
import { BotWalletService } from './services/bot-wallet.js';
import { TokenSwapService } from './services/token-swap.js';
import { TokenDepositMonitor } from './services/token-deposit-monitor.js';
import {
  CreditManager,
  DepositMonitor,
  AutoRefundScheduler,
} from '@tiltcheck/justthetip';
import { DatabaseClient } from '@tiltcheck/database';
import { setCreditDeps } from './commands/tip.js';

async function main() {
  console.log('='.repeat(50));
  console.log('JustTheTip Bot');
  console.log('Custodial Credit-Based Solana Tipping');
  console.log('='.repeat(50));

  validateConfig();

  // Initialize Solana connection
  const connection = new Connection(config.solanaRpcUrl, 'confirmed');

  // Initialize bot wallet
  const botWallet = new BotWalletService(config.botWalletPrivateKey, connection);
  console.log(`[Bot] Bot wallet: ${botWallet.address}`);

  // Initialize database (optional — falls back to JSON file)
  const db = new DatabaseClient({
    url: config.supabaseUrl,
    apiKey: config.supabaseServiceRoleKey,
  });
  if (db.isConnected()) {
    console.log('[Bot] Database connected');
  } else {
    console.log('[Bot] Database not configured — using file fallback');
  }

  // Initialize credit system
  const creditManager = new CreditManager(db);
  const depositMonitor = new DepositMonitor(connection, botWallet.address, creditManager, {
    onDepositConfirmed: (discordId, amountLamports, _signature) => {
      console.log(`[Bot] Deposit confirmed: ${discordId} +${amountLamports / 1e9} SOL`);
    },
  });
  const tokenSwapService = new TokenSwapService(config.botWalletPrivateKey, connection);
  const tokenDepositMonitor = new TokenDepositMonitor(
    connection,
    botWallet.address,
    creditManager,
    tokenSwapService,
    {
      onSwapDeposit: (discordId, inputToken, outputLamports, _signature) => {
        console.log(
          `[Bot] Token deposit confirmed: ${discordId} +${outputLamports / 1e9} SOL from ${inputToken} swap`
        );
      },
    }
  );
  const autoRefund = new AutoRefundScheduler(
    creditManager,
    async (walletAddress, amountLamports) => {
      try {
        return await botWallet.sendSOL(walletAddress, amountLamports);
      } catch (err) {
        console.error('[AutoRefund] Send failed:', err);
        return null;
      }
    }
  );

  // Inject dependencies into tip command
  setCreditDeps(creditManager, depositMonitor, botWallet, tokenDepositMonitor);

  // Initialize Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const commandHandler = new CommandHandler();
  const eventHandler = new EventHandler(client, commandHandler);

  commandHandler.loadCommands();
  eventHandler.registerDiscordEvents();
  eventHandler.subscribeToEvents();

  // Start services
  depositMonitor.start();
  tokenDepositMonitor.start();
  autoRefund.start();

  console.log('[Bot] Logging in to Discord...');
  await client.login(config.discordToken);

  // Health check endpoint
  http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        bot: 'justthetip-bot',
        ready: client.isReady(),
        botWallet: botWallet.address,
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  }).listen(config.healthPort, () => {
    console.log(`[Bot] Health server listening on ${config.healthPort}`);
  });
}

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

main().catch((error) => {
  console.error('[Bot] Fatal error:', error);
  process.exit(1);
});
