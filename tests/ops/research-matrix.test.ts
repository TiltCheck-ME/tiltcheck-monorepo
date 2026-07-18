/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
import { describe, expect, it } from 'vitest';
import {
  buildMatrix,
  gapsFromMatrix,
  proposedTasksFromGaps,
  scorePage,
} from '../../scripts/ops/lib/research-matrix.mjs';

describe('scorePage', () => {
  it('returns unknown for empty html', () => {
    expect(scorePage('', { trust_scoring: ['safety index', 'trust score'] })).toBe('unknown');
  });

  it('returns yes when a strong keyword appears', () => {
    const html = '<p>Our Safety Index rates every casino.</p>';
    expect(scorePage(html, { trust_scoring: ['safety index'] })).toBe('yes');
  });

  it('returns partial when only some hints match', () => {
    const html = '<p>We publish a safety index for casinos.</p>';
    expect(scorePage(html, ['safety index', 'rating methodology'])).toBe('partial');
  });

  it('returns unknown when keywords are absent', () => {
    const html = '<p>Welcome to our blog about sports.</p>';
    expect(scorePage(html, { trust_scoring: ['safety index', 'trust score'] })).toBe('unknown');
  });
});

describe('buildMatrix', () => {
  it('scores each axis and preserves the row url', () => {
    const matrix = buildMatrix(
      [
        {
          name: 'AskGamblers',
          url: 'https://example.com/askgamblers',
          ok: true,
          html: '<p>Safety Index plus pricing plans.</p>',
        },
      ],
      ['trust_scoring', 'pricing'],
      {
        trust_scoring: ['safety index'],
        pricing: ['pricing plans'],
      },
    );

    expect(matrix.AskGamblers.trust_scoring).toEqual({
      value: 'yes',
      url: 'https://example.com/askgamblers',
    });
    expect(matrix.AskGamblers.pricing).toEqual({
      value: 'yes',
      url: 'https://example.com/askgamblers',
    });
  });
});

describe('gapsFromMatrix + proposedTasksFromGaps', () => {
  it('lists unknown cells and caps proposed tasks at 5', () => {
    const matrix = {
      AskGamblers: {
        trust_scoring: { value: 'unknown', url: 'https://example.com/askgamblers' },
        redeem_vault: { value: 'unknown', url: 'https://example.com/askgamblers' },
      },
      'Casino.guru': {
        trust_scoring: { value: 'yes', url: 'https://casino.guru' },
        pricing: { value: 'unknown', url: 'https://casino.guru/pricing' },
      },
      'Casino.org': {
        ai_link_scan: { value: 'unknown', url: null },
        community_reach: { value: 'unknown', url: 'https://casino.org/about' },
      },
      FairGambling: {
        pricing: { value: 'unknown', url: 'https://fairgambling.org/pricing' },
      },
    };

    const gaps = gapsFromMatrix(matrix);
    expect(gaps.length).toBe(6);

    const tasks = proposedTasksFromGaps(gaps, '2026-07-17', 5);
    expect(tasks.length).toBe(5);
    expect(tasks[0].key.startsWith('RES-2026-07-17-')).toBe(true);
    expect(tasks[0].labels).toContain('RESEARCH');
  });
});
