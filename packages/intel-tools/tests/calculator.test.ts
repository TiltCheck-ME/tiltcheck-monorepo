/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

import { describe, expect, it } from 'vitest';
import {
  calculateCasinoTrust,
  gradeFromScore,
  riskFromScore,
} from '../src/calculator.js';

describe('calculateCasinoTrust', () => {
  it('correctly maps scores to letter grades', () => {
    expect(gradeFromScore(96)).toBe('A+');
    expect(gradeFromScore(91)).toBe('A');
    expect(gradeFromScore(86)).toBe('A-');
    expect(gradeFromScore(81)).toBe('B+');
    expect(gradeFromScore(77)).toBe('B');
    expect(gradeFromScore(72)).toBe('B-');
    expect(gradeFromScore(66)).toBe('C+');
    expect(gradeFromScore(61)).toBe('C');
    expect(gradeFromScore(55)).toBe('C-');
    expect(gradeFromScore(47)).toBe('D+');
    expect(gradeFromScore(38)).toBe('D');
    expect(gradeFromScore(25)).toBe('F');
  });

  it('correctly maps scores to risk categories', () => {
    expect(riskFromScore(90)).toBe('Low');
    expect(riskFromScore(85)).toBe('Low');
    expect(riskFromScore(78)).toBe('Medium');
    expect(riskFromScore(62)).toBe('Medium-High');
    expect(riskFromScore(42)).toBe('High');
    expect(riskFromScore(20)).toBe('Critical');
    expect(riskFromScore(80, 'Scam')).toBe('Critical');
  });

  it('calculates deterministic score and pillars for Tier 1 Regulated operator', () => {
    const calculation = calculateCasinoTrust({
      name: 'DraftKings Casino',
      category: 'Regulated',
      license: 'NJ DGE / PA PGCB / MI MGCB / WV LCB',
      playthrough: '1x playthrough on cash wagers',
    });

    expect(calculation.score).toBeGreaterThanOrEqual(90);
    expect(calculation.grade).toBe('A');
    expect(calculation.risk).toBe('Low');
    expect(calculation.pillars.financialPayouts).toBe(98);
    expect(calculation.pillars.fairnessTransparency).toBe(92);
    expect(calculation.pillars.operationalSupport).toBe(90);
    expect(calculation.breakdown.financialPayouts.weight).toBe(0.40);
    expect(calculation.breakdown.fairnessTransparency.weight).toBe(0.25);
  });

  it('calculates deterministic score for Shuffle with unnerfed RTP and instant withdrawals', () => {
    const calculation = calculateCasinoTrust({
      name: 'Shuffle',
      category: 'Crypto',
      audited: true,
      license: 'Curaçao eGaming (Natural Nine B.V., License 8048/JAZ)',
      rtpOriginals: 'Shuffle Originals 99.00% RTP HMAC-SHA256 provably fair',
      rtpSlots: 'Pragmatic Play, Hacksaw at standard manufacturer maximums (96.50% tier)',
      vaultSupport: 'TiltCheck DOM-based vault adapter',
      playthrough: '1x deposit turnover required before fee-free crypto withdrawal. Sub-1-hour instant automated release.',
      evidence: [
        'Instant automated crypto withdrawals across BTC, ETH, SOL, LTC, and USDT with sub-1-hour confirmation.',
        'Provably fair seed transparency with HMAC-SHA256.',
        'Zero reported non-payment disputes in crypto community.',
      ],
    });

    expect(calculation.score).toBeGreaterThanOrEqual(84);
    expect(['A-', 'B+']).toContain(calculation.grade);
    expect(calculation.pillars.financialPayouts).toBeGreaterThanOrEqual(88);
    expect(calculation.pillars.fairnessTransparency).toBeGreaterThanOrEqual(85);
    expect(calculation.pillars.communityReputation).toBeGreaterThanOrEqual(84);
  });

  it('penalizes predatory bonus rollover and slot downgrades on BC.Game', () => {
    const calculation = calculateCasinoTrust({
      name: 'BC.Game',
      category: 'Crypto',
      audited: true,
      license: 'Curaçao eGaming (BlockDance B.V., CIL #5536/JAZ; sub-license disputes)',
      rtpOriginals: 'BC Originals 99.00% RTP provably fair',
      rtpSlots: 'Extensive deployment of lower RTP tiers (92% and 94% tiers common)',
      vaultSupport: 'TiltCheck DOM-based vault adapter',
      playthrough: 'Locked reward requires ~500x wager turnover (unlocks at 0.2% per wager).',
      evidence: [
        'Predatory reward unlocking: Advertised matches delivered in locked BCD requiring 500x wager turnover.',
        'Community withdrawal disputes: Frequent reports of delayed cashouts and verification loops.',
      ],
    });

    expect(calculation.pillars.promotionalHonesty).toBeLessThanOrEqual(45);
    expect(calculation.pillars.financialPayouts).toBeLessThanOrEqual(65);
    expect(calculation.score).toBeLessThanOrEqual(65);
    expect(calculation.risk).toBe('Medium-High');
  });

  it('assigns critical risk and F grade to blacklisted scam casinos', () => {
    const calculation = calculateCasinoTrust({
      name: 'Planet 7 Casino',
      category: 'Scam',
      violations: ['Blacklisted — chronic non-payment and predatory bonus terms'],
    });

    expect(calculation.score).toBe(10);
    expect(calculation.grade).toBe('F');
    expect(calculation.risk).toBe('Critical');
    expect(calculation.pillars.financialPayouts).toBe(10);
    expect(calculation.pillars.fairnessTransparency).toBe(10);
  });

  it('maintains mathematical consistency: sum of weighted pillar scores equals overall score', () => {
    const sample = calculateCasinoTrust({
      name: 'Chumba Casino',
      category: 'Sweeps',
      audited: true,
      license: 'US Sweepstakes model (AMOE compliant). VGW Holdings Limited',
      rtpOriginals: 'Blackjack 99.50% RTP. Certified RNG by GLI.',
      rtpSlots: 'Proprietary VGW software 95.00%-96.00% certified',
      playthrough: '1x playthrough required on Sweeps Coins (SC) before redemption.',
      redemptionMinHours: 24,
      redemptionMaxHours: 72,
    });

    const sumWeighted = Math.round(
      sample.pillars.financialPayouts * 0.40 +
      sample.pillars.fairnessTransparency * 0.25 +
      sample.pillars.promotionalHonesty * 0.15 +
      sample.pillars.operationalSupport * 0.10 +
      sample.pillars.communityReputation * 0.10
    );

    expect(sample.score).toBe(sumWeighted);
  });
});
