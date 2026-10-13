#!/usr/bin/env node
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const FORBIDDEN = /AutoClaimer|TG AutoClaimer|autoclaim/i;
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', '.turbo', 'coverage']);
const ROOTS = ['apps', 'packages'];
const FAIL_LINE = 'AutoClaimer is out of scope for the player build. Do not ship it.';

const root = process.env.TILTCHECK_GUARD_ROOT || process.cwd();
const hits = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full);
      continue;
    }
    if (!entry.isFile()) continue;
    const nameHit = FORBIDDEN.test(entry.name);
    const extOk = EXTENSIONS.has(extname(entry.name));
    if (!nameHit && !extOk) continue;
    if (nameHit) {
      hits.push(relative(root, full));
      continue;
    }
    const text = readFileSync(full, 'utf8');
    if (FORBIDDEN.test(text)) hits.push(relative(root, full));
  }
}

for (const rel of ROOTS) {
  try {
    if (statSync(join(root, rel)).isDirectory()) walk(join(root, rel));
  } catch {
    /* missing root in fixture trees is fine */
  }
}

if (hits.length > 0) {
  console.error(FAIL_LINE);
  for (const hit of hits) console.error(`- ${hit}`);
  process.exit(1);
}

console.log('No AutoClaimer identifiers in apps/ or packages/.');
