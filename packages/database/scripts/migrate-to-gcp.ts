// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04
/**
 * Migration Script: Supabase -> Neon (PostgreSQL)
 * Migrates Five Pillars trust engine data from Supabase to Neon.
 * Cloud SQL has been removed. Use NEON_DATABASE_URL or DATABASE_URL.
 */
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';
import { INITIAL_SCHEMA } from './schema.js';

dotenv.config();

const { Pool } = pg;

// Connection Strings — Neon only, no Cloud SQL.
const NEON_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function migrate() {
  if (!NEON_URL) {
    console.error('ERROR: NEON_DATABASE_URL or DATABASE_URL must be set in .env');
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    return;
  }

  console.log('--- STARTING TRUST ENGINE MIGRATION TO NEON ---');
  
  // 1. Initialize Neon Pool
  const pool = new Pool({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
  });

  // 2. Initialize Supabase Client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 3. Setup Target Schema
    console.log('Initializing Neon schema...');
    await pool.query(INITIAL_SCHEMA);
    console.log('Schema initialized successfully.');

    // 4. Fetch Legacy Data
    console.log('Fetching legacy casino_data from Supabase...');
    const { data: legacyCasinos, error } = await supabase
      .from('casino_data')
      .select('*');

    if (error) throw error;
    if (!legacyCasinos || legacyCasinos.length === 0) {
      console.warn('No legacy data found. Migration skipped.');
      return;
    }

    console.log('Found ' + legacyCasinos.length + ' legacy records. Migrating...');

    // 5. Transfer to Neon
    for (const legacy of legacyCasinos) {
      const name = legacy.name || legacy.domain;
      
      // A. Insert into core registry
      await pool.query(
        'INSERT INTO casinos (name, domain, license_type, logo_url, is_verified, current_overall_score) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO NOTHING',
        [
          name,
          legacy.domain,
          legacy.license_info?.type || 'unknown',
          legacy.license_info?.logo_url || null,
          legacy.status === 'verified',
          75 // Starting default
        ]
      );

      // B. Create initial audit log
      await pool.query(
        'INSERT INTO casino_score_history (casino_name, overall_score, change_reason) VALUES ($1, $2, $3)',
        [name, 75, 'Legacy data migration from Supabase']
      );

      // C. Capture initial RTP snapshot if available
      if (legacy.verified_rtp) {
        await pool.query(
          'INSERT INTO casino_metric_snapshots (casino_name, metric_type, metric_value, source) VALUES ($1, $2, $3, $4)',
          [name, 'rtp', legacy.verified_rtp, 'legacy-migration']
        );
      }
      
      console.log('Migrated ' + name + ' successfully.');
    }

    console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
    console.log('Mapped ' + legacyCasinos.length + ' records to the Five Pillars model.');

  } catch (err) {
    console.error('FATAL ERROR DURING MIGRATION:', err);
  } finally {
    await pool.end();
  }
}

migrate();
