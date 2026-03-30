/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import pg from 'pg';

const { Pool } = pg;

// Connection configuration for the Five Pillars Trust Engine (Cloud SQL)
// In production, this should be provided via environment variables.
const CLOUD_SQL_URL = process.env.DATABASE_URL || 
                      process.env.CLOUD_SQL_URL || 
                      `postgresql://trust-worker:T1lt_Ch3ck_Pr0d_5ecure_!2026@34.29.231.218:5432/tilt-trust-prod`;

export const trustPool = new Pool({
  connectionString: CLOUD_SQL_URL,
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
