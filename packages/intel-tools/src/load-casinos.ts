/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-06 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { mapRawCasinos, type RawCasino } from './grades.js';
import type { CasinoRecord } from './types.js';

export { mapRawCasinos, type RawCasino };

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
