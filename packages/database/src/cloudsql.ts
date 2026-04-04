// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04
import pg from 'pg';

const { Pool } = pg;

// Connection configuration for the Five Pillars Trust Engine.
// Uses Neon (primary) or DATABASE_URL as the connection source.
const NEON_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!NEON_URL) {
  throw new Error('NEON_DATABASE_URL or DATABASE_URL must be set. Cloud SQL has been removed.');
}

export const trustPool = new Pool({
  connectionString: NEON_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const pgClient = {
  query: (text: string, params?: unknown[]) => trustPool.query(text, params),
  connect: () => trustPool.connect(),
};
