/**
 * Primary-source sync pipeline for US regulations.
 *
 * This script enforces source quality and domain validation before indexing.
 *
 * Usage:
 *   node scripts/sync-regulations-us.mjs --source data/regulations-us.primary.json
 *   node scripts/sync-regulations-us.mjs --source data/regulations-us.primary.json --dry-run
 */

import { Client } from '@elastic/elasticsearch';
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const INDEX = process.env.REGULATIONS_INDEX || 'tiltcheck-regulations-us-v1';
const DEFAULT_SOURCE = 'data/regulations-us.primary.json';
const DEFAULT_ALLOWLIST = 'data/regulations-source-allowlist.json';

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]);

const TOPICS = new Set(['sportsbook', 'igaming', 'sweepstakes']);

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
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
      return;
    } catch {
      // noop
    }
  }
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function flag(name) {
  return process.argv.includes(name);
}

function getHostname(raw) {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isAllowedSource(url, allowlist) {
  const host = getHostname(url);
  if (!host) return false;
  if (host.endsWith('.gov') || host === 'gov') return true;

  return allowlist.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

function stableHash(input) {
  return createHash('sha256').update(input).digest('hex');
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeDoc(doc) {
  const stateCode = String(doc?.jurisdiction?.state_code ?? '').toUpperCase();
  const topic = String(doc?.topic ?? '').toLowerCase();

  return {
    ...doc,
    jurisdiction: {
      ...(doc.jurisdiction || {}),
      country: 'US',
      state_code: stateCode,
    },
    topic,
    source_quality: String(doc.source_quality || '').toLowerCase(),
    citations: ensureArray(doc.citations),
    requirements: ensureArray(doc.requirements),
    tags: ensureArray(doc.tags),
  };
}

function validateDoc(doc, allowlist) {
  const errors = [];

  if (!doc.regulation_id) errors.push('missing regulation_id');
  if (!doc.jurisdiction?.state_code) errors.push('missing jurisdiction.state_code');
  if (!US_STATES.has(doc.jurisdiction?.state_code)) errors.push('invalid state_code');
  if (!doc.topic || !TOPICS.has(doc.topic)) errors.push('invalid topic');
  if (!doc.status) errors.push('missing status');
  if (doc.source_quality !== 'primary') errors.push('source_quality must be primary');

  const citations = ensureArray(doc.citations);
  if (!citations.length) errors.push('missing citations');

  for (const c of citations) {
    if (!c?.source_url) {
      errors.push('citation missing source_url');
      continue;
    }

    if (!isAllowedSource(c.source_url, allowlist)) {
      errors.push(`citation source_url not allowlisted: ${c.source_url}`);
    }
  }

  return errors;
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
        content_hash: { type: 'keyword' },
        ingested_at: { type: 'date' },
        tags: { type: 'keyword' },
      },
    },
  });
}

async function resolveVersion(client, doc) {
  try {
    const prev = await client.get({ index: INDEX, id: doc.regulation_id });
    const source = prev._source || {};

    if (source.content_hash === doc.content_hash) {
      return Number(source.version || 1);
    }

    return Number(source.version || 1) + 1;
  } catch (err) {
    if (err?.meta?.statusCode === 404) return 1;
    throw err;
  }
}

function writeReport(file, payload) {
  writeFileSync(resolve(process.cwd(), file), JSON.stringify(payload, null, 2));
}

async function main() {
  loadEnv();

  const sourceArg = arg('--source', DEFAULT_SOURCE);
  const allowArg = arg('--allowlist', DEFAULT_ALLOWLIST);
  const dryRun = flag('--dry-run');

  const sourcePath = resolve(process.cwd(), sourceArg);
  const allowPath = resolve(process.cwd(), allowArg);

  if (!existsSync(sourcePath)) {
    throw new Error(`Missing source file: ${sourcePath}`);
  }

  if (!existsSync(allowPath)) {
    throw new Error(`Missing allowlist file: ${allowPath}`);
  }

  const rawDocs = loadJson(sourcePath);
  const allowlist = loadJson(allowPath);

  if (!Array.isArray(rawDocs)) {
    throw new Error('Source file must be a JSON array.');
  }

  if (!Array.isArray(allowlist)) {
    throw new Error('Allowlist file must be a JSON array of hostnames.');
  }

  const normalized = rawDocs.map(normalizeDoc);

  const accepted = [];
  const rejected = [];

  for (const doc of normalized) {
    const errors = validateDoc(doc, allowlist);
    if (errors.length) {
      rejected.push({ regulation_id: doc.regulation_id, errors, doc });
      continue;
    }

    const contentHash = stableHash(
      JSON.stringify({
        jurisdiction: doc.jurisdiction,
        topic: doc.topic,
        subtopic: doc.subtopic,
        status: doc.status,
        effective_date: doc.effective_date,
        summary: doc.summary,
        requirements: doc.requirements,
        penalties: doc.penalties,
        citations: doc.citations,
      }),
    );

    accepted.push({ ...doc, content_hash: contentHash });
  }

  writeReport('data/regulations-us.rejections.json', {
    generated_at: new Date().toISOString(),
    rejected_count: rejected.length,
    rejected,
  });

  if (dryRun) {
    console.log(`Dry run complete: accepted=${accepted.length}, rejected=${rejected.length}`);
    return;
  }

  const url = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;

  if (!url || !apiKey) {
    throw new Error('ELASTIC_URL and ELASTIC_API_KEY are required.');
  }

  const client = new Client({ node: url, auth: { apiKey } });
  await ensureIndex(client, INDEX);

  const ops = [];
  for (const doc of accepted) {
    const version = await resolveVersion(client, doc);
    ops.push({ index: { _index: INDEX, _id: doc.regulation_id } });
    ops.push({
      ...doc,
      version,
      ingested_at: new Date().toISOString(),
    });
  }

  if (ops.length) {
    const resp = await client.bulk({ operations: ops, refresh: true });
    if (resp.errors) {
      const failed = resp.items.filter((it) => it.index?.error);
      throw new Error(`Bulk indexing failed: ${failed.length} error(s).`);
    }
  }

  const statesCovered = new Set(accepted.map((d) => d.jurisdiction.state_code));
  console.log(`Synced ${accepted.length} records into ${INDEX}`);
  console.log(`Coverage: ${statesCovered.size}/50 states`);
  console.log(`Rejected: ${rejected.length} (see data/regulations-us.rejections.json)`);
}

main().catch((err) => {
  console.error(`sync-regulations-us failed: ${err?.message ?? err}`);
  process.exit(1);
});
