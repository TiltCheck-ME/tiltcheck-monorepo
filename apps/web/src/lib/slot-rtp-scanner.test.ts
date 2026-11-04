/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */

import { describe, expect, it } from 'vitest';
import {
  calculateBleedIncrease,
  calculateExpectedLoss,
  simulateSessionLoss,
  buildBleedComparisons,
  getAllIndexedGames,
  getIndexedProviders,
  findOperatorDeployment,
  getFeaturedOperators,
} from './slot-rtp-scanner';

describe('slot-rtp-scanner calculations', () => {
  it('calculates bleed increase percentage accurately', () => {
    // 96.50% (3.5% edge) vs 94.50% (5.5% edge) -> (5.5 - 3.5)/3.5 = +57.14% -> 57%
    expect(calculateBleedIncrease(96.50, 94.50)).toBe(57);
    // 96.50% (3.5% edge) vs 92.00% (8.0% edge) -> (8.0 - 3.5)/3.5 = +128.57% -> 129%
    expect(calculateBleedIncrease(96.50, 92.00)).toBe(129);
    // Same RTP -> 0%
    expect(calculateBleedIncrease(96.50, 96.50)).toBe(0);
  });

  it('calculates expected loss per wager', () => {
    // $1,000 on 96.50% RTP (3.5% house edge) -> $35.00
    expect(calculateExpectedLoss(1000, 96.50)).toBe(35);
    // $1,000 on 94.50% RTP (5.5% house edge) -> $55.00
    expect(calculateExpectedLoss(1000, 94.50)).toBe(55);
    // $1,000 on 88.00% RTP (12% house edge) -> $120.00
    expect(calculateExpectedLoss(1000, 88.00)).toBe(120);
    // Invalid wagers
    expect(calculateExpectedLoss(0, 96.50)).toBe(0);
    expect(calculateExpectedLoss(-100, 96.50)).toBe(0);
  });

  it('simulates session loss and computes hidden greed tax', () => {
    // 1,000 spins at $2.00 = $2,000 wagered
    // Max RTP 96.50% (3.5% edge) -> $70.00 loss
    // Deployed 94.00% (6.0% edge) -> $120.00 loss
    // Greed Tax = $120.00 - $70.00 = $50.00
    const sim = simulateSessionLoss(2.00, 1000, 96.50, 94.00);
    expect(sim.totalWagered).toBe(2000);
    expect(sim.maxRtpExpectedLoss).toBe(70);
    expect(sim.deployedRtpExpectedLoss).toBe(120);
    expect(sim.greedTaxLoss).toBe(50);
  });

  it('builds bleed comparisons across certified tiers', () => {
    const comparisons = buildBleedComparisons(96.50, [96.50, 94.50, 92.00, 88.13]);
    expect(comparisons).toHaveLength(4);
    expect(comparisons[0]?.bleedIncreasePercent).toBe(0);
    expect(comparisons[0]?.greedTaxPer1000Wagered).toBe(0);
    expect(comparisons[1]?.bleedIncreasePercent).toBe(57);
    expect(comparisons[1]?.greedTaxPer1000Wagered).toBe(20);
    expect(comparisons[2]?.bleedIncreasePercent).toBe(129);
    expect(comparisons[3]?.houseEdge).toBe(11.87);
  });

  it('indexes games and providers from the master dataset', () => {
    const games = getAllIndexedGames();
    expect(games.length).toBeGreaterThanOrEqual(25);
    const olympus = games.find((g) => g.gameSlug === 'gates-of-olympus');
    expect(olympus).toBeDefined();
    expect(olympus?.providerName).toBe('Pragmatic Play');
    expect(olympus?.maxRtp).toBe(96.50);
    expect(olympus?.certifiedTiers).toContain(88.13);

    const providers = getIndexedProviders();
    expect(providers).toContain('Pragmatic Play');
    expect(providers).toContain('Hacksaw Gaming');
    expect(providers).toContain('NoLimit City');
  });

  it('finds operator deployment profiles accurately', () => {
    const stake = findOperatorDeployment('Stake.us');
    expect(stake).not.toBeNull();
    expect(stake?.name).toBe('Stake.us');
    expect(stake?.rtpSlots).toBeTruthy();

    const roobet = findOperatorDeployment('roobet');
    expect(roobet).not.toBeNull();
    expect(roobet?.name).toBe('Roobet');
    expect(roobet?.rtpSlots).toContain('Pragmatic Play');

    const unknown = findOperatorDeployment('NonExistentCasino12345');
    expect(unknown).toBeNull();
  });

  it('provides featured operator list with audited casinos', () => {
    const featured = getFeaturedOperators();
    expect(featured.length).toBeGreaterThanOrEqual(10);
    expect(featured.some((c) => c.name === 'Stake.us')).toBe(true);
    expect(featured.some((c) => c.name === 'Roobet')).toBe(true);
  });
});
