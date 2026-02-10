/**
 * Claim Service - Handles database and queue operations for claims
 */

import { Queue } from 'bullmq';
import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

export interface ClaimServiceConfig {
  redisUrl: string;
  databaseUrl: string;
  encryptionKey: string;
}

/**
 * Service for managing claim operations
 */
export class ClaimService {
  private pool: pg.Pool;
  private queue: Queue;
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-cbc';

  constructor(config: ClaimServiceConfig) {
    // Initialize database pool
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Initialize BullMQ queue
    this.queue = new Queue('claim-jobs', {
      connection: { url: config.redisUrl },
    });

    // Initialize encryption
    this.encryptionKey = Buffer.from(config.encryptionKey, 'hex');
    if (this.encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_api_keys (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          api_key_encrypted TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_used_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS claim_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          code TEXT NOT NULL,
          status TEXT NOT NULL,
          reason TEXT,
          reward_type TEXT,
          reward_amount DECIMAL,
          reward_currency TEXT,
          attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_claim_history_user_id 
          ON claim_history(user_id, attempted_at DESC);
        CREATE INDEX IF NOT EXISTS idx_claim_history_status 
          ON claim_history(status);
      `);
      console.log('[ClaimService] Schema initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Encrypt API key
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Store user API key and queue claim jobs
   */
  async submitApiKey(apiKey: string): Promise<{ userId: string }> {
    const userId = crypto.randomUUID();
    const encrypted = this.encrypt(apiKey);

    try {
      // Store encrypted API key
      await this.pool.query(
        `INSERT INTO user_api_keys (id, user_id, api_key_encrypted, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [crypto.randomUUID(), userId, encrypted]
      );

      // Get active codes from promo_codes table
      const codesResult = await this.pool.query(
        `SELECT code FROM promo_codes WHERE status = $1 ORDER BY detected_at DESC LIMIT 100`,
        ['active']
      );

      // Queue claim jobs for each code
      for (const row of codesResult.rows) {
        await this.queue.add(
          'claim',
          { userId, code: row.code },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          }
        );
      }

      console.log(`[ClaimService] Created ${codesResult.rows.length} claim jobs for user: ${userId}`);
      
      return { userId };
    } catch (error) {
      console.error('[ClaimService] Error submitting API key:', error);
      throw error;
    }
  }

  /**
   * Get claim status for user
   */
  async getClaimStatus(userId: string): Promise<{
    userId: string;
    total: number;
    claimed: number;
    skipped: number;
    failed: number;
    processing: number;
  }> {
    try {
      const result = await this.pool.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed,
          SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
         FROM claim_history
         WHERE user_id = $1`,
        [userId]
      );

      const stats = result.rows[0];
      
      // Get pending jobs count
      const waitingCount = await this.queue.getWaitingCount();
      const activeCount = await this.queue.getActiveCount();
      const processing = waitingCount + activeCount;

      return {
        userId,
        total: parseInt(stats.total) || 0,
        claimed: parseInt(stats.claimed) || 0,
        skipped: parseInt(stats.skipped) || 0,
        failed: parseInt(stats.failed) || 0,
        processing,
      };
    } catch (error) {
      console.error('[ClaimService] Error getting status:', error);
      throw error;
    }
  }

  /**
   * Get claim history for user
   */
  async getClaimHistory(
    userId: string,
    limit: number = 50,
    statusFilter?: string
  ): Promise<any[]> {
    try {
      let query = `
        SELECT * FROM claim_history 
        WHERE user_id = $1
      `;
      const params: any[] = [userId];

      if (statusFilter) {
        query += ' AND status = $2';
        params.push(statusFilter);
        query += ` ORDER BY attempted_at DESC LIMIT $3`;
        params.push(limit);
      } else {
        query += ` ORDER BY attempted_at DESC LIMIT $2`;
        params.push(limit);
      }

      const result = await this.pool.query(query, params);
      
      return result.rows.map((row) => ({
        id: row.id,
        code: row.code,
        status: row.status,
        reason: row.reason,
        reward: row.reward_type
          ? {
              type: row.reward_type,
              amount: parseFloat(row.reward_amount),
              currency: row.reward_currency,
            }
          : undefined,
        attemptedAt: row.attempted_at,
      }));
    } catch (error) {
      console.error('[ClaimService] Error getting history:', error);
      throw error;
    }
  }

  /**
   * Get available codes
   */
  async getAvailableCodes(): Promise<any[]> {
    try {
      const result = await this.pool.query(
        `SELECT code, source_channel, detected_at, metadata 
         FROM promo_codes 
         WHERE status = $1 
         ORDER BY detected_at DESC 
         LIMIT 100`,
        ['active']
      );

      return result.rows.map((row) => ({
        code: row.code,
        source: row.source_channel,
        detectedAt: row.detected_at,
        wagersRequired: row.metadata?.wagersRequired,
      }));
    } catch (error) {
      console.error('[ClaimService] Error getting codes:', error);
      throw error;
    }
  }

  /**
   * Delete user data
   */
  async deleteUserData(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query('DELETE FROM claim_history WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_api_keys WHERE user_id = $1', [userId]);
      
      await client.query('COMMIT');
      console.log(`[ClaimService] Deleted data for user: ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ClaimService] Error deleting user data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    await this.pool.end();
    console.log('[ClaimService] Connections closed');
  }
}
