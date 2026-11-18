/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIntelAgent } from '../src/process-message.js';
import { createIntelTools } from '@tiltcheck/intel-tools';

const fixtures = [
  {
    slug: 'metawin',
    name: 'MetaWin',
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

describe('processMessage operator facts', () => {
  it('refuses VIP answer when currency hint matches no sourced rule', async () => {
    const tools = createIntelTools({
      apiBase: 'http://127.0.0.1:9',
      casinos: [{ name: 'MetaWin', grade: 'B', risk: 'Medium', category: 'Crypto', slug: 'metawin', score: 70 }],
      operatorFacts: fixtures,
    });
    const agent = createIntelAgent({ tools });
    const result = await agent.processMessage({
      message: 'Can you level with SC on MetaWin?',
      context: { isAuthenticated: false },
    });
    const text = result.blocks.filter((b) => b.type === 'text').map((b) => (b as { content: string }).content).join('\n');
    expect(text).toMatch(/No sourced record/i);
    expect(text).not.toMatch(/Gold Coins do not count/i);
    expect(text).not.toMatch(/cannot level with Gold Coins/i);
  });

  it('returns cited hit for VIP question', async () => {
    const tools = createIntelTools({
      apiBase: 'http://127.0.0.1:9',
      casinos: [{ name: 'MetaWin', grade: 'B', risk: 'Medium', category: 'Crypto', slug: 'metawin', score: 70 }],
      operatorFacts: fixtures,
    });
    const agent = createIntelAgent({ tools });
    const result = await agent.processMessage({
      message: 'Can you level with gold coins on MetaWin?',
      context: { isAuthenticated: false },
    });
    const text = result.blocks.filter((b) => b.type === 'text').map((b) => (b as { content: string }).content).join('\n');
    expect(text).toMatch(/do not count|cannot level|canLevel/i);
    expect(text).toMatch(/Source:/i);
    expect(result.blocks.some((b) => b.type === 'cta' && 'href' in b && b.href.includes('/casinos/metawin'))).toBe(true);
  });

  it('refuses when no live fact', async () => {
    const tools = createIntelTools({
      apiBase: 'http://127.0.0.1:9',
      casinos: [{ name: 'MetaWin', grade: 'B', risk: 'Medium', category: 'Crypto', slug: 'metawin', score: 70 }],
      operatorFacts: [],
    });
    const agent = createIntelAgent({ tools });
    const result = await agent.processMessage({
      message: 'How long does MetaWin redemption take?',
      context: { isAuthenticated: false },
    });
    const text = result.blocks.filter((b) => b.type === 'text').map((b) => (b as { content: string }).content).join('\n');
    expect(text).toMatch(/No sourced record/i);
  });

  it('returns cited hit for welcome bonus question with geo', async () => {
    const tools = createIntelTools({
      apiBase: 'http://127.0.0.1:9',
      casinos: [{ name: 'McLuck', grade: 'B', risk: 'Medium', category: 'Sweeps', slug: 'mcluck', score: 72 }],
      operatorFacts: [
        {
          slug: 'mcluck',
          name: 'McLuck',
          status: 'live' as const,
          lastVerifiedAt: '2026-07-01',
          welcomeBonusSummary: {
            summary: 'First purchase match up to 100 SC for US-FL players.',
            sourceUrl: 'https://example.com/welcome',
            asOf: '2026-07-01',
            geoTags: ['US-FL'],
          },
        },
      ],
    });
    const agent = createIntelAgent({ tools });
    const result = await agent.processMessage({
      message: 'What new player bonuses are available on McLuck in Florida?',
      context: { isAuthenticated: false },
    });
    const text = result.blocks.filter((b) => b.type === 'text').map((b) => (b as { content: string }).content).join('\n');
    expect(text).toMatch(/100 SC/i);
    expect(text).toMatch(/Source:/i);
    expect(result.blocks.some((b) => b.type === 'cta' && 'href' in b && b.href.includes('/casinos/mcluck'))).toBe(true);
  });

  it('lists available fact types for vague fact lookup', async () => {
    const tools = createIntelTools({
      apiBase: 'http://127.0.0.1:9',
      casinos: [{ name: 'Stake', grade: 'B', risk: 'Medium', category: 'Crypto', slug: 'stake', score: 78 }],
      operatorFacts: [
        {
          slug: 'stake',
          name: 'Stake',
          status: 'live' as const,
          lastVerifiedAt: '2026-07-01',
          vipCurrencyRules: [
            {
              currencyName: 'GC',
              canLevel: false,
              notes: 'GC does not count toward VIP level.',
              sourceUrl: 'https://example.com/stake-vip',
              asOf: '2026-07-01',
            },
          ],
          redemptionTime: {
            claim: 'Redemptions typically clear within 24-48 hours.',
            sourceUrl: 'https://example.com/stake-redemption',
            asOf: '2026-07-01',
            minHours: 24,
            maxHours: 48,
          },
        },
      ],
    });
    const agent = createIntelAgent({ tools });
    const result = await agent.processMessage({
      message: 'what is the VIP deal on Stake',
      context: { isAuthenticated: false },
    });
    const text = result.blocks.filter((b) => b.type === 'text').map((b) => (b as { content: string }).content).join('\n');
    expect(text).toMatch(/Available sourced facts/i);
    expect(text).toMatch(/vip/i);
    expect(text).toMatch(/redemption/i);
  });

  describe('payout benchmarks (RotoWire)', () => {
    const ROTOWIRE_URL = 'https://www.rotowire.com/betting/casinos/instant-withdrawals';
    const benchmarkFacts = [
      {
        slug: 'betrivers',
        name: 'BetRivers',
        aliases: ['BetRivers Casino'],
        category: 'Regulated',
        status: 'live' as const,
        lastVerifiedAt: '2026-11-04',
        redemptionTime: {
          claim: 'RushPay approves most withdrawals instantly; ACH clears within 1-24 hours.',
          sourceUrl: 'https://www.betrivers.com',
          asOf: '2026-11-04',
          minHours: 1,
          maxHours: 24,
        },
        payoutBenchmark: {
          fastestSpeed: 'Instant',
          topMethods: ['Play+'],
          source: 'RotoWire' as const,
          sourceUrl: ROTOWIRE_URL,
          asOf: '2026-11-17',
          note: 'PayPal and Venmo usually under 30 minutes.',
        },
      },
      {
        slug: 'hollywood-casino',
        name: 'Hollywood Casino',
        aliases: ['Hollywood'],
        category: 'Regulated',
        status: 'live' as const,
        lastVerifiedAt: '2026-11-18',
        payoutBenchmark: {
          fastestSpeed: 'Instant',
          topMethods: ['Debit Card', 'PayPal'],
          source: 'RotoWire' as const,
          sourceUrl: ROTOWIRE_URL,
          asOf: '2026-11-17',
        },
      },
      {
        slug: 'draftkings-casino',
        name: 'DraftKings Casino',
        category: 'Regulated',
        status: 'live' as const,
        lastVerifiedAt: '2026-11-04',
        payoutBenchmark: {
          fastestSpeed: '1 business day',
          topMethods: ['Debit Card'],
          source: 'RotoWire' as const,
          sourceUrl: ROTOWIRE_URL,
          asOf: '2026-11-17',
        },
      },
      {
        slug: 'chumba-casino',
        name: 'Chumba Casino',
        category: 'Sweeps',
        status: 'live' as const,
        lastVerifiedAt: '2026-11-04',
        redemptionTime: {
          claim: 'Standard EFT redemptions take 24-72 hours to approve.',
          sourceUrl: 'https://www.chumbacasino.com/terms-and-conditions',
          asOf: '2026-11-04',
        },
      },
    ];

    function agentWith(now = new Date('2026-11-18T12:00:00Z')) {
      vi.useFakeTimers();
      vi.setSystemTime(now);
      const tools = createIntelTools({ apiBase: 'http://127.0.0.1:9', casinos: [], operatorFacts: benchmarkFacts });
      return createIntelAgent({ tools });
    }

    function textOf(blocks: Array<{ type: string }>): string[] {
      return blocks.filter((b) => b.type === 'text').map((b) => (b as { content: string }).content);
    }

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows the operator claim, then the independent RotoWire line with its source', async () => {
      const result = await agentWith().processMessage({
        message: 'how long does BetRivers take to cash out',
        context: { isAuthenticated: false },
      });
      const lines = textOf(result.blocks);
      const claimIdx = lines.findIndex((line) => line.startsWith('RushPay'));
      const benchIdx = lines.indexOf('Independent check (RotoWire, Nov 17 2026): Instant via Play+.');
      expect(claimIdx).toBe(0);
      expect(benchIdx).toBeGreaterThan(claimIdx);
      expect(lines).toContain('Source: https://www.betrivers.com · As of 2026-11-04');
      expect(lines).toContain(`Source: RotoWire · ${ROTOWIRE_URL} · As of 2026-11-17`);
      expect(lines).toContain('PayPal and Venmo usually under 30 minutes.');
      expect(lines.join('\n')).toMatch(/verified account/);
      expect(lines.join('\n')).not.toMatch(/Stale/);
      expect(result.blocks.some((b) => b.type === 'cta' && 'href' in b && b.href === '/casinos/betrivers')).toBe(true);
      expect(result.shareEligible).toBe(true);
    });

    it('answers from the benchmark alone and labels it third-party when no operator claim exists', async () => {
      const result = await agentWith().processMessage({
        message: 'How long does Hollywood Casino take to cash out?',
        context: { isAuthenticated: false },
      });
      const text = textOf(result.blocks).join('\n');
      expect(text).toMatch(/No operator-sourced redemption terms on file for Hollywood Casino/);
      expect(text).toMatch(/third-party/);
      expect(text).toMatch(/Independent check \(RotoWire, Nov 17 2026\): Instant via Debit Card, PayPal\./);
      expect(text).not.toMatch(/No sourced record/);
      expect(result.blocks.some((b) => b.type === 'cta')).toBe(false);
    });

    it('keeps the plain operator answer when there is no benchmark', async () => {
      const result = await agentWith().processMessage({
        message: 'How long does Chumba Casino redemption take?',
        context: { isAuthenticated: false },
      });
      const text = textOf(result.blocks).join('\n');
      expect(text).toMatch(/24-72 hours/);
      expect(text).not.toMatch(/Independent check/);
    });

    it('marks a stale benchmark', async () => {
      const result = await agentWith(new Date('2027-06-01T12:00:00Z')).processMessage({
        message: 'How long does Hollywood Casino take to cash out?',
        context: { isAuthenticated: false },
      });
      expect(textOf(result.blocks)).toContain('Stale — verify on source');
    });

    it('ranks fastest payout casinos from benchmark data, labeled as RotoWire, with as-of date and source', async () => {
      const result = await agentWith().processMessage({
        message: 'fastest payout casinos',
        context: { isAuthenticated: false },
      });
      const lines = textOf(result.blocks);
      expect(lines[0]).toMatch(/regulated real-money casinos, ranked from RotoWire's data \(as of Nov 17 2026\)/);
      expect(lines[0]).toMatch(/Third-party figures/);
      expect(lines.join('\n')).toMatch(/CT, DE, MI, NJ, PA, RI, WV/);
      const ranked = lines.filter((line) => /^\d{1,2}\. /.test(line));
      expect(ranked).toEqual([
        '1. BetRivers — Instant via Play+',
        '2. Hollywood Casino — Instant via Debit Card, PayPal',
        '3. DraftKings Casino — 1 business day via Debit Card',
      ]);
      expect(lines).toContain(`Source: RotoWire · ${ROTOWIRE_URL} · As of 2026-11-17`);
      expect(lines.join('\n')).not.toMatch(/Chumba/);
      expect(lines.join('\n')).not.toMatch(/promo|bonus code|sign up/i);
      expect(result.blocks.some((b) => b.type === 'cta')).toBe(false);
    });

    it('refuses to rank when no benchmarks are on file', async () => {
      const tools = createIntelTools({ apiBase: 'http://127.0.0.1:9', casinos: [], operatorFacts: [] });
      const result = await createIntelAgent({ tools }).processMessage({
        message: 'which casinos pay out instantly',
        context: { isAuthenticated: false },
      });
      expect(textOf(result.blocks).join('\n')).toMatch(/No sourced payout-speed benchmarks/);
      expect(result.shareEligible).toBe(false);
    });
  });
});

describe('processMessage named operator payout question', () => {
  it('answers "Does DraftKings pay out instantly?" with DraftKings facts, not the ranking', async () => {
    const tools = createIntelTools({
      apiBase: 'http://127.0.0.1:9',
      casinos: [],
      operatorFacts: [
        {
          slug: 'draftkings-casino',
          name: 'DraftKings Casino',
          aliases: ['DraftKings'],
          status: 'live' as const,
          lastVerifiedAt: '2026-11-18',
          redemptionTime: {
            claim: 'ACH and debit withdrawals approve and process within 1-24 hours.',
            sourceUrl: 'https://casino.draftkings.com',
            asOf: '2026-11-04',
          },
        },
        {
          slug: 'betrivers',
          name: 'BetRivers',
          status: 'live' as const,
          lastVerifiedAt: '2026-11-18',
          payoutBenchmark: {
            fastestSpeed: 'Instant',
            topMethods: ['Play+'],
            source: 'RotoWire' as const,
            sourceUrl: 'https://www.rotowire.com/betting/casinos/instant-withdrawals',
            asOf: '2026-11-17',
          },
        },
      ],
    });
    const agent = createIntelAgent({ tools });
    const result = await agent.processMessage({
      message: 'Does DraftKings pay out instantly?',
      context: { isAuthenticated: false },
    });
    const text = result.blocks.filter((b) => b.type === 'text').map((b) => (b as { content: string }).content).join('\n');
    expect(text).toMatch(/1-24 hours/);
    expect(text).not.toMatch(/ranked from RotoWire/i);
  });
});
