/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  filterLiveOperatorFacts,
  loadOperatorFactsFromPath,
} from '../src/load-operator-facts.js';
import {
  getVipCurrencyAnswer,
  isFactStale,
  resolveOperatorFacts,
} from '../src/operator-facts.js';

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

describe('isFactStale', () => {
  it('marks facts older than 90 days stale', () => {
    expect(isFactStale('2026-01-01', new Date('2026-07-18'))).toBe(true);
    expect(isFactStale('2026-06-01', new Date('2026-07-18'))).toBe(false);
  });
});

describe('resolveOperatorFacts', () => {
  const records = [
    {
      slug: 'metawin',
      name: 'MetaWin',
      aliases: ['metawin.us'],
      status: 'live' as const,
      lastVerifiedAt: '2026-07-01',
    },
    {
      slug: 'metawin-mirror',
      name: 'MetaWin Mirror',
      aliases: ['metawin'],
      status: 'live' as const,
      lastVerifiedAt: '2026-07-01',
    },
  ];

  it('matches slug and alias for the same query', () => {
    const matches = resolveOperatorFacts(records, 'metawin');
    expect(matches.map((r) => r.slug).sort()).toEqual(['metawin', 'metawin-mirror']);
  });
});

describe('getVipCurrencyAnswer', () => {
  const records = [
    {
      slug: 'metawin',
      name: 'MetaWin',
      aliases: ['metawin.us'],
      status: 'live' as const,
      lastVerifiedAt: '2026-07-01',
      vipCurrencyRules: [
        {
          currencyName: 'Gold Coins',
          canLevel: false,
          notes: 'Gold Coins do not count toward VIP level.',
          sourceUrl: 'https://example.com/vip',
          asOf: '2026-07-01',
        },
      ],
    },
  ];

  it('returns rules for matched operator', () => {
    const answer = getVipCurrencyAnswer(records, 'metawin');
    expect(answer.kind).toBe('hit');
    if (answer.kind === 'hit') {
      expect(answer.rules[0]?.canLevel).toBe(false);
    }
  });

  it('returns miss when operator has no vip rules', () => {
    const answer = getVipCurrencyAnswer(
      [{ slug: 'x', name: 'X', status: 'live', lastVerifiedAt: '2026-07-01' }],
      'x',
    );
    expect(answer.kind).toBe('miss');
  });

  it('returns none when operator unknown', () => {
    expect(getVipCurrencyAnswer(records, 'unknown-casino').kind).toBe('none');
  });

  it('returns ambiguous when multiple match', () => {
    const dup = [
      ...records,
      { ...records[0], slug: 'metawin-mirror', name: 'MetaWin Mirror', aliases: ['metawin'] },
    ];
    expect(getVipCurrencyAnswer(dup, 'metawin').kind).toBe('ambiguous');
  });
});
