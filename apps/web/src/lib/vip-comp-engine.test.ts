// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04

import { describe, expect, it } from 'vitest';
import {
  calculateRtpDelta,
  calculateVipCompCost,
  CASINO_VIP_PROGRAMS,
  GAME_HOUSE_EDGE_PRESETS,
} from './vip-comp-engine';

describe('VIP Comp Point & House Edge Engine (vip-comp-engine.ts)', () => {
  it('correctly calculates Stake Bronze VIP milestone metrics on standard slots', () => {
    // Stake Bronze: 0 to $10,000 wager, $15 bonus, 3.5% house edge on 96.5% slots
    const result = calculateVipCompCost({
      currentWager: 0,
      targetWager: 10000,
      expectedReward: 15,
      houseEdgePercent: 3.5,
      betSize: 2.0,
      gameWeightingPercent: 100,
    });

    expect(result.wagerRemainingNominal).toBe(10000);
    expect(result.effectiveWagerNeeded).toBe(10000);
    expect(result.expectedLoss).toBe(350); // $10,000 * 0.035
    expect(result.expectedReward).toBe(15);
    expect(result.netDeficit).toBe(335); // $350 - $15
    expect(result.compRewardRatioPercent).toBeCloseTo(4.2857, 2); // 15 / 350 = 4.29%
    expect(result.houseRetainedPercent).toBeCloseTo(95.714, 2);
    expect(result.spinsOrRoundsNeeded).toBe(5000); // 10,000 / 2.0
    expect(result.churnSeverity).toBe('predatory');
  });

  it('correctly calculates Stake Gold to Platinum I step on downgraded slots', () => {
    // Gold ($100k) to Platinum I ($250k) = $150k incremental turnover, $220 bonus, 6.0% downgraded slot edge
    const result = calculateVipCompCost({
      currentWager: 100000,
      targetWager: 250000,
      expectedReward: 220,
      houseEdgePercent: 6.0,
      betSize: 5.0,
      gameWeightingPercent: 100,
    });

    expect(result.wagerRemainingNominal).toBe(150000);
    expect(result.effectiveWagerNeeded).toBe(150000);
    expect(result.expectedLoss).toBe(9000); // $150,000 * 0.06
    expect(result.expectedReward).toBe(220);
    expect(result.netDeficit).toBe(8780); // $9,000 - $220
    expect(result.compRewardRatioPercent).toBeCloseTo(2.444, 2); // 220 / 9000 = 2.44%
    expect(result.churnSeverity).toBe('extreme');
  });

  it('accounts for throttled game contribution rates (e.g. blackjack 20%)', () => {
    // $10,000 nominal remaining at 20% weighting requires $50,000 actual turnover
    const result = calculateVipCompCost({
      currentWager: 0,
      targetWager: 10000,
      expectedReward: 50,
      houseEdgePercent: 0.5,
      betSize: 25,
      gameWeightingPercent: 20,
    });

    expect(result.wagerRemainingNominal).toBe(10000);
    expect(result.effectiveWagerNeeded).toBe(50000);
    expect(result.expectedLoss).toBe(250); // $50,000 * 0.005
    expect(result.netDeficit).toBe(200);
    expect(result.compRewardRatioPercent).toBe(20);
  });

  it('handles edge case when target wager is already achieved', () => {
    const result = calculateVipCompCost({
      currentWager: 50000,
      targetWager: 50000,
      expectedReward: 100,
      houseEdgePercent: 3.5,
      betSize: 1,
    });

    expect(result.wagerRemainingNominal).toBe(0);
    expect(result.effectiveWagerNeeded).toBe(0);
    expect(result.expectedLoss).toBe(0);
    expect(result.netDeficit).toBe(0);
    expect(result.spinsOrRoundsNeeded).toBe(0);
  });

  it('correctly calculates RTP delta and greed premium for slot sessions', () => {
    // 96.5% certified vs 91.5% observed on $2,000 wagered with 600 spins
    const deltaRes = calculateRtpDelta(96.5, 91.5, 2000, 600);

    expect(deltaRes.delta).toBe(5.0);
    expect(deltaRes.greedPremiumPer100).toBe(5.0);
    expect(deltaRes.totalOvercharge).toBe(100); // 5% of $2,000
    expect(deltaRes.confidence.tier).toBe('solid');
    expect(deltaRes.confidence.label).toContain('SOLID');
  });

  it('verifies all casino VIP programs have valid monotonic tiers', () => {
    expect(CASINO_VIP_PROGRAMS.length).toBeGreaterThanOrEqual(4);

    for (const prog of CASINO_VIP_PROGRAMS) {
      expect(prog.casinoName).toBeTruthy();
      expect(prog.tiers.length).toBeGreaterThanOrEqual(3);

      let prevWager = 0;
      for (const tier of prog.tiers) {
        expect(tier.cumulativeWagerRequired).toBeGreaterThan(prevWager);
        expect(tier.baseRewardValue).toBeGreaterThan(0);
        expect(tier.tierName).toBeTruthy();
        prevWager = tier.cumulativeWagerRequired;
      }
    }
  });

  it('verifies all game house edge presets have valid non-negative edges', () => {
    expect(GAME_HOUSE_EDGE_PRESETS.length).toBeGreaterThanOrEqual(6);

    for (const g of GAME_HOUSE_EDGE_PRESETS) {
      expect(g.houseEdgePercent).toBeGreaterThan(0);
      expect(g.rtpPercent).toBeGreaterThan(0);
      expect(g.rtpPercent + g.houseEdgePercent).toBeCloseTo(100, 1);
      expect(g.defaultWeightingPercent).toBeGreaterThan(0);
      expect(g.defaultWeightingPercent).toBeLessThanOrEqual(100);
    }
  });

  it('upholds TiltCheck brand law with zero emojis across all strings and outputs', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    for (const prog of CASINO_VIP_PROGRAMS) {
      expect(emojiRegex.test(prog.casinoName)).toBe(false);
      expect(emojiRegex.test(prog.notes)).toBe(false);
      for (const t of prog.tiers) {
        expect(emojiRegex.test(t.tierName)).toBe(false);
        expect(emojiRegex.test(t.description)).toBe(false);
      }
    }

    for (const g of GAME_HOUSE_EDGE_PRESETS) {
      expect(emojiRegex.test(g.name)).toBe(false);
      expect(emojiRegex.test(g.description)).toBe(false);
    }

    const testRun = calculateVipCompCost({
      currentWager: 1000,
      targetWager: 10000,
      expectedReward: 20,
      houseEdgePercent: 3.5,
      betSize: 1,
    });
    expect(emojiRegex.test(testRun.headlineVerdict)).toBe(false);
    expect(emojiRegex.test(testRun.auditTakeaway)).toBe(false);
  });
});
