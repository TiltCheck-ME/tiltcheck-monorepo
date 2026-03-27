/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function updateSchemaAndSeed() {
  const connectionString = process.env.POSTGRESQL || process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    console.error('❌ No database connection string found in .env');
    return;
  }

  console.log('🔗 Connecting to Neon/GCP PostgreSQL...');
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    const client = await pool.connect();
    console.log('✅ Connected.');

    // Step 1: Ensure all columns exist
    console.log('🚀 Hardening blog_posts schema...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        author TEXT DEFAULT 'TiltCheck AI',
        excerpt TEXT,
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        published_at TIMESTAMPTZ DEFAULT NOW(),
        is_published BOOLEAN DEFAULT TRUE,
        metadata JSONB DEFAULT '{}'::jsonb
      );

      -- Add columns if they are missing (for existing tables)
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blog_posts' AND column_name='author') THEN
          ALTER TABLE blog_posts ADD COLUMN author TEXT DEFAULT 'TiltCheck AI';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blog_posts' AND column_name='excerpt') THEN
          ALTER TABLE blog_posts ADD COLUMN excerpt TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blog_posts' AND column_name='tags') THEN
          ALTER TABLE blog_posts ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
        END IF;
      END $$;
    `);
    console.log('✅ Schema hardened.');

    // Step 2: Clear and Seed (for fresh start)
    console.log('🌱 Refreshing initial intel...');
    await client.query('DELETE FROM blog_posts WHERE slug = $1', ['house-edge-is-a-lie']);
    await client.query(`
      INSERT INTO blog_posts (title, slug, content, excerpt, author, tags)
      VALUES (
        'The House Edge is a Lie',
        'house-edge-is-a-lie',
        'Welcome to TiltCheck. The casino has a mathematical advantage, but they rely on your lack of discipline to multiply it. We fix that by monitoring your session drift in real-time.',
        'The casino advantage is 2.7%, but your effective house edge is likely 15%+. Here is why.',
        'TiltCheck AI',
        ARRAY['HOUSE_EDGE', 'MATH', 'MANIFESTO']
      )
    `);
    console.log('✅ Initial intel seeded.');

    client.release();
  } catch (err) {
    console.error('❌ DB Hardening Failed:', err.message);
  } finally {
    await pool.end();
  }
}

updateSchemaAndSeed().catch(console.error);
