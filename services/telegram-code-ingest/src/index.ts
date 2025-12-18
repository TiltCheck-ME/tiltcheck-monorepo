/**
 * Telegram Code Ingest Service
 * 
 * Main entry point for the service that monitors Telegram channels
 * for Stake promo codes and stores them in the database.
 */

import { TelegramMonitor } from './telegram-monitor.js';
import { InMemoryCodeDatabase } from './database.js';
import type { TelegramConfig } from './types.js';

/**
 * Load configuration from environment variables
 */
function loadConfig(): TelegramConfig {
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;
  const sessionString = process.env.TELEGRAM_SESSION_STRING;
  const channels = process.env.TELEGRAM_CHANNELS?.split(',').map((c) => c.trim()) || [
    '@StakeUSDailyDrops',
    '@StakecomDailyDrops',
  ];
  const pollInterval = parseInt(process.env.TELEGRAM_POLL_INTERVAL || '60', 10);

  if (!apiId || !apiHash) {
    throw new Error(
      'Missing required environment variables: TELEGRAM_API_ID, TELEGRAM_API_HASH'
    );
  }

  return {
    apiId,
    apiHash,
    sessionString,
    channels,
    pollInterval,
  };
}

/**
 * Main function
 */
async function main() {
  console.log('=== Telegram Code Ingest Service ===');
  console.log('Loading configuration...');

  const config = loadConfig();
  const database = new InMemoryCodeDatabase();

  // TODO: Replace with actual database implementation
  // Example: const database = new PostgresCodeDatabase(process.env.DATABASE_URL);

  const monitor = new TelegramMonitor(config, database);

  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    monitor.stop();
    process.exit(0);
  });

  // Start monitoring
  await monitor.start();

  console.log('Service is running. Press Ctrl+C to stop.');
}

// Run the service
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
