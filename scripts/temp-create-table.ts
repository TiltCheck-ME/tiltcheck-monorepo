import { DatabaseClient } from '../packages/database/src/index.ts';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const db = new DatabaseClient({
  url: process.env.SUPABASE_URL,
  apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

async function main() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.discord_solana_wallets (
      discord_id TEXT PRIMARY KEY,
      solana_pubkey TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  try {
    const { error } = await db.raw(sql);
    if (error) {
      throw error;
    }
    console.log('Table created successfully.');
  } catch (err) {
    console.error('Error creating table:', err);
  }
}

main();
