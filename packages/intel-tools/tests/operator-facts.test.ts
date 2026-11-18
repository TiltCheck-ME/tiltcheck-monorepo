/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  filterLiveOperatorFacts,
  loadOperatorFactsFromPath,
} from '../src/load-operator-facts.js';
import { IntelTools } from '../src/tools.js';
import {
  getPayoutBenchmarkAnswer,
  getRedemptionAnswer,
  getVipCurrencyAnswer,
  getWelcomeBonusAnswer,
  isFactStale,
  listAvailableFactTypesAnswer,
  payoutSpeedTier,
  rankPayoutBenchmarks,
  resolveOperatorFacts,
} from '../src/operator-facts.js';
import type { OperatorFactRecord } from '../src/operator-facts-types.js';

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
      aliases: ['meta-win'],
      domains: ['metawin.us'],
      status: 'live' as const,
      lastVerifiedAt: '2026-07-01',
    },
    {
      slug: 'metawin-mirror',
      name: 'MetaWin Mirror',
      aliases: ['mw-mirror'],
      status: 'live' as const,
      lastVerifiedAt: '2026-07-01',
    },
  ];

  it('prefers exact normalized matches over broader prefix matches', () => {
    const matches = resolveOperatorFacts(records, 'metawin');
    expect(matches.map((r) => r.slug)).toEqual(['metawin']);
  });

  it('still supports exact alias matches', () => {
    const matches = resolveOperatorFacts(records, 'meta-win');
    expect(matches.map((r) => r.slug)).toEqual(['metawin']);
  });

  it('does not match short substring queries across multiple brands', () => {
    const matches = resolveOperatorFacts(
      [
        {
          slug: 'cloudbet',
          name: 'Cloudbet',
          domains: ['cloudbet.com'],
          status: 'live' as const,
          lastVerifiedAt: '2026-07-01',
        },
        {
          slug: 'sportsbet',
          name: 'Sportsbet',
          domains: ['sportsbet.io'],
          status: 'live' as const,
          lastVerifiedAt: '2026-07-01',
        },
      ],
      'bet',
    );
    expect(matches).toEqual([]);
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

  it('matches a query against the domain base', () => {
    const matches = resolveOperatorFacts(records, 'metawin.us');
    expect(matches.map((r) => r.slug)).toEqual(['metawin']);
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
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

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
      expect(answer.stale).toBe(false);
    }
  });

  it('marks available fact types stale when any listed fact is stale', () => {
    const answer = listAvailableFactTypesAnswer(
      [
        {
          slug: 'fixture-casino',
          name: 'Fixture Casino',
          status: 'live' as const,
          lastVerifiedAt: '2026-07-18',
          vipCurrencyRules: [
            {
              currencyName: 'Gold Coins',
              canLevel: false,
              notes: 'Older VIP rule.',
              sourceUrl: 'https://example.com/vip',
              asOf: '2026-01-01',
            },
          ],
          welcomeBonusSummary: {
            summary: 'Fresh welcome offer.',
            sourceUrl: 'https://example.com/welcome',
            asOf: '2026-07-01',
          },
        },
      ],
      'fixture-casino',
    );

    expect(answer.kind).toBe('hit');
    if (answer.kind === 'hit') {
      expect(answer.payload.sort()).toEqual(['vip', 'welcome']);
      expect(answer.stale).toBe(true);
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

describe('live operator facts coverage gate', () => {
  it('satisfies the priority coverage gate of at least 25 valid live records', () => {
    const candidates = [
      join(process.cwd(), 'data/trust-engine/operator-facts.live.json'),
      join(process.cwd(), '../../data/trust-engine/operator-facts.live.json'),
    ];
    const livePath = candidates.find((p) => existsSync(p)) ?? candidates[0];
    const records = loadOperatorFactsFromPath(livePath);

    expect(records.length).toBeGreaterThanOrEqual(25);

    for (const record of records) {
      expect(record.slug).toBeTruthy();
      expect(record.name).toBeTruthy();
      expect(record.status).toBe('live');
      expect(record.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const hasRedemption = Boolean(record.redemptionTime?.claim && record.redemptionTime?.sourceUrl);
      const hasWelcome = Boolean(record.welcomeBonusSummary?.summary && record.welcomeBonusSummary?.sourceUrl);
      const hasVip = Boolean(record.vipCurrencyRules && record.vipCurrencyRules.length > 0);
      const hasPayoutBenchmark = Boolean(record.payoutBenchmark?.fastestSpeed && record.payoutBenchmark?.sourceUrl);

      expect(hasRedemption || hasWelcome || hasVip || hasPayoutBenchmark).toBe(true);
    }
  });
});


const ROTOWIRE_PAYOUT_URL = 'https://www.rotowire.com/betting/casinos/instant-withdrawals';

function benchmarkFixture(slug: string, name: string, fastestSpeed: string, asOf = '2026-11-17'): OperatorFactRecord {
  return {
    slug,
    name,
    status: 'live',
    lastVerifiedAt: '2026-11-18',
    payoutBenchmark: {
      fastestSpeed,
      topMethods: ['Play+'],
      source: 'RotoWire',
      sourceUrl: ROTOWIRE_PAYOUT_URL,
      asOf,
    },
  };
}

describe('payoutSpeedTier', () => {
  it('orders instant, minutes, one hour, hours, 24 hours, business days, unknown', () => {
    expect(payoutSpeedTier('Instant')).toBe(0);
    expect(payoutSpeedTier('>5 Minutes')).toBe(1);
    expect(payoutSpeedTier('Up to 1 hour')).toBe(2);
    expect(payoutSpeedTier('1-4 hours')).toBe(3);
    expect(payoutSpeedTier('Within 24 hours')).toBe(4);
    expect(payoutSpeedTier('Up to 24 hours (sometimes under 1 hour)')).toBe(4);
    expect(payoutSpeedTier('1 business day')).toBe(5);
    expect(payoutSpeedTier('varies')).toBe(6);
  });

  it('stays fast on long hostile input (plain string checks)', () => {
    const input = 'up to '.repeat(20_000) + '!';
    const started = Date.now();
    expect(payoutSpeedTier(input)).toBe(6);
    expect(Date.now() - started).toBeLessThan(500);
  });
});

describe('rankPayoutBenchmarks', () => {
  it('ranks by speed tier, then name, and skips records without a benchmark', () => {
    const records: OperatorFactRecord[] = [
      benchmarkFixture('slow-casino', 'Slow Casino', '1 business day'),
      benchmarkFixture('b-instant', 'B Instant', 'Instant'),
      { slug: 'no-benchmark', name: 'No Benchmark', status: 'live', lastVerifiedAt: '2026-11-18' },
      benchmarkFixture('a-instant', 'A Instant', 'Instant'),
      benchmarkFixture('day-casino', 'Day Casino', 'Within 24 hours'),
    ];
    const ranked = rankPayoutBenchmarks(records, new Date('2026-11-18'));
    expect(ranked.map((entry) => entry.record.slug)).toEqual(['a-instant', 'b-instant', 'day-casino', 'slow-casino']);
    expect(ranked.every((entry) => entry.stale === false)).toBe(true);
  });

  it('flags benchmarks older than the stale window', () => {
    const ranked = rankPayoutBenchmarks([benchmarkFixture('old', 'Old', 'Instant', '2026-01-01')], new Date('2026-11-18'));
    expect(ranked[0]?.stale).toBe(true);
  });
});

describe('getPayoutBenchmarkAnswer', () => {
  const records: OperatorFactRecord[] = [
    benchmarkFixture('bench-casino', 'Bench Casino', 'Instant'),
    { slug: 'plain-casino', name: 'Plain Casino', status: 'live', lastVerifiedAt: '2026-11-18' },
  ];

  it('returns the benchmark for a matched operator', () => {
    const answer = getPayoutBenchmarkAnswer(records, 'Bench Casino', new Date('2026-11-18'));
    expect(answer.kind).toBe('hit');
    if (answer.kind === 'hit') {
      expect(answer.payload.fastestSpeed).toBe('Instant');
      expect(answer.payload.source).toBe('RotoWire');
    }
  });

  it('returns miss when the operator has no benchmark, none when unknown', () => {
    expect(getPayoutBenchmarkAnswer(records, 'plain-casino').kind).toBe('miss');
    expect(getPayoutBenchmarkAnswer(records, 'nowhere-casino').kind).toBe('none');
  });

  it('lists payout_benchmark as an available fact type', () => {
    const answer = listAvailableFactTypesAnswer(records, 'bench-casino', new Date('2026-11-18'));
    expect(answer.kind).toBe('hit');
    if (answer.kind === 'hit') {
      expect(answer.payload).toEqual(['payout_benchmark']);
    }
  });
});

describe('live payout benchmarks (RotoWire)', () => {
  const candidates = [
    join(process.cwd(), 'data/trust-engine/operator-facts.live.json'),
    join(process.cwd(), '../../data/trust-engine/operator-facts.live.json'),
  ];
  const livePath = candidates.find((p) => existsSync(p)) ?? candidates[0];
  const records = loadOperatorFactsFromPath(livePath);
  const withBenchmark = records.filter((record) => record.payoutBenchmark);

  it('has one benchmark per casino on the RotoWire page', () => {
    expect(withBenchmark).toHaveLength(18);
  });

  it('cites only the RotoWire payout page with a dated, labeled figure', () => {
    for (const record of withBenchmark) {
      const benchmark = record.payoutBenchmark!;
      expect(benchmark.source).toBe('RotoWire');
      expect(benchmark.sourceUrl).toBe(ROTOWIRE_PAYOUT_URL);
      expect(benchmark.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(benchmark.fastestSpeed.trim().length).toBeGreaterThan(0);
      expect(benchmark.topMethods.length).toBeGreaterThan(0);
      expect(record.category).toBe('Regulated');
    }
  });

  it('keeps the operator claim separate: benchmark-only records carry no redemptionTime', () => {
    const added = withBenchmark.filter((record) => record.verifiedBy?.startsWith('rotowire-payout-benchmark'));
    expect(added.length).toBeGreaterThan(0);
    for (const record of added) {
      expect(record.redemptionTime).toBeUndefined();
    }
  });

  it('uses the per-casino table figures where they differ from the summary table', () => {
    const bySlug = new Map(records.map((record) => [record.slug, record]));
    expect(bySlug.get('fanduel-casino')?.payoutBenchmark?.fastestSpeed).toBe('Up to 24 hours (sometimes under 1 hour)');
    expect(bySlug.get('caesars-casino')?.payoutBenchmark?.fastestSpeed).toBe('Up to 1 hour');
    expect(bySlug.get('betrivers')?.payoutBenchmark?.fastestSpeed).toBe('Instant');
  });

  it('resolves every benchmark operator by name without ambiguity', () => {
    const live = filterLiveOperatorFacts(records);
    for (const record of withBenchmark) {
      expect(resolveOperatorFacts(live, record.name).map((match) => match.slug)).toEqual([record.slug]);
    }
  });
});
