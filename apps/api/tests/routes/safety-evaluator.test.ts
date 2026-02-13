import { describe, expect, it } from 'vitest';
import { evaluateBreathalyzer, evaluateSentiment } from '../../src/lib/safety.js';

describe('safety evaluator', () => {
  it('returns high risk and cooldown for intense betting velocity', () => {
    const result = evaluateBreathalyzer({
      userId: 'user-1',
      eventsInWindow: 30,
      windowMinutes: 10,
      lossAmountWindow: 80,
      streakLosses: 4,
    });

    expect(result.riskTier).toBe('high');
    expect(result.recommendedCooldownMinutes).toBe(15);
    expect(result.requiresCooldown).toBe(true);
  });

  it('returns escalation intervention for severe sentiment', () => {
    const result = evaluateSentiment({
      userId: 'user-2',
      message: 'I LOST EVERYTHING and I cannot stop!!! all in now',
      distressSignals: ['panic'],
    });

    expect(result.severity).toBe('high');
    expect(result.intervention).toBe('escalation');
    expect(result.score).toBeGreaterThanOrEqual(75);
  });
});
