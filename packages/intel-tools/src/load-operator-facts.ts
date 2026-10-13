/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OperatorFactRecord, OperatorFactsFile } from './operator-facts-types.js';

export type {
  OperatorFactStatus,
  OperatorFactRecord,
  OperatorFactsFile,
  RedemptionFact,
  VipCurrencyRule,
  WelcomeBonusFact,
} from './operator-facts-types.js';

export function loadOperatorFactsFromPath(jsonPath: string): OperatorFactRecord[] {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as OperatorFactsFile;
  return raw.operators;
}

export function loadOperatorFactsFromMonorepo(monorepoRoot?: string): OperatorFactRecord[] {
  const root = monorepoRoot ?? resolve(process.cwd(), '../..');
  const jsonPath = resolve(root, 'data/trust-engine/operator-facts.live.json');
  return loadOperatorFactsFromPath(jsonPath);
}

export function filterLiveOperatorFacts(records: OperatorFactRecord[]): OperatorFactRecord[] {
  return records.filter((record) => record.status === 'live');
}
