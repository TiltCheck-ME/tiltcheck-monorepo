/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CASHOUT_GOALS_ENABLED,
  DEFAULT_MIN_PROFIT,
  DEFAULT_PROFIT_LOCK_ENABLED,
  DEFAULT_REVERSE_WITHDRAWAL_SHIELD_ENABLED,
  DEFAULT_RISK_PROFILE,
  DEFAULT_RISK_THRESHOLD,
  DEFAULT_TOUCH_GRASS_COOLDOWN_MS,
  DEFAULT_TOUCH_GRASS_DURATION_MS,
  DEFAULT_TRAILING_PERCENT,
  loadCoreCircuitBreakerOptions,
  TILTCHECK_CASHOUT_GOALS_ENABLED_KEY,
  TILTCHECK_PROFIT_LOCK_ENABLED_KEY,
  TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY,
  TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY,
  TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY,
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
    expect(opts.reverseWithdrawalShieldEnabled).toBe(DEFAULT_REVERSE_WITHDRAWAL_SHIELD_ENABLED);
    expect(opts.profitLockEnabled).toBe(DEFAULT_PROFIT_LOCK_ENABLED);
    expect(opts.trailingPercent).toBe(DEFAULT_TRAILING_PERCENT);
    expect(opts.minProfit).toBe(DEFAULT_MIN_PROFIT);
    expect(opts.goalsEnabled).toBe(DEFAULT_CASHOUT_GOALS_ENABLED);
    expect(opts.goals.length).toBeGreaterThan(0);
    expect(opts.bonusConfig).toBeDefined();
    expect(opts.bonusConfig.active).toBe(false);
    expect(opts.cooldownActiveUntil).toBe(0);
    expect(opts.cooldownWallet).toBeNull();
    expect(opts.audioAlertsEnabled).toBe(true);
    expect(opts.audioAlertsVolume).toBe(0.25);
  });

  it('loads risk profile from tiltcheck_risk_profile with riskLevel fallback', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      [TILTCHECK_RISK_PROFILE_KEY]: 'degen',
      riskLevel: 'conservative',
    });
    const opts = await loadCoreCircuitBreakerOptions();
    expect(opts.riskProfile).toBe('degen');
  });

  it('clamps risk threshold and honors custom duration/cooldown and profit lock', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      [TILTCHECK_RISK_THRESHOLD_KEY]: 200,
      tiltcheck_touch_grass_duration_ms: 90_000,
      tiltcheck_touch_grass_cooldown_ms: 100_000,
      tiltcheck_hourly_wage: 3500,
      tiltcheck_reality_hud_enabled: false,
      tiltcheck_reality_threshold_hours: 48,
      tiltcheck_deposit_barrier_enabled: false,
      [TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY]: false,
      [TILTCHECK_PROFIT_LOCK_ENABLED_KEY]: true,
      [TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY]: 75,
      [TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY]: 100,
      [TILTCHECK_CASHOUT_GOALS_ENABLED_KEY]: false,
      tiltcheck_bonus_tracker_config: { active: true, targetWager: 5000, currentWagered: 1500, maxBetLimit: 10, bonusName: 'Reload', blockExceededBets: true },
      tiltcheck_cooldown_active_until: 1700000000000,
      tiltcheck_cooldown_wallet: '7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2',
    });
    const opts = await loadCoreCircuitBreakerOptions();
    expect(opts.riskThreshold).toBe(100);
    expect(opts.touchGrassDurationMs).toBe(90_000);
    expect(opts.touchGrassCooldownMs).toBe(100_000);
    expect(opts.hourlyWage).toBe(2000); // clamped to 2000
    expect(opts.realityHudEnabled).toBe(false);
    expect(opts.realityThresholdHours).toBe(24); // clamped to 24
    expect(opts.depositBarrierEnabled).toBe(false);
    expect(opts.reverseWithdrawalShieldEnabled).toBe(false);
    expect(opts.profitLockEnabled).toBe(true);
    expect(opts.trailingPercent).toBe(75);
    expect(opts.minProfit).toBe(100);
    expect(opts.goalsEnabled).toBe(false);
    expect(opts.bonusConfig.active).toBe(true);
    expect(opts.bonusConfig.targetWager).toBe(5000);
    expect(opts.cooldownActiveUntil).toBe(1700000000000);
    expect(opts.cooldownWallet).toBe('7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2');
  });

  it('disables enforcement when opt-in is explicitly false', async () => {
    (chrome.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      [TILTCHECK_TOUCH_GRASS_OPT_IN_KEY]: false,
    });
    const opts = await loadCoreCircuitBreakerOptions();
    expect(opts.enforcementEnabled).toBe(false);
  });
});
