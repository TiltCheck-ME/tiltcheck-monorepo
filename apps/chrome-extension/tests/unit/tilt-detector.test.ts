/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-24 */
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

describe('TiltDetector - detectRedeemOpportunity', () => {
  it('returns null when balance is below the redeem threshold', () => {
    const detector = new TiltDetector(50, 'moderate', 100);
    // Balance starts at 50, below the 100 threshold.
    expect(detector.detectRedeemOpportunity()).toBeNull();
  });

  it('returns null when no threshold is set', () => {
    const detector = new TiltDetector(200);
    expect(detector.detectRedeemOpportunity()).toBeNull();
  });

  it('returns a recommendation when balance meets the threshold', () => {
    const detector = new TiltDetector(100, 'moderate', 100);
    const result = detector.detectRedeemOpportunity();
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(100);
    expect(result?.threshold).toBe(100);
  });

  it('returns a recommendation when balance exceeds the threshold', () => {
    // balance=110, threshold=100: 10% overshoot -> medium urgency
    const detector = new TiltDetector(110, 'moderate', 100);
    const result = detector.detectRedeemOpportunity();
    expect(result).not.toBeNull();
    expect(result?.urgency).toBe('medium');
  });

  it('escalates urgency when balance exceeds threshold by more than 20%', () => {
    const detector = new TiltDetector(125, 'moderate', 100);
    const result = detector.detectRedeemOpportunity();
    expect(result?.urgency).toBe('high');
  });

  it('returns critical urgency when balance exceeds threshold by more than 50%', () => {
    const detector = new TiltDetector(160, 'moderate', 100);
    const result = detector.detectRedeemOpportunity();
    expect(result?.urgency).toBe('critical');
  });

  it('returns null again after balance drops below threshold via bet', () => {
    const detector = new TiltDetector(105, 'moderate', 100);
    // Confirm nudge initially fires.
    expect(detector.detectRedeemOpportunity()).not.toBeNull();
    // Simulate losing bets until balance drops below threshold.
    detector.recordBet(10, 0);
    // Balance is now 95, below the 100 threshold.
    expect(detector.detectRedeemOpportunity()).toBeNull();
  });

  it('fires again after balance drops below threshold and recovers', () => {
    const detector = new TiltDetector(105, 'moderate', 100);
    // Initially at threshold.
    expect(detector.detectRedeemOpportunity()).not.toBeNull();
    // Drop below threshold.
    detector.recordBet(10, 0); // balance -> 95
    expect(detector.detectRedeemOpportunity()).toBeNull();
    // Recover above threshold via win.
    detector.recordBet(5, 20); // balance -> 110
    expect(detector.detectRedeemOpportunity()).not.toBeNull();
  });

  it('does not fire multiple times at the same balance level', () => {
    // This tests that rapid calls to detectRedeemOpportunity are idempotent.
    // detectRedeemOpportunity is stateless - it computes from current balance every time.
    // The throttle lives in shouldShowRedeemNudge (content.ts), tested separately.
    const detector = new TiltDetector(105, 'moderate', 100);
    const first = detector.detectRedeemOpportunity();
    const second = detector.detectRedeemOpportunity();
    expect(first).toEqual(second);
  });
});
