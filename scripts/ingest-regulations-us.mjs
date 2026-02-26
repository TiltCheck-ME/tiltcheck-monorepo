/**
 * Ingest US gaming regulations into Elasticsearch.
 *
 * Usage:
 *   node scripts/ingest-regulations-us.mjs
 *   node scripts/ingest-regulations-us.mjs --source data/regulations-us.json
 *   node scripts/ingest-regulations-us.mjs --bootstrap
 */

import { Client } from '@elastic/elasticsearch';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const DEFAULT_INDEX = process.env.REGULATIONS_INDEX || 'tiltcheck-regulations-us-v1';
const DEFAULT_SOURCE = 'data/regulations-us.json';

const TOPICS = ['sportsbook', 'igaming', 'sweepstakes'];

const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['FL', 'Florida'], ['GA', 'Georgia'],
  ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'],
  ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
  ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
  ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'],
  ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

function loadEnv() {
  const paths = [
    resolve(process.cwd(), 'apps/discord-bot/.env'),
    resolve(process.cwd(), '.env'),
  ];

  for (const p of paths) {
    try {
      const lines = readFileSync(p, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
      return;
    } catch {
      // ignore
    }
  }
}

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function nowIso() {
  return new Date().toISOString();
}

function bootstrapDocs() {
  const today = new Date().toISOString().slice(0, 10);

  return US_STATES.flatMap(([code, stateName]) =>
    TOPICS.map((topic) => ({
      regulation_id: `US-${code}-${topic.toUpperCase()}-BASELINE-001`,
      jurisdiction: {
        country: 'US',
        state_code: code,
        state_name: stateName,
      },
      topic,
      subtopic: 'general_status',
      status: 'pending_review',
      effective_date: '2020-01-01',
      last_reviewed_at: today,
      next_review_due: today,
      summary: 'Placeholder record. Replace with verified primary-source regulation data.',
      requirements: [
        {
          key: 'verification_required',
          value: 'Replace placeholder with verified legal source before production use.',
          applies_to: 'compliance_team',
        },
      ],
      penalties: {
        civil: 'Unknown (placeholder)',
        criminal: 'Unknown (placeholder)',
        license_impact: 'Unknown (placeholder)',
      },
      citations: [
        {
          citation: 'PLACEHOLDER',
          source_url: 'https://example.com/placeholder',
          publisher: 'placeholder',
          published_at: today,
        },
      ],
      source_quality: 'placeholder',
      version: 1,
      ingested_at: nowIso(),
      tags: ['bootstrap', 'needs_review', topic],
    })),
  );
}

function validateDocs(docs) {
  if (!Array.isArray(docs)) {
    throw new Error('Source data must be a JSON array.');
  }

  for (const d of docs) {
    if (!d.regulation_id) throw new Error('Missing regulation_id');
    if (!d.jurisdiction?.state_code) throw new Error(`Missing jurisdiction.state_code for ${d.regulation_id}`);
    if (!d.topic) throw new Error(`Missing topic for ${d.regulation_id}`);
    if (!d.status) throw new Error(`Missing status for ${d.regulation_id}`);

    const code = String(d.jurisdiction.state_code).toUpperCase();
    const isKnownState = US_STATES.some(([c]) => c === code);
    if (!isKnownState) {
      throw new Error(`Unknown state_code ${code} for ${d.regulation_id}`);
    }
  }
}

async function ensureIndex(client, index) {
  const exists = await client.indices.exists({ index }).catch(() => false);
  if (exists) return;

  await client.indices.create({
    index,
    mappings: {
      dynamic: 'strict',
      properties: {
        regulation_id: { type: 'keyword' },
        jurisdiction: {
          properties: {
            country: { type: 'keyword' },
            state_code: { type: 'keyword' },
            state_name: { type: 'keyword' },
          },
        },
        topic: { type: 'keyword' },
        subtopic: { type: 'keyword' },
        status: { type: 'keyword' },
        effective_date: { type: 'date' },
        last_reviewed_at: { type: 'date' },
        next_review_due: { type: 'date' },
        summary: { type: 'text' },
        requirements: {
          type: 'nested',
          properties: {
            key: { type: 'keyword' },
            value: { type: 'text' },
            applies_to: { type: 'keyword' },
          },
        },
        penalties: {
          properties: {
            civil: { type: 'text' },
            criminal: { type: 'text' },
            license_impact: { type: 'text' },
          },
        },
        citations: {
          type: 'nested',
          properties: {
            citation: { type: 'keyword' },
            source_url: { type: 'keyword' },
            publisher: { type: 'keyword' },
            published_at: { type: 'date' },
          },
        },
        source_quality: { type: 'keyword' },
        version: { type: 'integer' },
        ingested_at: { type: 'date' },
        tags: { type: 'keyword' },
      },
    },
  });
}

async function bulkUpsert(client, index, docs) {
  const BATCH = 250;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    const operations = batch.flatMap((doc) => [
      { index: { _index: index, _id: doc.regulation_id } },
      { ...doc, ingested_at: doc.ingested_at || nowIso() },
    ]);

    const response = await client.bulk({ operations, refresh: false });
    if (response.errors) {
      const failed = response.items.filter((it) => it.index?.error);
      if (failed.length) {
        throw new Error(`Bulk indexing failed with ${failed.length} errors in batch starting at ${i}.`);
      }
    }
  }

  await client.indices.refresh({ index });
}

async function main() {
  loadEnv();

  const elasticUrl = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;
  const index = getArg('--index', DEFAULT_INDEX);
  const sourcePath = getArg('--source', DEFAULT_SOURCE);
  const doBootstrap = hasFlag('--bootstrap');

  if (!elasticUrl || !apiKey) {
    throw new Error('ELASTIC_URL and ELASTIC_API_KEY are required.');
  }

  const client = new Client({ node: elasticUrl, auth: { apiKey } });

  let docs;
  if (doBootstrap) {
    docs = bootstrapDocs();
    const outPath = resolve(process.cwd(), 'data/regulations-us.bootstrap.json');
    writeFileSync(outPath, JSON.stringify(docs, null, 2));
    console.log(`Wrote bootstrap dataset: ${outPath}`);
  } else {
    const fullPath = resolve(process.cwd(), sourcePath);
    if (!existsSync(fullPath)) {
      throw new Error(`Source file not found: ${fullPath} (use --bootstrap to generate a starter dataset).`);
    }
    docs = JSON.parse(readFileSync(fullPath, 'utf8'));
  }

  validateDocs(docs);
  await ensureIndex(client, index);
  await bulkUpsert(client, index, docs);

  const total = docs.length;
  const uniqueStates = new Set(docs.map((d) => d.jurisdiction.state_code.toUpperCase())).size;
  console.log(`Indexed ${total} regulation records into ${index}.`);
  console.log(`Covered states: ${uniqueStates}/50.`);
}

main().catch((err) => {
  console.error(`Ingestion failed: ${err?.message ?? err}`);
  process.exit(1);
});
