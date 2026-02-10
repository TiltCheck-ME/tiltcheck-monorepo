/**
 * Telegram Code Ingest Service
 * 
 * Main entry point for the service that monitors Telegram channels
 * for Stake promo codes and stores them in the database.
 */

import { TelegramMonitor } from './telegram-monitor.js';
import { RealTelegramMonitor } from './telegram-client.js';
import { InMemoryCodeDatabase } from './database.js';
import { PostgresCodeDatabase } from './postgres-database.js';
import type { TelegramConfig, CodeDatabase } from './types.js';

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
 * Create database instance based on configuration
 */
async function createDatabase(): Promise<CodeDatabase> {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl && !databaseUrl.includes('mock')) {
    console.log('[Database] Using PostgreSQL database');
    const db = new PostgresCodeDatabase(databaseUrl);
    await db.initialize();
    return db;
  }

  console.log('[Database] Using in-memory database (development mode)');
  return new InMemoryCodeDatabase();
}

/**
 * Create monitor instance based on configuration
 */
function createMonitor(
  config: TelegramConfig,
  database: CodeDatabase,
  useRealClient: boolean
): TelegramMonitor | RealTelegramMonitor {
  if (useRealClient) {
    console.log('[Monitor] Using real Telegram MTProto client');
    return new RealTelegramMonitor(config, database);
  }

  console.log('[Monitor] Using placeholder polling monitor');
  return new TelegramMonitor(config, database);
}

/**
 * Main function
 */
async function main() {
  console.log('=== Telegram Code Ingest Service ===');
  console.log('Loading configuration...');

  const config = loadConfig();
  const database = await createDatabase();

  // Use real Telegram client if session string is provided or in production
  const useRealClient =
    !!config.sessionString || process.env.NODE_ENV === 'production';

  const monitor = createMonitor(config, database, useRealClient);

  // Handle shutdown gracefully
  const shutdown = async () => {
    console.log('\nShutting down...');
    await monitor.stop();
    
    if ('close' in database && typeof database.close === 'function') {
      await database.close();
    }
    
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start monitoring
  await monitor.start();

  console.log('Service is running. Press Ctrl+C to stop.');
}

// Run the service
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
