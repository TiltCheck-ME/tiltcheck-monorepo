/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GRADE_SCORE, slugifyCasinoName } from './grades.js';
import type { CasinoRecord } from './types.js';

interface RawCasino {
  name: string;
  grade: string;
  risk: string;
  category: string;
}

export function mapRawCasinos(raw: RawCasino[]): CasinoRecord[] {
  return raw.map((casino) => ({
    ...casino,
    slug: slugifyCasinoName(casino.name),
    score: GRADE_SCORE[casino.grade] ?? 40,
  }));
}

export function loadCasinosFromMonorepo(monorepoRoot?: string): CasinoRecord[] {
  const root = monorepoRoot ?? resolve(process.cwd(), '../..');
  const jsonPath = resolve(root, 'apps/web/src/data/casinos.json');

  if (!existsSync(jsonPath)) {
    return mapRawCasinos([
      { name: 'Stake', grade: 'B', risk: 'Medium', category: 'Crypto' },
      { name: 'Stake.us', grade: 'B-', risk: 'Medium', category: 'Sweeps' },
      { name: 'Planet 7 Casino', grade: 'F', risk: 'Critical', category: 'Scam' },
    ]);
  }

  const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as RawCasino[];
  return mapRawCasinos(raw);
}
