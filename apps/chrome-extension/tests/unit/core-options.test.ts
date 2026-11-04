/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_RISK_PROFILE,
  DEFAULT_RISK_THRESHOLD,
  DEFAULT_TOUCH_GRASS_COOLDOWN_MS,
  DEFAULT_TOUCH_GRASS_DURATION_MS,
  loadCoreCircuitBreakerOptions,
  TILTCHECK_RISK_PROFILE_KEY,
  TILTCHECK_RISK_THRESHOLD_KEY,
  TILTCHECK_TOUCH_GRASS_OPT_IN_KEY,
} from '../../src/core-options.js';

describe('loadCoreCircuitBreakerOptions', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
        },
      },
    });
  });

  it('returns defaults when storage is empty', async () => {
    const opts = await loadCoreCircuitBreakerOptions();
    expect(opts.riskThreshold).toBe(DEFAULT_RISK_THRESHOLD);
    expect(opts.touchGrassDurationMs).toBe(DEFAULT_TOUCH_GRASS_DURATION_MS);
    expect(opts.touchGrassCooldownMs).toBe(DEFAULT_TOUCH_GRASS_COOLDOWN_MS);
    expect(opts.enforcementEnabled).toBe(true);
    expect(opts.riskProfile).toBe(DEFAULT_RISK_PROFILE);
    expect(opts.hourlyWage).toBe(25);
    expect(opts.realityHudEnabled).toBe(true);
    expect(opts.realityThresholdHours).toBe(2);
    expect(opts.depositBarrierEnabled).toBe(true);
    expect(opts.cooldownActiveUntil).toBe(0);
  });

  it('loads risk profile from tiltcheck_risk_profile with riskLevel fallback', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      [TILTCHECK_RISK_PROFILE_KEY]: 'degen',
      riskLevel: 'conservative',
    });
    const opts = await loadCoreCircuitBreakerOptions();
    expect(opts.riskProfile).toBe('degen');
  });

  it('clamps risk threshold and honors custom duration/cooldown', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      [TILTCHECK_RISK_THRESHOLD_KEY]: 200,
      tiltcheck_touch_grass_duration_ms: 90_000,
      tiltcheck_touch_grass_cooldown_ms: 100_000,
      tiltcheck_hourly_wage: 3500,
      tiltcheck_reality_hud_enabled: false,
      tiltcheck_reality_threshold_hours: 48,
      tiltcheck_deposit_barrier_enabled: false,
      tiltcheck_cooldown_active_until: 1700000000000,
    });
    const opts = await loadCoreCircuitBreakerOptions();
    expect(opts.riskThreshold).toBe(100);
    expect(opts.touchGrassDurationMs).toBe(90_000);
    expect(opts.touchGrassCooldownMs).toBe(100_000);
    expect(opts.hourlyWage).toBe(2000); // clamped to 2000
    expect(opts.realityHudEnabled).toBe(false);
    expect(opts.realityThresholdHours).toBe(24); // clamped to 24
    expect(opts.depositBarrierEnabled).toBe(false);
    expect(opts.cooldownActiveUntil).toBe(1700000000000);
  });

  it('disables enforcement when opt-in is explicitly false', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      [TILTCHECK_TOUCH_GRASS_OPT_IN_KEY]: false,
    });
    const opts = await loadCoreCircuitBreakerOptions();
    expect(opts.enforcementEnabled).toBe(false);
  });
});
