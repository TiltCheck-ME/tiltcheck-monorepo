/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
import { describe, expect, it } from 'vitest';
import {
  addCustomSlug,
  clampDurationMs,
  clampRisk,
  formatDurationLabel,
  riskLabel,
  toggleCategoryInList,
  toggleSlugInList,
} from '../../src/popup-settings.js';

describe('popup-settings helpers', () => {
  it('clamps risk and duration', () => {
    expect(clampRisk(40)).toBe(50);
    expect(clampRisk(120)).toBe(100);
    expect(clampDurationMs(10_000)).toBe(30_000);
    expect(clampDurationMs(999_999)).toBe(300_000);
  });

  it('toggles slugs with normalization', () => {
    const first = toggleSlugInList([], 'Plinko');
    expect(first).toEqual(['plinko']);
    const second = toggleSlugInList(first, 'plinko');
    expect(second).toEqual([]);
  });

  it('toggles categories from user config only', () => {
    expect(toggleCategoryInList([], 'chicken_mines')).toEqual(['chicken_mines']);
    expect(toggleCategoryInList(['chicken_mines'], 'chicken_mines')).toEqual([]);
    expect(toggleCategoryInList([], 'not-a-category')).toEqual([]);
  });

  it('adds custom slugs safely', () => {
    expect(addCustomSlug(['mines'], '  Keno  ')).toEqual(['mines', 'keno']);
    expect(addCustomSlug(['mines'], '!!!')).toEqual(['mines']);
  });

  it('formats labels', () => {
    expect(formatDurationLabel(90_000)).toBe('1m 30s');
    expect(riskLabel(55)).toBe('Strict');
  });

  it('saves hourly wage, reality hud, and deposit barrier settings', async () => {
    const storage: Record<string, unknown> = {};
    const {
      saveHourlyWage,
      saveRealityHudEnabled,
      saveDepositBarrierEnabled,
      saveReverseWithdrawalShieldEnabled,
      saveProfitLockEnabled,
      saveProfitLockTrailingPercent,
      saveCashoutGoalsEnabled,
      saveCashoutGoals,
      toggleGoalInList,
      addGoalToList,
      removeGoalFromList,
      saveBonusTrackerConfig,
      calculateTargetWager,
      calculateBonusProgress,
      saveAudioAlertsEnabled,
      saveAudioAlertsVolume,
    } = await import('../../src/popup-settings.js');
    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        local: {
          set: (data: Record<string, unknown>) => {
            Object.assign(storage, data);
            return Promise.resolve();
          },
        },
      },
    };

    await saveHourlyWage(45);
    expect(storage['tiltcheck_hourly_wage']).toBe(45);

    const clampedMax = await saveHourlyWage(3000);
    expect(clampedMax).toBe(2000);
    expect(storage['tiltcheck_hourly_wage']).toBe(2000);

    const clampedMin = await saveHourlyWage(1);
    expect(clampedMin).toBe(5);
    expect(storage['tiltcheck_hourly_wage']).toBe(5);

    const clampedNaN = await saveHourlyWage(NaN);
    expect(clampedNaN).toBe(25);
    expect(storage['tiltcheck_hourly_wage']).toBe(25);

    await saveRealityHudEnabled(false);
    expect(storage['tiltcheck_reality_hud_enabled']).toBe(false);

    await saveDepositBarrierEnabled(false);
    expect(storage['tiltcheck_deposit_barrier_enabled']).toBe(false);

    await saveReverseWithdrawalShieldEnabled(false);
    expect(storage['tiltcheck_reverse_withdrawal_shield_enabled']).toBe(false);

    await saveProfitLockEnabled(true);
    expect(storage['tiltcheck_profit_lock_enabled']).toBe(true);

    await saveProfitLockTrailingPercent(75);
    expect(storage['tiltcheck_profit_lock_trailing_percent']).toBe(75);

    await saveCashoutGoalsEnabled(true);
    expect(storage['tiltcheck_cashout_goals_enabled']).toBe(true);

    const testGoals = [
      { id: 'electric', name: 'Electric Bill', targetAmount: 200, linkUrl: '', metric: 'balance' as const, enabled: true },
    ];
    await saveCashoutGoals(testGoals);
    expect(storage['tiltcheck_cashout_goals']).toEqual(testGoals);

    const toggled = toggleGoalInList(testGoals, 'electric');
    expect(toggled[0]?.enabled).toBe(false);

    const added = addGoalToList(testGoals, { id: 'water', name: 'Water', targetAmount: 50, metric: 'profit' as const, enabled: true });
    expect(added).toHaveLength(2);

    const removed = removeGoalFromList(added, 'electric');
    expect(removed).toHaveLength(1);
    expect(removed[0]?.id).toBe('water');

    const bonusCfg = {
      active: true,
      bonusName: 'Match Bonus',
      targetWager: 3500,
      currentWagered: 500,
      maxBetLimit: 5,
      blockExceededBets: true,
    };
    await saveBonusTrackerConfig(bonusCfg);
    expect(storage['tiltcheck_bonus_tracker_config']).toEqual(bonusCfg);

    expect(calculateTargetWager(100, 100, 35)).toBe(7000);
    expect(calculateBonusProgress(500, 1000).percent).toBe(50);

    await saveAudioAlertsEnabled(true);
    expect(storage['tiltcheck_audio_alerts_enabled']).toBe(true);

    await saveAudioAlertsVolume(0.5);
    expect(storage['tiltcheck_audio_alerts_volume']).toBe(0.5);

    await saveAudioAlertsVolume(1.5);
    expect(storage['tiltcheck_audio_alerts_volume']).toBe(1);

    await saveAudioAlertsVolume(-0.2);
    expect(storage['tiltcheck_audio_alerts_volume']).toBe(0);
  });
});
