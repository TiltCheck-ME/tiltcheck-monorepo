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
    const { saveHourlyWage, saveRealityHudEnabled, saveDepositBarrierEnabled, saveReverseWithdrawalShieldEnabled } = await import('../../src/popup-settings.js');
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
  });
});
