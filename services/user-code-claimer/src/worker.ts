/**
 * Claim Worker - Processes claim jobs from queue
 * 
 * Uses BullMQ for job queue management.
 * Requires Redis instance for queue storage.
 */

import { Worker, Job } from 'bullmq';
import { StakeClient } from '@tiltcheck/stake';
import type { ClaimJob, ClaimerDatabase, ClaimHistory } from './types.js';
import { randomUUID } from 'crypto';

/**
 * Claim worker that processes jobs from the queue
 */
export class ClaimWorker {
  private worker: Worker | null = null;
  private database: ClaimerDatabase;

  constructor(database: ClaimerDatabase) {
    this.database = database;
  }

  /**
   * Start the worker
   * 
   * @param redisUrl - Redis connection URL for BullMQ
   */
  async start(redisUrl: string): Promise<void> {
    console.log('[ClaimWorker] Starting worker...');
    console.log(`[ClaimWorker] Redis URL: ${redisUrl}`);

    try {
      // Parse Redis URL to get connection config
      const connection = { url: redisUrl };

      // Create BullMQ Worker
      this.worker = new Worker('claim-jobs', this.processJob.bind(this), {
        connection,
        concurrency: parseInt(process.env.CLAIM_WORKER_CONCURRENCY || '10', 10),
        limiter: {
          max: 100,
          duration: 1000,
        },
      });

      // Event listeners
      this.worker.on('completed', (job) => {
        console.log(`[ClaimWorker] Job ${job.id} completed`);
      });

      this.worker.on('failed', (job, err) => {
        console.error(`[ClaimWorker] Job ${job?.id} failed:`, err);
      });

      this.worker.on('error', (err) => {
        console.error('[ClaimWorker] Worker error:', err);
      });

      console.log('[ClaimWorker] Worker started successfully');
    } catch (error) {
      console.error('[ClaimWorker] Failed to start worker:', error);
      throw error;
    }
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    console.log('[ClaimWorker] Worker stopped');
  }

  /**
   * Process a claim job
   */
  async processJob(job: Job<ClaimJob>): Promise<void> {
    const { userId, code } = job.data;
    console.log(`[ClaimWorker] Processing claim: ${code} for user ${userId}`);

    try {
      // Check rate limit
      const allowed = await this.database.checkRateLimit(userId);
      if (!allowed) {
        console.log(`[ClaimWorker] Rate limit exceeded for user ${userId}`);
        await this.saveFailedClaim(userId, code, 'Rate limit exceeded');
        throw new Error('Rate limit exceeded');
      }

      // Increment rate limit counter
      await this.database.incrementRateLimit(userId);

      // Get user's API key
      const apiKey = await this.database.getUserApiKey(userId);
      if (!apiKey) {
        console.log(`[ClaimWorker] No API key found for user ${userId}`);
        await this.saveFailedClaim(userId, code, 'API key not found');
        throw new Error('API key not found');
      }

      // Initialize Stake client with user's API key
      const client = new StakeClient({ apiKey });

      // Check eligibility
      const eligibility = await client.checkEligibility(code);
      
      if (!eligibility.eligible) {
        console.log(
          `[ClaimWorker] User ${userId} not eligible for ${code}: ${eligibility.reason}`
        );
        await this.saveSkippedClaim(userId, code, eligibility.reason);
        return;
      }

      // Attempt to claim
      const result = await client.claimCode(code);

      if (result.success) {
        console.log(`[ClaimWorker] Successfully claimed ${code} for user ${userId}`);
        await this.saveSuccessfulClaim(userId, code, result.reward);
      } else {
        console.log(
          `[ClaimWorker] Failed to claim ${code} for user ${userId}: ${result.error}`
        );
        await this.saveFailedClaim(userId, code, result.error);
      }
    } catch (error) {
      console.error(`[ClaimWorker] Error processing job:`, error);
      await this.saveFailedClaim(
        userId,
        code,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error; // Re-throw for retry logic
    }
  }

  /**
   * Save successful claim to history
   */
  private async saveSuccessfulClaim(
    userId: string,
    code: string,
    reward?: { type: string; amount: number; currency?: string }
  ): Promise<void> {
    const history: ClaimHistory = {
      id: randomUUID(),
      userId,
      code,
      status: 'claimed',
      rewardType: reward?.type,
      rewardAmount: reward?.amount,
      rewardCurrency: reward?.currency,
      attemptedAt: new Date(),
    };

    await this.database.saveClaimHistory(history);
  }

  /**
   * Save skipped claim to history
   */
  private async saveSkippedClaim(
    userId: string,
    code: string,
    reason?: string
  ): Promise<void> {
    const history: ClaimHistory = {
      id: randomUUID(),
      userId,
      code,
      status: 'skipped',
      reason,
      attemptedAt: new Date(),
    };

    await this.database.saveClaimHistory(history);
  }

  /**
   * Save failed claim to history
   */
  private async saveFailedClaim(
    userId: string,
    code: string,
    reason?: string
  ): Promise<void> {
    const history: ClaimHistory = {
      id: randomUUID(),
      userId,
      code,
      status: 'failed',
      reason,
      attemptedAt: new Date(),
    };

    await this.database.saveClaimHistory(history);
  }
}

/**
 * Example BullMQ integration:
 * 
 * ```typescript
 * import { Queue, Worker, Job } from 'bullmq';
 * 
 * // Create queue
 * const claimQueue = new Queue('claim-jobs', {
 *   connection: { url: process.env.REDIS_URL },
 * });
 * 
 * // Add job to queue
 * await claimQueue.add('claim', {
 *   userId: 'user123',
 *   code: 'FREECODE',
 * }, {
 *   attempts: 3,
 *   backoff: {
 *     type: 'exponential',
 *     delay: 5000,
 *   },
 * });
 * 
 * // Process jobs
 * const worker = new Worker('claim-jobs', async (job: Job<ClaimJob>) => {
 *   await claimWorker.processJob(job);
 * }, {
 *   connection: { url: process.env.REDIS_URL },
 *   concurrency: 10,
 * });
 * ```
 */
