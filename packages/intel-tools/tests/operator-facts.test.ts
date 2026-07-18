/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  filterLiveOperatorFacts,
  loadOperatorFactsFromPath,
} from '../src/load-operator-facts.js';
import { IntelTools } from '../src/tools.js';
import {
  getRedemptionAnswer,
  getVipCurrencyAnswer,
  getWelcomeBonusAnswer,
  isFactStale,
  listAvailableFactTypesAnswer,
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

  it('matches record.domains', () => {
    const domainRecords = [
      {
        slug: 'fixture-casino',
        name: 'Fixture Casino',
        domains: ['play.fixture-casino.test'],
        status: 'live' as const,
        lastVerifiedAt: '2026-07-01',
      },
    ];
    const matches = resolveOperatorFacts(domainRecords, 'play.fixture-casino.test');
    expect(matches).toHaveLength(1);
    expect(matches[0]?.slug).toBe('fixture-casino');
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

describe('getRedemptionAnswer', () => {
  const records = [
    {
      slug: 'fixture-casino',
      name: 'Fixture Casino',
      status: 'live' as const,
      lastVerifiedAt: '2026-07-01',
      redemptionTime: {
        claim: 'Redemptions typically clear within 24-72 hours.',
        sourceUrl: 'https://example.com/redemption',
        asOf: '2026-07-01',
        minHours: 24,
        maxHours: 72,
      },
    },
  ];

  it('returns redemption payload for matched operator', () => {
    const answer = getRedemptionAnswer(records, 'fixture-casino');
    expect(answer.kind).toBe('hit');
    if (answer.kind === 'hit') {
      expect(answer.payload.minHours).toBe(24);
      expect(answer.payload.maxHours).toBe(72);
    }
  });

  it('returns miss when operator has no redemption fact', () => {
    const answer = getRedemptionAnswer(
      [{ slug: 'x', name: 'X', status: 'live', lastVerifiedAt: '2026-07-01' }],
      'x',
    );
    expect(answer.kind).toBe('miss');
  });

  it('returns none when operator unknown', () => {
    expect(getRedemptionAnswer(records, 'unknown-casino').kind).toBe('none');
  });
});

describe('getWelcomeBonusAnswer', () => {
  const records = [
    {
      slug: 'fixture-casino',
      name: 'Fixture Casino',
      status: 'live' as const,
      lastVerifiedAt: '2026-07-01',
      welcomeBonusSummary: {
        summary: 'First purchase match up to 100 SC for US-FL players.',
        sourceUrl: 'https://example.com/welcome',
        asOf: '2026-07-01',
        geoTags: ['US-FL'],
      },
    },
  ];

  it('returns welcome bonus payload for matched operator and geo', () => {
    const answer = getWelcomeBonusAnswer(records, 'fixture-casino', 'US-FL');
    expect(answer.kind).toBe('hit');
    if (answer.kind === 'hit') {
      expect(answer.payload.summary).toContain('100 SC');
    }
  });

  it('returns miss when geoTag is set but not on record', () => {
    const answer = getWelcomeBonusAnswer(records, 'fixture-casino', 'US-CA');
    expect(answer.kind).toBe('miss');
  });

  it('returns none when operator unknown', () => {
    expect(getWelcomeBonusAnswer(records, 'unknown-casino', 'US-FL').kind).toBe('none');
  });
});

describe('listAvailableFactTypesAnswer', () => {
  const records = [
    {
      slug: 'fixture-casino',
      name: 'Fixture Casino',
      status: 'live' as const,
      lastVerifiedAt: '2026-07-01',
      vipCurrencyRules: [
        {
          currencyName: 'Gold Coins',
          canLevel: false,
          notes: 'Fixture rule.',
          sourceUrl: 'https://example.com/vip',
          asOf: '2026-07-01',
        },
      ],
      redemptionTime: {
        claim: 'Fixture redemption window.',
        sourceUrl: 'https://example.com/redemption',
        asOf: '2026-07-01',
      },
      welcomeBonusSummary: {
        summary: 'Fixture welcome offer.',
        sourceUrl: 'https://example.com/welcome',
        asOf: '2026-07-01',
      },
    },
  ];

  it('lists available fact types for matched operator', () => {
    const answer = listAvailableFactTypesAnswer(records, 'fixture-casino');
    expect(answer.kind).toBe('hit');
    if (answer.kind === 'hit') {
      expect(answer.payload.sort()).toEqual(['redemption', 'vip', 'welcome']);
    }
  });
});

describe('IntelTools operatorFacts filtering', () => {
  const liveRecord = {
    slug: 'fixture-live',
    name: 'Fixture Live',
    status: 'live' as const,
    lastVerifiedAt: '2026-07-01',
    vipCurrencyRules: [
      {
        currencyName: 'Gold Coins',
        canLevel: false,
        notes: 'Fixture live rule.',
        sourceUrl: 'https://example.com/vip',
        asOf: '2026-07-01',
      },
    ],
  };

  const retractedRecord = {
    slug: 'fixture-retracted',
    name: 'Fixture Retracted',
    status: 'retracted' as const,
    lastVerifiedAt: '2026-07-01',
    vipCurrencyRules: [
      {
        currencyName: 'Retracted Coins',
        canLevel: true,
        notes: 'Should never surface.',
        sourceUrl: 'https://example.com/retracted',
        asOf: '2026-07-01',
      },
    ],
  };

  it('filters retracted records at construction; live records resolve', () => {
    const retractedOnly = new IntelTools({
      apiBase: 'https://example.com',
      casinos: [],
      operatorFacts: [retractedRecord],
    });
    expect(retractedOnly.getOperatorVipFacts('fixture-retracted').kind).toBe('none');

    const liveTools = new IntelTools({
      apiBase: 'https://example.com',
      casinos: [],
      operatorFacts: [liveRecord, retractedRecord],
    });
    const answer = liveTools.getOperatorVipFacts('fixture-live');
    expect(answer.kind).toBe('hit');
    if (answer.kind === 'hit') {
      expect(answer.rules[0]?.currencyName).toBe('Gold Coins');
    }
  });
});
