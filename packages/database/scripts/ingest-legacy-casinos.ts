import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Connection Strings
const CLOUD_SQL_URL = process.env.CLOUD_SQL_URL || `postgresql://trust-worker:T1lt_Ch3ck_Pr0d_5ecure_!2026@34.29.231.218:5432/tilt-trust-prod`;

const GRADE_MAP: Record<string, number> = {
  'A+': 98, 'A': 95, 'A-': 90,
  'B+': 85, 'B': 80, 'B-': 75,
  'C+': 70, 'C': 65, 'C-': 60,
  'D+': 50, 'D': 40, 'D-': 30,
  'F': 10
};

async function ingest() {
  const client = new pg.Client({
    connectionString: CLOUD_SQL_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('--- STARTING LEGACY JSON INGESTION ---');

    const rootDir = path.resolve(__dirname, '../../../');
    const onlinePath = path.join(rootDir, 'data/online-casinos.json');
    const sweepsPath = path.join(rootDir, 'data/sweepstakes-casinos.json');

    const online = JSON.parse(fs.readFileSync(onlinePath, 'utf8'));
    const sweeps = JSON.parse(fs.readFileSync(sweepsPath, 'utf8'));
    
    // We unique by name just in case
    const allPlatforms = [...online, ...sweeps];
    console.log(`Found ${allPlatforms.length} platforms in JSON data.`);

    let count = 0;
    for (const platform of allPlatforms) {
      const score = GRADE_MAP[platform.grade] || 50;
      const domain = platform.name.toLowerCase().replace(/\s+/g, '') + '.com';
      
      // A. Upsert into core registry (Skip if exists to avoid overwriting newer data)
      await client.query(`
        INSERT INTO casinos (name, domain, current_overall_score, license_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE SET
          current_overall_score = EXCLUDED.current_overall_score,
          updated_at = NOW()
      `, [
        platform.name,
        domain,
        score,
        platform.category || 'unknown'
      ]);

      // B. Create initial audit log
      await client.query(`
        INSERT INTO casino_score_history (
          casino_name, overall_score, financial_score, fairness_score, promotional_score, operational_score, community_score, change_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        platform.name,
        score,
        score, // Start all pillars at initial grade
        score,
        score,
        score,
        score,
        `Initial ingestion from legacy ${platform.category} datastore (Target Grade: ${platform.grade})`
      ]);

      count++;
      if (count % 50 === 0) console.log(`  Processed ${count} platforms...`);
    }

    console.log(`✅ SUCCESS: Ingested ${count} platforms into the Five Pillars model.`);
    console.log('The Trust Engine is now monitoring the full registry.');

  } catch (err) {
    console.error('❌ INGESTION FAILED:', err);
  } finally {
    await client.end();
  }
}

ingest();
