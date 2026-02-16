/**
 * PostgreSQL database implementation for claimer service
 */

import pg from 'pg';
import crypto from 'crypto';
import type { ClaimerDatabase, ClaimHistory } from './types.js';

const { Pool } = pg;

/**
 * PostgreSQL implementation with API key encryption
 */
export class PostgresClaimerDatabase implements ClaimerDatabase {
  private pool: pg.Pool;
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-cbc';

  constructor(connectionString: string, encryptionKey?: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Get encryption key from environment or parameter
    const keyHex = encryptionKey || process.env.API_KEY_ENCRYPTION_KEY;
    if (!keyHex) {
      throw new Error(
        'API_KEY_ENCRYPTION_KEY environment variable is required'
      );
    }
    
    this.encryptionKey = Buffer.from(keyHex, 'hex');
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

        CREATE TABLE IF NOT EXISTS rate_limits (
          user_id TEXT PRIMARY KEY,
          window_start TIMESTAMP NOT NULL,
          request_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_claim_history_user_id 
          ON claim_history(user_id, attempted_at DESC);
        CREATE INDEX IF NOT EXISTS idx_claim_history_status 
          ON claim_history(status);
      `);
      console.log('[PostgresDB] Schema initialized successfully');
    } finally {
      client.release();
    }
  }

  /**
   * Encrypt API key using AES-256-CBC
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypt API key
   */
  private decrypt(encrypted: string): string {
    const [ivHex, encryptedHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      iv
    );
    return Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]).toString('utf8');
  }

  /**
   * Store encrypted API key for user
   */
  async storeUserApiKey(userId: string, apiKey: string): Promise<void> {
    try {
      const id = crypto.randomUUID();
      const encrypted = this.encrypt(apiKey);
      
      await this.pool.query(
        `INSERT INTO user_api_keys (id, user_id, api_key_encrypted, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) 
         DO UPDATE SET api_key_encrypted = $3, last_used_at = NOW()`,
        [id, userId, encrypted]
      );
      
      console.log(`[PostgresDB] Stored encrypted API key for user: ${userId}`);
    } catch (error) {
      console.error(`[PostgresDB] Error storing API key:`, error);
      throw error;
    }
  }

  async getUserApiKey(userId: string): Promise<string | null> {
    try {
      const result = await this.pool.query(
        `SELECT api_key_encrypted FROM user_api_keys 
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Update last used timestamp
      await this.pool.query(
        'UPDATE user_api_keys SET last_used_at = NOW() WHERE user_id = $1',
        [userId]
      );

      // Decrypt and return API key
      return this.decrypt(result.rows[0].api_key_encrypted);
    } catch (error) {
      console.error(`[PostgresDB] Error getting API key:`, error);
      throw error;
    }
  }

  async saveClaimHistory(history: ClaimHistory): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO claim_history 
         (id, user_id, code, status, reason, reward_type, reward_amount, reward_currency, attempted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          history.id,
          history.userId,
          history.code,
          history.status,
          history.reason || null,
          history.rewardType || null,
          history.rewardAmount || null,
          history.rewardCurrency || null,
          history.attemptedAt,
        ]
      );
      
      console.log(
        `[PostgresDB] Saved claim history: ${history.code} - ${history.status}`
      );
    } catch (error) {
      console.error(`[PostgresDB] Error saving claim history:`, error);
      throw error;
    }
  }

  async getClaimHistory(
    userId: string,
    limit: number = 100
  ): Promise<ClaimHistory[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM claim_history 
         WHERE user_id = $1 
         ORDER BY attempted_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        code: row.code,
        status: row.status,
        reason: row.reason,
        rewardType: row.reward_type,
        rewardAmount: row.reward_amount ? parseFloat(row.reward_amount) : undefined,
        rewardCurrency: row.reward_currency,
        attemptedAt: new Date(row.attempted_at),
      }));
    } catch (error) {
      console.error(`[PostgresDB] Error getting claim history:`, error);
      throw error;
    }
  }

  async checkRateLimit(userId: string): Promise<boolean> {
    try {
      const maxRequests = parseInt(
        process.env.CLAIMS_PER_MINUTE_PER_USER || '5',
        10
      );
      const windowMs = 60000; // 1 minute

      const result = await this.pool.query(
        `SELECT window_start, request_count FROM rate_limits 
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return true; // No limit set, allow
      }

      const { window_start, request_count } = result.rows[0];
      const now = Date.now();
      const windowStart = new Date(window_start).getTime();

      // Check if window has expired
      if (now - windowStart > windowMs) {
        return true; // Window expired, allow
      }

      // Check if under limit
      return request_count < maxRequests;
    } catch (error) {
      console.error(`[PostgresDB] Error checking rate limit:`, error);
      throw error;
    }
  }

  async incrementRateLimit(userId: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO rate_limits (user_id, window_start, request_count)
         VALUES ($1, NOW(), 1)
         ON CONFLICT (user_id)
         DO UPDATE SET 
           window_start = CASE 
             WHEN EXTRACT(EPOCH FROM (NOW() - rate_limits.window_start)) * 1000 > 60000 
             THEN NOW()
             ELSE rate_limits.window_start
           END,
           request_count = CASE 
             WHEN EXTRACT(EPOCH FROM (NOW() - rate_limits.window_start)) * 1000 > 60000 
             THEN 1
             ELSE rate_limits.request_count + 1
           END`,
        [userId]
      );
    } catch (error) {
      console.error(`[PostgresDB] Error incrementing rate limit:`, error);
      throw error;
    }
  }

  /**
   * Delete user data (API key and claim history)
   */
  async deleteUserData(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query('DELETE FROM rate_limits WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM claim_history WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_api_keys WHERE user_id = $1', [userId]);
      
      await client.query('COMMIT');
      console.log(`[PostgresDB] Deleted all data for user: ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[PostgresDB] Error deleting user data:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
    console.log('[PostgresDB] Connection pool closed');
  }
}
