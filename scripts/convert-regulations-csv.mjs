/**
 * Convert regulations tracker CSV to regulations-us.primary.json
 *
 * Usage:
 *   node scripts/convert-regulations-csv.mjs
 *   node scripts/convert-regulations-csv.mjs --input data/regulations/regulations-tracker-template.csv --output data/regulations-us.primary.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const DEFAULT_INPUT = 'data/regulations/regulations-tracker-template.csv';
const DEFAULT_OUTPUT = 'data/regulations-us.primary.json';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
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

function hasRequired(row) {
  return (
    row.regulation_id &&
    row.state_code &&
    row.state_name &&
    row.topic &&
    row.status &&
    row.effective_date &&
    row.summary &&
    row.source_url_1 &&
    row.citation_1
  );
}

function toDoc(row) {
  const citations = [
    row.source_url_1
      ? {
          citation: row.citation_1 || 'PRIMARY_CITATION',
          source_url: row.source_url_1,
          publisher: '',
          published_at: row.effective_date,
        }
      : null,
    row.source_url_2
      ? {
          citation: row.citation_2 || 'SECONDARY_CITATION',
          source_url: row.source_url_2,
          publisher: '',
          published_at: row.effective_date,
        }
      : null,
  ].filter(Boolean);

  return {
    regulation_id: row.regulation_id,
    jurisdiction: {
      country: 'US',
      state_code: row.state_code.toUpperCase(),
      state_name: row.state_name,
    },
    topic: row.topic.toLowerCase(),
    subtopic: row.subtopic || 'general_status',
    status: row.status,
    effective_date: row.effective_date,
    last_reviewed_at: row.verified_at || new Date().toISOString().slice(0, 10),
    next_review_due: row.next_review_due || '',
    summary: row.summary,
    requirements: [],
    penalties: {
      civil: '',
      criminal: '',
      license_impact: '',
    },
    citations,
    source_quality: row.source_quality || 'primary',
    tags: [row.topic.toLowerCase(), 'primary'],
  };
}

function main() {
  const input = resolve(process.cwd(), arg('--input', DEFAULT_INPUT));
  const output = resolve(process.cwd(), arg('--output', DEFAULT_OUTPUT));

  const csv = readFileSync(input, 'utf8');
  const rows = parseCsv(csv);

  const accepted = [];
  const skipped = [];

  for (const row of rows) {
    if (!hasRequired(row)) {
      skipped.push({
        regulation_id: row.regulation_id || '(missing)',
        state_code: row.state_code || '(missing)',
        topic: row.topic || '(missing)',
      });
      continue;
    }

    accepted.push(toDoc(row));
  }

  writeFileSync(output, JSON.stringify(accepted, null, 2));

  const reportPath = resolve(process.cwd(), 'data/regulations/convert-regulations-report.json');
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        input,
        output,
        total_rows: rows.length,
        converted_rows: accepted.length,
        skipped_rows: skipped.length,
        skipped,
      },
      null,
      2,
    ),
  );

  console.log(`Converted ${accepted.length}/${rows.length} rows to ${output}`);
  console.log(`Report: ${reportPath}`);
}

main();
