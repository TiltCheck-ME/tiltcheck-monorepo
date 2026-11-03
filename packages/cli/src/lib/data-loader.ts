/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeCasinoName } from '@tiltcheck/shared';

export interface RawCasinoRecord {
  name: string;
  grade: string;
  risk: string;
  category: string;
  audited?: boolean;
  license?: string;
  rtpSummary?: string;
  rtpOriginals?: string;
  rtpSlots?: string;
  vaultSupport?: string;
  playthrough?: string;
  evidence?: string[];
}

export interface ProviderGame {
  gameTitle: string;
  gameSlug: string;
  certifiedTiers: number[];
  maxRtp: number;
  minRtp: number;
  certifiedBy: string;
  certifiedYear: number;
}

export interface MasterProvider {
  providerName: string;
  games: ProviderGame[];
}

export interface MasterRtpData {
  _comment?: string;
  _note?: string;
  providers: MasterProvider[];
}

/**
 * Resolves the monorepo root directory by traversing upwards for pnpm-workspace.yaml.
 * First traverses upwards from startDir, then falls back to traversing upwards from module location.
 */
export function findMonorepoRoot(startDir: string = process.cwd()): string {
  // First attempt: traverse upwards from startDir
  let curr = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(curr, 'pnpm-workspace.yaml'))) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) {
      break;
    }
    curr = parent;
  }

  // Fallback attempt: traverse upwards from this file's module location
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    while (dir) {
      if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  } catch {
    // Ignore error if import.meta.url cannot be parsed
  }

  return process.cwd();
}

/**
 * Resolves the CLI package root directory containing packages/cli/package.json.
 */
export function findPackageRoot(): string {
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    while (dir) {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (raw.name === '@tiltcheck/cli') {
            return dir;
          }
        } catch {
          // Continue scanning parent
        }
      }
      const parent = path.dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  } catch {
    // Ignore error
  }
  return path.resolve(findMonorepoRoot(), 'packages/cli');
}

/**
 * Loads casinos dataset from apps/web/src/data/casinos.json or local package data.
 */
export function loadCasinos(customRoot?: string): RawCasinoRecord[] {
  const root = customRoot ?? findMonorepoRoot();
  const pkgRoot = findPackageRoot();

  const candidatePaths = [
    path.resolve(root, 'apps/web/src/data/casinos.json'),
    path.resolve(pkgRoot, 'data/casinos.json'),
    path.resolve(root, 'data/casinos.json'),
    path.resolve(process.cwd(), 'apps/web/src/data/casinos.json'),
    path.resolve(process.cwd(), '../web/src/data/casinos.json'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw) as RawCasinoRecord[];
      } catch (err) {
        console.error(`Failed to parse casinos from ${p}:`, err);
      }
    }
  }

  return [];
}

/**
 * Loads provider master RTP tiers from data/provider-master-rtp.json or local package data.
 */
export function loadMasterRtp(customRoot?: string): MasterRtpData | null {
  const root = customRoot ?? findMonorepoRoot();
  const pkgRoot = findPackageRoot();

  const candidatePaths = [
    path.resolve(root, 'data/provider-master-rtp.json'),
    path.resolve(pkgRoot, 'data/provider-master-rtp.json'),
    path.resolve(root, 'apps/web/src/data/provider-master-rtp.json'),
    path.resolve(process.cwd(), 'data/provider-master-rtp.json'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw) as MasterRtpData;
      } catch (err) {
        console.error(`Failed to parse provider master RTP from ${p}:`, err);
      }
    }
  }

  return null;
}

/**
 * Normalizes an operator name for comparison (lowercase, trimmed, stripped of special chars).
 * Leverages @tiltcheck/shared normalizeCasinoName standard.
 */
export function normalizeOperatorName(name: string): string {
  return normalizeCasinoName(name);
}

/**
 * Finds matching casinos by name (case-insensitive, exact and partial matching).
 */
export function findCasinos(
  casinos: RawCasinoRecord[],
  query: string
): { matches: RawCasinoRecord[]; exact: RawCasinoRecord | null } {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return { matches: [], exact: null };
  }

  const normalizedQuery = normalizeOperatorName(query);

  let exact: RawCasinoRecord | null = null;
  const matches: RawCasinoRecord[] = [];

  for (const casino of casinos) {
    const casinoLower = casino.name.toLowerCase();
    const normalizedCasino = normalizeOperatorName(casino.name);

    if (casinoLower === cleanQuery || normalizedCasino === normalizedQuery) {
      if (!exact) exact = casino;
      matches.push(casino);
    } else if (
      casinoLower.includes(cleanQuery) ||
      normalizedCasino.includes(normalizedQuery) ||
      cleanQuery.includes(casinoLower)
    ) {
      matches.push(casino);
    }
  }

  return { matches, exact };
}
