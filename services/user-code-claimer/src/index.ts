/**
 * User Code Claimer Service
 * 
 * Main entry point for the background worker that processes claim jobs
 */

import { ClaimWorker } from './worker.js';
import { InMemoryClaimerDatabase } from './database.js';
import type { ClaimerConfig } from './types.js';

/**
 * Load configuration from environment variables
 */
function loadConfig(): ClaimerConfig {
  return {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    databaseUrl:
      process.env.DATABASE_URL || 'postgresql://localhost:5432/tiltcheck',
    claimsPerMinutePerUser: parseInt(
      process.env.CLAIMS_PER_MINUTE_PER_USER || '5',
      10
    ),
    maxRetryAttempts: parseInt(
      process.env.CLAIMS_MAX_RETRY_ATTEMPTS || '3',
      10
    ),
    workerConcurrency: parseInt(
      process.env.CLAIM_WORKER_CONCURRENCY || '10',
      10
    ),
    jobTimeout: parseInt(process.env.CLAIM_JOB_TIMEOUT || '30000', 10),
  };
}

/**
 * Main function
 */
async function main() {
  console.log('=== User Code Claimer Service ===');
  console.log('Loading configuration...');

  const config = loadConfig();
  console.log('Configuration:', {
    ...config,
    databaseUrl: config.databaseUrl.replace(/:[^:@]+@/, ':***@'), // Hide password
  });

  // Initialize database
  const database = new InMemoryClaimerDatabase();

  // TODO: Replace with actual database implementation
  // Example: const database = new PostgresClaimerDatabase(config.databaseUrl);

  // Initialize worker
  const worker = new ClaimWorker(database);

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await worker.stop();
    process.exit(0);
  });

  // Start worker
  await worker.start(config.redisUrl);

  console.log('Service is running. Press Ctrl+C to stop.');
}

// Run the service
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * Export for use in other modules
 */
export { ClaimWorker } from './worker.js';
export { InMemoryClaimerDatabase } from './database.js';
export type * from './types.js';
