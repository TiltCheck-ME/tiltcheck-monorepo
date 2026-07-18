/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
import { describe, expect, it } from 'vitest';
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
});
