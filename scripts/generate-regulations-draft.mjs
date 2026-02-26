/**
 * Generate regulation draft records using Elastic AI endpoint.
 *
 * Usage:
 *   node scripts/generate-regulations-draft.mjs
 *   node scripts/generate-regulations-draft.mjs --limit 10
 *   node scripts/generate-regulations-draft.mjs --input data/regulations/regulations-tracker-template.csv --source-map data/regulations/state-regulator-source-map-template.json --output data/regulations-us.draft.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const DEFAULT_INPUT = 'data/regulations/regulations-tracker-template.csv';
const DEFAULT_SOURCE_MAP = 'data/regulations/state-regulator-source-map-template.json';
const DEFAULT_OUTPUT = 'data/regulations-us.draft.json';
const DEFAULT_MODEL = process.env.ELASTIC_AGENT_MODEL || 'gpt-4o';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function parseIntArg(name, fallback) {
  const val = arg(name, null);
  if (!val) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function loadEnv() {
  const paths = [
    resolve(process.cwd(), 'apps/discord-bot/.env'),
    resolve(process.cwd(), '.env'),
  ];

  for (const p of paths) {
    try {
      const lines = readFileSync(p, 'utf8').split('\n');
      for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const idx = t.indexOf('=');
        if (idx === -1) continue;
        const k = t.slice(0, idx).trim();
        const v = t.slice(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
      return;
    } catch {
      // continue
    }
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((v) => v.length > 0)) rows.push(row);
      row = [];
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((v) => v.length > 0)) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());

  return rows.slice(1).map((r) => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = (r[i] ?? '').trim();
    }
    return obj;
  });
}

function isBlankTask(row) {
  return !row.status || !row.summary || !row.source_url_1 || !row.citation_1;
}

function extractJsonObject(text) {
  const cleaned = text.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  const fenceStart = cleaned.indexOf('{');
  const fenceEnd = cleaned.lastIndexOf('}');
  if (fenceStart !== -1 && fenceEnd !== -1 && fenceEnd > fenceStart) {
    const slice = cleaned.slice(fenceStart, fenceEnd + 1);
    return JSON.parse(slice);
  }

  throw new Error('No valid JSON object found in model response.');
}

function buildPrompt(task, sourceMapEntry) {
  return `You are drafting a US gaming regulation record. Return ONLY one JSON object.

Required schema:
{
  "regulation_id": string,
  "jurisdiction": {"country":"US","state_code": string,"state_name": string},
  "topic": "igaming" | "sportsbook" | "sweepstakes",
  "subtopic": string,
  "status": "legal" | "restricted" | "prohibited" | "pending_review",
  "effective_date": "YYYY-MM-DD",
  "last_reviewed_at": "YYYY-MM-DD",
  "next_review_due": "YYYY-MM-DD",
  "summary": string,
  "requirements": [{"key": string, "value": string, "applies_to": string}],
  "penalties": {"civil": string, "criminal": string, "license_impact": string},
  "citations": [{"citation": string, "source_url": string, "publisher": string, "published_at": "YYYY-MM-DD"}],
  "source_quality": "primary",
  "tags": string[]
}

Rules:
- Use only primary sources; prefer state regulator and statutes URLs.
- If uncertain, set status="pending_review" and clearly say uncertainty in summary.
- No markdown, no explanation, JSON object only.

Task:
${JSON.stringify(task, null, 2)}

Preferred source hints:
${JSON.stringify(sourceMapEntry || {}, null, 2)}
`;
}

async function callElasticAgent(endpoint, apiKey, model, prompt) {
  const resp = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You extract legal/regulatory records and return strict JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1200,
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Agent call failed (${resp.status}): ${body.slice(0, 400)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Agent response missing content.');
  return content;
}

async function main() {
  loadEnv();

  const endpoint = process.env.ELASTIC_AGENT_ENDPOINT;
  const apiKey = process.env.ELASTIC_API_KEY;
  const model = arg('--model', DEFAULT_MODEL);

  if (!endpoint || !apiKey) {
    throw new Error('ELASTIC_AGENT_ENDPOINT and ELASTIC_API_KEY are required.');
  }

  const inPath = resolve(process.cwd(), arg('--input', DEFAULT_INPUT));
  const mapPath = resolve(process.cwd(), arg('--source-map', DEFAULT_SOURCE_MAP));
  const outPath = resolve(process.cwd(), arg('--output', DEFAULT_OUTPUT));
  const limit = parseIntArg('--limit', 25);

  if (!existsSync(inPath)) throw new Error(`Input CSV not found: ${inPath}`);
  if (!existsSync(mapPath)) throw new Error(`Source map not found: ${mapPath}`);

  const rows = parseCsv(readFileSync(inPath, 'utf8'));
  const sourceMap = JSON.parse(readFileSync(mapPath, 'utf8'));

  const pending = rows.filter(isBlankTask).slice(0, limit);
  const drafts = [];
  const failures = [];

  for (const row of pending) {
    const task = {
      regulation_id: row.regulation_id,
      state_code: row.state_code,
      state_name: row.state_name,
      topic: row.topic,
      subtopic: row.subtopic || 'general_status',
    };

    const mapEntry = sourceMap?.states?.[row.state_code] || {};

    try {
      const prompt = buildPrompt(task, mapEntry);
      const content = await callElasticAgent(endpoint, apiKey, model, prompt);
      const parsed = extractJsonObject(content);
      drafts.push(parsed);
      console.log(`Drafted: ${row.regulation_id}`);
    } catch (err) {
      failures.push({ regulation_id: row.regulation_id, error: String(err) });
      console.error(`Failed: ${row.regulation_id} -> ${String(err)}`);
    }
  }

  writeFileSync(outPath, JSON.stringify(drafts, null, 2));

  const reportPath = resolve(process.cwd(), 'data/regulations/generate-regulations-draft-report.json');
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        input: inPath,
        output: outPath,
        requested: pending.length,
        drafted: drafts.length,
        failed: failures.length,
        failures,
      },
      null,
      2,
    ),
  );

  console.log(`Draft file: ${outPath}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(`generate-regulations-draft failed: ${err?.message ?? err}`);
  process.exit(1);
});
