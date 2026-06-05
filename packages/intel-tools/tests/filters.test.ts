/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import { describe, expect, it } from 'vitest';
import { applyListFilters, parseListFiltersFromText } from '../src/filters.js';
import type { CasinoRecord } from '../src/types.js';

const FIXTURE: CasinoRecord[] = [
  { name: 'Stake.us', grade: 'B-', risk: 'Medium', category: 'Sweeps', slug: 'stake-us', score: 73 },
  { name: 'Stake', grade: 'B', risk: 'Medium', category: 'Crypto', slug: 'stake', score: 78 },
  { name: 'Chumba Casino', grade: 'B+', risk: 'Low', category: 'Sweeps', slug: 'chumba-casino', score: 82 },
  { name: 'Planet 7 Casino', grade: 'F', risk: 'Critical', category: 'Scam', slug: 'planet-7-casino', score: 15 },
];

describe('applyListFilters', () => {
  it('filters US sweeps casinos', () => {
    const result = applyListFilters(FIXTURE, { geo: 'us-sweeps' });
    expect(result.map((casino) => casino.name)).toEqual(['Chumba Casino', 'Stake.us']);
  });

  it('filters US crypto casinos', () => {
    const result = applyListFilters(FIXTURE, { geo: 'us-crypto' });
    expect(result.map((casino) => casino.name)).toEqual(['Stake']);
  });

  it('filters by category', () => {
    const result = applyListFilters(FIXTURE, { category: 'Scam' });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Planet 7 Casino');
  });
});

describe('parseListFiltersFromText', () => {
  it('parses US crypto list intent', () => {
    const filters = parseListFiltersFromText('list of us crypto casinos');
    expect(filters.geo).toBe('us-crypto');
    expect(filters.category).toBe('Crypto');
  });

  it('parses sweeps list intent', () => {
    const filters = parseListFiltersFromText('show me US sweeps casinos');
    expect(filters.geo).toBe('us-sweeps');
    expect(filters.category).toBe('Sweeps');
  });
});
