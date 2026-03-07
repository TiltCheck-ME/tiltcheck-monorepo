/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * audit-deps.ts
 *
 * Runs `pnpm audit` and `pnpm outdated` across the entire workspace and
 * prints a formatted summary. Exits with code 1 if any critical or high
 * vulnerabilities are found.
 *
 * Usage:
 *   npx tsx scripts/audit-deps.ts
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'info';

interface Advisory {
  module_name: string;
  severity: Severity;
  vulnerable_versions: string;
  patched_versions: string;
  url: string;
  title: string;
}

interface AuditResult {
  advisories: Record<string, Advisory>;
}

interface OutdatedEntry {
  current: string;
  latest: string;
  wanted: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'moderate', 'low', 'info'];

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: '\x1b[41m\x1b[97m',  // red bg, white text
  high:     '\x1b[31m',           // red
  moderate: '\x1b[33m',           // yellow
  low:      '\x1b[36m',           // cyan
  info:     '\x1b[90m',           // gray
};
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function colorize(severity: Severity, text: string): string {
  return `${SEVERITY_COLOR[severity]}${text}${RESET}`;
}

function runJson(cmd: string): { ok: boolean; data: unknown; raw: string } {
  try {
    const raw = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, data: JSON.parse(raw), raw };
  } catch (err: unknown) {
    // pnpm audit exits non-zero when vulns exist — stdout still has JSON
    const e = err as { stdout?: string; stderr?: string };
    const raw = e.stdout ?? '';
    try {
      return { ok: false, data: JSON.parse(raw), raw };
    } catch {
      return { ok: false, data: null, raw };
    }
  }
}

function padEnd(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function printDivider(char = '─', width = 90): void {
  console.log(DIM + char.repeat(width) + RESET);
}

// ---------------------------------------------------------------------------
// Section 1 – Vulnerability audit
// ---------------------------------------------------------------------------

function runVulnerabilityAudit(): boolean {
  console.log(`\n${BOLD}=== Vulnerability Audit (pnpm audit) ===${RESET}\n`);

  const { data } = runJson('pnpm audit --json');

  if (!data) {
    console.log(`${DIM}No JSON output from pnpm audit. Skipping.${RESET}`);
    return false;
  }

  const result = data as AuditResult;
  const advisories = Object.values(result.advisories ?? {});

  if (advisories.length === 0) {
    console.log('\x1b[32mNo vulnerabilities found.\x1b[0m');
    return false;
  }

  // Group by severity
  const grouped = new Map<Severity, Advisory[]>();
  for (const sev of SEVERITY_ORDER) grouped.set(sev, []);
  for (const adv of advisories) {
    const bucket = grouped.get(adv.severity) ?? grouped.get('info')!;
    bucket.push(adv);
  }

  // Header row
  printDivider();
  console.log(
    BOLD +
    padEnd('Package', 28) +
    padEnd('Severity', 10) +
    padEnd('Vulnerable Range', 18) +
    padEnd('Patched', 14) +
    'Advisory URL' +
    RESET,
  );
  printDivider();

  let hasHighOrCritical = false;

  for (const sev of SEVERITY_ORDER) {
    const entries = grouped.get(sev) ?? [];
    for (const adv of entries) {
      if (sev === 'critical' || sev === 'high') hasHighOrCritical = true;
      console.log(
        padEnd(adv.module_name, 28) +
        colorize(sev, padEnd(sev.toUpperCase(), 10)) +
        padEnd(adv.vulnerable_versions || 'unknown', 18) +
        padEnd(adv.patched_versions || 'none', 14) +
        DIM + adv.url + RESET,
      );
    }
  }

  printDivider();

  // Summary counts
  console.log('');
  for (const sev of SEVERITY_ORDER) {
    const count = grouped.get(sev)?.length ?? 0;
    if (count > 0) {
      console.log(`  ${colorize(sev, sev.toUpperCase())}: ${count}`);
    }
  }

  return hasHighOrCritical;
}

// ---------------------------------------------------------------------------
// Section 2 – Outdated dependencies
// ---------------------------------------------------------------------------

function runOutdatedCheck(): void {
  console.log(`\n${BOLD}=== Outdated Dependencies (pnpm outdated) ===${RESET}\n`);

  const { data } = runJson('pnpm outdated --json --recursive');

  if (!data || typeof data !== 'object') {
    console.log(`${DIM}No outdated dependency data returned.${RESET}`);
    return;
  }

  // pnpm outdated --json --recursive returns { [pkgName]: OutdatedEntry }
  const entries = Object.entries(data as Record<string, OutdatedEntry>);

  if (entries.length === 0) {
    console.log('\x1b[32mAll dependencies are up to date.\x1b[0m');
    return;
  }

  printDivider();
  console.log(
    BOLD +
    padEnd('Package', 40) +
    padEnd('Current', 14) +
    padEnd('Wanted', 14) +
    'Latest' +
    RESET,
  );
  printDivider();

  for (const [name, info] of entries) {
    const isStale = info.current !== info.latest;
    console.log(
      padEnd(name, 40) +
      DIM + padEnd(info.current, 14) + RESET +
      padEnd(info.wanted, 14) +
      (isStale ? '\x1b[33m' : '\x1b[32m') + info.latest + RESET,
    );
  }

  printDivider();
  console.log(`\n  ${entries.length} outdated package(s) found.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const hasHighOrCritical = runVulnerabilityAudit();
runOutdatedCheck();
console.log('');

if (hasHighOrCritical) {
  console.error(`${BOLD}\x1b[31mFAIL: Critical or high vulnerabilities detected. Resolve before deploying.\x1b[0m${RESET}\n`);
  process.exit(1);
}

console.log(`${BOLD}\x1b[32mPASS: No critical or high vulnerabilities found.\x1b[0m${RESET}\n`);
