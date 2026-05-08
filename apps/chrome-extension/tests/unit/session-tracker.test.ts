/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */
import { describe, expect, it } from 'vitest';
import { SessionTracker } from '../../src/v2/core/SessionTracker.ts';
import type { RoundData } from '../../src/v2/core/Sensor.ts';

function round(overrides: Partial<RoundData>): RoundData {
  return {
    bet: 0,
    win: 0,
    balance: 100,
    timestamp: 1_000,
    gameId: 'stake-dice',
    ...overrides,
  };
}

describe('SessionTracker', () => {
  it('starts with a read-only empty snapshot', () => {
    const tracker = new SessionTracker();

    expect(tracker.snapshot()).toEqual(expect.objectContaining({
      updatedAt: null,
      rounds: 0,
      wagered: 0,
      won: 0,
      profitLoss: 0,
      rtp: null,
      tiltScore: 0,
      signalsAvailable: false,
    }));
  });

  it('tracks session stats from available round signals', () => {
    const tracker = new SessionTracker();

    tracker.recordRound(round({ bet: 10, win: 0, balance: 90, timestamp: 1_000 }));
    const snapshot = tracker.recordRound(round({ bet: 5, win: 20, balance: 105, timestamp: 3_500 }));

    expect(snapshot).toEqual(expect.objectContaining({
      updatedAt: 3_500,
      rounds: 2,
      wagered: 15,
      won: 20,
      profitLoss: 5,
      signalsAvailable: true,
      consecutiveLosses: 0,
    }));
    expect(snapshot.rtp).toBeCloseTo(133.3333, 4);
  });

  it('keeps tilt score inside the 0-100 contract while pressure rises', () => {
    const tracker = new SessionTracker();

    tracker.recordRound(round({ bet: 10, win: 0, balance: 90, timestamp: 1_000 }));
    tracker.recordRound(round({ bet: 20, win: 0, balance: 70, timestamp: 2_000 }));
    tracker.recordRound(round({ bet: 40, win: 0, balance: 30, timestamp: 3_000 }));
    const snapshot = tracker.recordRound(round({ bet: 80, win: 0, balance: 0, timestamp: 4_000 }));

    expect(snapshot.tiltScore).toBeGreaterThan(0);
    expect(snapshot.tiltScore).toBeLessThanOrEqual(100);
    expect(snapshot.consecutiveLosses).toBe(4);
  });

  it('ignores negative or non-finite money values in aggregate math', () => {
    const tracker = new SessionTracker();

    const snapshot = tracker.recordRound(round({
      bet: Number.NaN,
      win: -10,
      balance: Number.NaN,
      timestamp: Number.NaN,
    }));

    expect(snapshot).toEqual(expect.objectContaining({
      rounds: 1,
      wagered: 0,
      won: 0,
      profitLoss: 0,
      rtp: null,
      signalsAvailable: true,
    }));
  });
});
