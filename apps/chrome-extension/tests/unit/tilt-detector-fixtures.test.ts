/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TiltDetector } from '../../src/tilt-detector.ts';

const THRESHOLD = 70;

describe('TiltDetector — composite risk fixtures', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a fast-paced but non-chasing session below the 70 threshold', () => {
    const detector = new TiltDetector(100, 'moderate');

    for (let i = 0; i < 12; i++) {
      detector.recordClick();
      vi.advanceTimersByTime(900);
    }

    expect(detector.getTiltRiskScore()).toBeLessThan(THRESHOLD);
  });

  it('crosses threshold 70 on loss-chasing spiral (compressing clicks + loss streak)', () => {
    const detector = new TiltDetector(100, 'moderate');

    const clickIntervals = [480, 460, 440, 420, 400, 380, 360, 340];
    for (let i = 0; i < clickIntervals.length; i++) {
      detector.recordClick();
      detector.recordBet(10, 0);
      vi.advanceTimersByTime(clickIntervals[i]);
    }

    expect(detector.getSessionSummary().consecutiveLosses).toBeGreaterThanOrEqual(4);
    expect(detector.getLastClickDeltaMs()).not.toBeNull();
    expect(detector.getLastClickDeltaMs()!).toBeLessThan(500);
    expect(detector.getTiltRiskScore()).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it('applies conservative profile multiplier (earlier trigger vs degen)', () => {
    const conservative = new TiltDetector(100, 'conservative');
    const degen = new TiltDetector(100, 'degen');

    const intervals = [450, 430, 410, 390, 370, 350];
    for (const detector of [conservative, degen]) {
      for (const ms of intervals) {
        detector.recordClick();
        detector.recordBet(5, 0);
        vi.advanceTimersByTime(ms);
      }
    }

    expect(conservative.getTiltRiskScore()).toBeGreaterThanOrEqual(degen.getTiltRiskScore());
  });

  it('does not compound loss streak without hot micro-pacing', () => {
    const detector = new TiltDetector(100, 'moderate');

    for (let i = 0; i < 6; i++) {
      detector.recordBet(10, 0);
      vi.advanceTimersByTime(2_500);
    }

    expect(detector.getSessionSummary().consecutiveLosses).toBeGreaterThan(3);
    expect(detector.getTiltRiskScore()).toBeLessThan(THRESHOLD);
  });

  it('conservative profile pushes marginal spiral above 70', () => {
    const detector = new TiltDetector(100, 'conservative');
    const intervals = [490, 470, 450, 430, 410, 390];

    for (const ms of intervals) {
      detector.recordClick();
      detector.recordBet(10, 0);
      vi.advanceTimersByTime(ms);
    }

    expect(detector.getTiltRiskScore()).toBeGreaterThanOrEqual(THRESHOLD);
  });
});
