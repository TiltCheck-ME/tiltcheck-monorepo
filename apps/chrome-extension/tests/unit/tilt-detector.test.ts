/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18 */
import { describe, expect, it } from 'vitest';
import { TiltDetector } from '../../src/tilt-detector.ts';

describe('TiltDetector', () => {
  it('does not count zero-bet zero-payout rounds as losses', () => {
    const detector = new TiltDetector(100);

    detector.recordBet(10, 0);
    detector.recordBet(0, 0);

    expect(detector.getSessionSummary().consecutiveLosses).toBe(0);
  });

  it('treats partial payouts below the wager as losses', () => {
    const detector = new TiltDetector(100);

    detector.recordBet(10, 5);

    expect(detector.getSessionSummary().consecutiveLosses).toBe(1);
  });

  it('preserves unknown starting balances without inventing ROI', () => {
    const detector = new TiltDetector(null);

    detector.recordBet(10, 0);

    expect(detector.getSessionSummary()).toEqual(expect.objectContaining({
      initialBalance: null,
      currentBalance: null,
      netProfit: null,
      roi: null,
    }));
  });
});
