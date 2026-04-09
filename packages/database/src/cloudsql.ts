// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
import pg from 'pg';

const { Pool } = pg;

// Connection configuration for the Five Pillars Trust Engine.
// Uses Neon (primary) or DATABASE_URL as the connection source.
// Pool is created lazily to avoid crashing the process at import time
// when the env var is not yet set (e.g. during build or test).
let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (_pool) return _pool;
  const NEON_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!NEON_URL) {
    throw new Error('NEON_DATABASE_URL or DATABASE_URL environment variable is required.');
  }
  _pool = new Pool({
    connectionString: NEON_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  return _pool;
}

export const trustPool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  },
});

export const pgClient = {
  query: (text: string, params?: unknown[]) => getPool().query(text, params),
  connect: () => getPool().connect(),
};
