/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  filterLiveOperatorFacts,
  loadOperatorFactsFromPath,
} from '../src/load-operator-facts.js';

describe('filterLiveOperatorFacts', () => {
  it('keeps only status live', () => {
    const kept = filterLiveOperatorFacts([
      { slug: 'a', name: 'A', status: 'live', vipCurrencyRules: [], lastVerifiedAt: '2026-07-01' },
      { slug: 'b', name: 'B', status: 'retracted', vipCurrencyRules: [], lastVerifiedAt: '2026-07-01' },
      { slug: 'c', name: 'C', status: 'stale', vipCurrencyRules: [], lastVerifiedAt: '2026-01-01' },
    ]);
    expect(kept.map((r) => r.slug)).toEqual(['a']);
  });
});

describe('loadOperatorFactsFromPath', () => {
  it('loads operators array from json', () => {
    const dir = join(tmpdir(), `tc-facts-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'operator-facts.live.json');
    writeFileSync(
      path,
      JSON.stringify({
        copyright: '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18',
        operators: [
          {
            slug: 'metawin',
            name: 'MetaWin',
            status: 'live',
            vipCurrencyRules: [
              {
                currencyName: 'Gold Coins',
                canLevel: false,
                notes: 'Gold Coins do not count toward VIP level.',
                sourceUrl: 'https://example.com/vip',
                asOf: '2026-07-01',
              },
            ],
            lastVerifiedAt: '2026-07-01',
            verifiedBy: 'fixture',
          },
        ],
      }),
    );
    const loaded = loadOperatorFactsFromPath(path);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.slug).toBe('metawin');
    rmSync(dir, { recursive: true, force: true });
  });
});
