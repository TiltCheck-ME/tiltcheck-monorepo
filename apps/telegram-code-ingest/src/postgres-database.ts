/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * PostgreSQL database implementation for code storage
 */

import pg from 'pg';
import type { PromoCode, CodeDatabase } from './types.js';

const { Pool } = pg;

/**
 * PostgreSQL implementation of CodeDatabase
 */
export class PostgresCodeDatabase implements CodeDatabase {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS promo_codes (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          source_channel TEXT NOT NULL,
          detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          metadata JSONB,
          status TEXT DEFAULT 'active'
        );

        CREATE INDEX IF NOT EXISTS idx_promo_codes_status ON promo_codes(status);
        CREATE INDEX IF NOT EXISTS idx_promo_codes_detected_at ON promo_codes(detected_at DESC);
      `);
      console.log('[PostgresDB] Schema initialized successfully');
    } finally {
      client.release();
    }
  }

  async saveCode(code: PromoCode): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO promo_codes (id, code, source_channel, detected_at, expires_at, metadata, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (code) DO NOTHING`,
        [
          code.id,
          code.code,
          code.sourceChannel,
          code.detectedAt,
          code.expiresAt || null,
          JSON.stringify(code.metadata || {}),
          code.status,
        ]
      );
      console.log(`[PostgresDB] Saved code: ${code.code} from ${code.sourceChannel}`);
    } catch (error) {
      console.error(`[PostgresDB] Error saving code ${code.code}:`, error);
      throw error;
    }
  }

  async getCode(code: string): Promise<PromoCode | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM promo_codes WHERE code = $1',
        [code]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRow(result.rows[0]);
    } catch (error) {
      console.error(`[PostgresDB] Error getting code ${code}:`, error);
      throw error;
    }
  }

  async getActiveCodes(): Promise<PromoCode[]> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM promo_codes 
         WHERE status = $1 
         ORDER BY detected_at DESC`,
        ['active']
      );
      
      return result.rows.map(this.mapRow);
    } catch (error) {
      console.error('[PostgresDB] Error getting active codes:', error);
      throw error;
    }
  }

  async updateCodeStatus(
    code: string,
    status: PromoCode['status']
  ): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE promo_codes SET status = $1 WHERE code = $2',
        [status, code]
      );
      console.log(`[PostgresDB] Updated code ${code} status to: ${status}`);
    } catch (error) {
      console.error(`[PostgresDB] Error updating code ${code}:`, error);
      throw error;
    }
  }

  /**
   * Map database row to PromoCode object
   */
  private mapRow(row: any): PromoCode {
    return {
      id: row.id,
      code: row.code,
      sourceChannel: row.source_channel,
      detectedAt: new Date(row.detected_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      metadata: row.metadata || {},
      status: row.status,
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
    console.log('[PostgresDB] Connection pool closed');
  }
}
