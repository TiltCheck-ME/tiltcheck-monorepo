/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Database abstraction for code storage
 * 
 * NOTE: This is a placeholder implementation. In production, use:
 * - PostgreSQL with pg library
 * - SQLite with better-sqlite3
 * - Supabase client
 */

import type { PromoCode, CodeDatabase } from './types.js';

/**
 * In-memory database implementation (for development/testing)
 * Replace with actual database implementation in production
 */
export class InMemoryCodeDatabase implements CodeDatabase {
  private codes: Map<string, PromoCode> = new Map();

  async saveCode(code: PromoCode): Promise<void> {
    this.codes.set(code.code, code);
    console.log(`[DB] Saved code: ${code.code} from ${code.sourceChannel}`);
  }

  async getCode(code: string): Promise<PromoCode | null> {
    return this.codes.get(code) || null;
  }

  async getActiveCodes(): Promise<PromoCode[]> {
    return Array.from(this.codes.values()).filter((c) => c.status === 'active');
  }

  async updateCodeStatus(
    code: string,
    status: PromoCode['status']
  ): Promise<void> {
    const existing = this.codes.get(code);
    if (existing) {
      existing.status = status;
      this.codes.set(code, existing);
      console.log(`[DB] Updated code ${code} status to: ${status}`);
    }
  }
}

/**
 * PostgreSQL database implementation placeholder
 * 
 * Example implementation:
 * ```typescript
 * import pg from 'pg';
 * 
 * export class PostgresCodeDatabase implements CodeDatabase {
 *   private pool: pg.Pool;
 * 
 *   constructor(connectionString: string) {
 *     this.pool = new pg.Pool({ connectionString });
 *   }
 * 
 *   async saveCode(code: PromoCode): Promise<void> {
 *     await this.pool.query(
 *       `INSERT INTO promo_codes (id, code, source_channel, detected_at, expires_at, metadata, status)
 *        VALUES ($1, $2, $3, $4, $5, $6, $7)
 *        ON CONFLICT (code) DO NOTHING`,
 *       [code.id, code.code, code.sourceChannel, code.detectedAt, code.expiresAt, 
 *        JSON.stringify(code.metadata), code.status]
 *     );
 *   }
 * 
 *   async getCode(code: string): Promise<PromoCode | null> {
 *     const result = await this.pool.query(
 *       'SELECT * FROM promo_codes WHERE code = $1',
 *       [code]
 *     );
 *     return result.rows[0] ? this.mapRow(result.rows[0]) : null;
 *   }
 * 
 *   async getActiveCodes(): Promise<PromoCode[]> {
 *     const result = await this.pool.query(
 *       'SELECT * FROM promo_codes WHERE status = $1 ORDER BY detected_at DESC',
 *       ['active']
 *     );
 *     return result.rows.map(this.mapRow);
 *   }
 * 
 *   async updateCodeStatus(code: string, status: PromoCode['status']): Promise<void> {
 *     await this.pool.query(
 *       'UPDATE promo_codes SET status = $1 WHERE code = $2',
 *       [status, code]
 *     );
 *   }
 * 
 *   private mapRow(row: any): PromoCode {
 *     return {
 *       id: row.id,
 *       code: row.code,
 *       sourceChannel: row.source_channel,
 *       detectedAt: new Date(row.detected_at),
 *       expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
 *       metadata: row.metadata,
 *       status: row.status,
 *     };
 *   }
 * }
 * ```
 */
