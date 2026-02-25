/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Database abstraction for claimer service
 * 
 * NOTE: This is a placeholder implementation. In production, use:
 * - PostgreSQL with pg library
 * - Supabase client
 * - Proper encryption for API keys
 */

import type { ClaimerDatabase, ClaimHistory } from './types.js';

/**
 * In-memory database implementation (for development/testing)
 */
export class InMemoryClaimerDatabase implements ClaimerDatabase {
  private apiKeys: Map<string, string> = new Map();
  private claimHistory: Map<string, ClaimHistory[]> = new Map();
  private rateLimits: Map<string, { windowStart: number; count: number }> =
    new Map();
  private readonly rateWindowMs = 60000; // 1 minute

  async getUserApiKey(userId: string): Promise<string | null> {
    return this.apiKeys.get(userId) || null;
  }

  /**
   * Store encrypted API key for user
   * NOTE: In production, use proper encryption (e.g., AES-256)
   */
  async storeUserApiKey(userId: string, apiKey: string): Promise<void> {
    // Placeholder: In production, encrypt the API key before storing
    // const encrypted = encryptApiKey(apiKey);
    this.apiKeys.set(userId, apiKey);
    console.log(`[DB] Stored API key for user: ${userId}`);
  }

  async saveClaimHistory(history: ClaimHistory): Promise<void> {
    const userHistory = this.claimHistory.get(history.userId) || [];
    userHistory.unshift(history);
    this.claimHistory.set(history.userId, userHistory);
    console.log(
      `[DB] Saved claim history: ${history.code} - ${history.status}`
    );
  }

  async getClaimHistory(
    userId: string,
    limit: number = 100
  ): Promise<ClaimHistory[]> {
    const history = this.claimHistory.get(userId) || [];
    return history.slice(0, limit);
  }

  async checkRateLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const limit = this.rateLimits.get(userId);

    if (!limit) {
      return true; // No limit set, allow
    }

    // Check if window has expired
    if (now - limit.windowStart > this.rateWindowMs) {
      // Reset window
      this.rateLimits.set(userId, { windowStart: now, count: 0 });
      return true;
    }

    // Check if under limit (default: 5 per minute)
    const maxRequests = parseInt(
      process.env.CLAIMS_PER_MINUTE_PER_USER || '5',
      10
    );
    return limit.count < maxRequests;
  }

  async incrementRateLimit(userId: string): Promise<void> {
    const now = Date.now();
    const limit = this.rateLimits.get(userId);

    if (!limit || now - limit.windowStart > this.rateWindowMs) {
      // Start new window
      this.rateLimits.set(userId, { windowStart: now, count: 1 });
    } else {
      // Increment count
      limit.count++;
      this.rateLimits.set(userId, limit);
    }
  }
}

/**
 * PostgreSQL database implementation placeholder
 * 
 * Example implementation:
 * ```typescript
 * import pg from 'pg';
 * import crypto from 'crypto';
 * 
 * export class PostgresClaimerDatabase implements ClaimerDatabase {
 *   private pool: pg.Pool;
 *   private encryptionKey: Buffer;
 * 
 *   constructor(connectionString: string, encryptionKey: string) {
 *     this.pool = new pg.Pool({ connectionString });
 *     this.encryptionKey = Buffer.from(encryptionKey, 'hex');
 *   }
 * 
 *   async getUserApiKey(userId: string): Promise<string | null> {
 *     const result = await this.pool.query(
 *       'SELECT api_key_encrypted FROM user_api_keys WHERE user_id = $1',
 *       [userId]
 *     );
 *     
 *     if (result.rows.length === 0) return null;
 *     
 *     // Decrypt API key
 *     const encrypted = Buffer.from(result.rows[0].api_key_encrypted, 'hex');
 *     const decrypted = this.decrypt(encrypted);
 *     return decrypted;
 *   }
 * 
 *   async saveClaimHistory(history: ClaimHistory): Promise<void> {
 *     await this.pool.query(
 *       `INSERT INTO claim_history 
 *        (id, user_id, code, status, reason, reward_type, reward_amount, reward_currency, attempted_at)
 *        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
 *       [
 *         history.id,
 *         history.userId,
 *         history.code,
 *         history.status,
 *         history.reason,
 *         history.rewardType,
 *         history.rewardAmount,
 *         history.rewardCurrency,
 *         history.attemptedAt,
 *       ]
 *     );
 *   }
 * 
 *   private decrypt(encrypted: Buffer): string {
 *     const algorithm = 'aes-256-cbc';
 *     const iv = encrypted.slice(0, 16);
 *     const content = encrypted.slice(16);
 *     const decipher = crypto.createDecipheriv(algorithm, this.encryptionKey, iv);
 *     return Buffer.concat([decipher.update(content), decipher.final()]).toString();
 *   }
 * }
 * ```
 */
