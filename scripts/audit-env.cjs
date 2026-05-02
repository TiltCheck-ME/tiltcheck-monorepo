// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-28
// Audits .env.example keys against actual codebase usage.
// Usage: node scripts/audit-env.js

const fs = require('fs');
const { execSync } = require('child_process');

const EXAMPLE_FILE = '.env.example';
const SRC_DIRS = ['apps', 'modules', 'packages', 'workers', 'scripts'];

function rg(pattern, args = '') {
  try {
    return execSync(`rg -l ${args} "${pattern}" ${SRC_DIRS.join(' ')}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

function rgExtract(pattern) {
  try {
    return execSync(`rg -oh --glob "*.ts" --glob "*.js" --glob "*.tsx" --glob "*.mjs" "${pattern}" ${SRC_DIRS.join(' ')}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

// Parse .env.example
const exampleRaw = fs.readFileSync(EXAMPLE_FILE, 'utf8');
const exampleKeys = exampleRaw
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'))
  .map(l => l.split('=')[0].trim())
  .filter(Boolean);

const used = [];
const unused = [];

for (const key of exampleKeys) {
  const found = rg(key, '--glob "*.ts" --glob "*.js" --glob "*.tsx" --glob "*.mjs" --glob "*.yml" --glob "*.yaml"');
  if (found) used.push(key);
  else unused.push(key);
}

// Find process.env.KEY refs not documented in .env.example
const extracted = rgExtract('process\\.env\\.[A-Z_][A-Z0-9_]+');
const allCodeKeys = [...new Set(
  extracted.split('\n')
    .map(l => l.replace('process.env.', '').trim())
    .filter(Boolean)
)];
const missingFromExample = allCodeKeys.filter(k => !exampleKeys.includes(k)).sort();

// Report
console.log('\n=== TiltCheck ENV AUDIT REPORT ===\n');
console.log(`Total in .env.example:         ${exampleKeys.length}`);
console.log(`Found in codebase:             ${used.length}`);
console.log(`NOT found (possibly outdated): ${unused.length}`);
console.log(`In code but MISSING in example: ${missingFromExample.length}`);

if (unused.length) {
  console.log('\n--- Possibly outdated (in .env.example but not found in code) ---');
  unused.forEach(k => console.log('  ' + k));
}

if (missingFromExample.length) {
  console.log('\n--- In code but MISSING from .env.example (add or intentionally omit) ---');
  missingFromExample.forEach(k => console.log('  ' + k));
}

console.log('\n=== END ===\n');
process.exit(unused.length || missingFromExample.length ? 1 : 0);
