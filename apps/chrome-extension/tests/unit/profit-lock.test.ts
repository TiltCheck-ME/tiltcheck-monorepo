/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computeRatchetFloor,
  DEFAULT_CASHOUT_GOALS,
  DEFAULT_MIN_PROFIT,
  DEFAULT_TRAILING_PERCENT,
  installProfitLock,
  isGoalUnlocked,
  PROFIT_LOCK_MODAL_ID,
  GOAL_TOAST_CONTAINER_ID,
  sanitizeCashoutGoals,
  type CashoutGoal,
} from '../../src/profit-lock.js';

describe('profit-lock calculations and goal evaluation', () => {
  it('computes trailing ratchet floors correctly', () => {
    // Peak <= baseline -> null
    expect(computeRatchetFloor(100, 100, 50, 50)).toBeNull();
    expect(computeRatchetFloor(100, 80, 50, 50)).toBeNull();

    // Profit < minProfit ($50) -> null
    expect(computeRatchetFloor(100, 140, 50, 50)).toBeNull();

    // Baseline $100, Peak $200 (profit $100), trailing 50% -> floor = $100 + $50 = $150
    expect(computeRatchetFloor(100, 200, 50, 50)).toBe(150);

    // Baseline $100, Peak $500 (profit $400), trailing 50% -> floor = $100 + $200 = $300
    expect(computeRatchetFloor(100, 500, 50, 50)).toBe(300);

    // Baseline $100, Peak $500 (profit $400), trailing 75% -> floor = $100 + $300 = $400
    expect(computeRatchetFloor(100, 500, 75, 50)).toBe(400);

    // Baseline $50, Peak $150, minProfit $50 -> profit $100, 25% -> floor = $50 + $25 = $75
    expect(computeRatchetFloor(50, 150, 25, 50)).toBe(75);
  });

  it('evaluates balance vs profit goals correctly', () => {
    const balanceGoal: CashoutGoal = {
      id: 'trash_bags',
      name: 'Trash Bags',
      targetAmount: 15,
      metric: 'balance',
      enabled: true,
    };

    const profitGoal: CashoutGoal = {
      id: 'power_bill',
      name: 'Power Bill',
      targetAmount: 250,
      metric: 'profit',
      enabled: true,
    };

    const disabledGoal: CashoutGoal = {
      id: 'disabled',
      name: 'Disabled',
      targetAmount: 10,
      metric: 'balance',
      enabled: false,
    };

    // Balance goal
    expect(isGoalUnlocked(balanceGoal, 14, 100)).toBe(false);
    expect(isGoalUnlocked(balanceGoal, 15, 100)).toBe(true);
    expect(isGoalUnlocked(balanceGoal, 20, 100)).toBe(true);

    // Profit goal (baseline $100)
    expect(isGoalUnlocked(profitGoal, 300, 100)).toBe(false); // profit $200 < $250
    expect(isGoalUnlocked(profitGoal, 350, 100)).toBe(true);  // profit $250 >= $250
    expect(isGoalUnlocked(profitGoal, 400, 100)).toBe(true);

    // Profit goal with null baseline
    expect(isGoalUnlocked(profitGoal, 500, null)).toBe(false);

    // Disabled goal
    expect(isGoalUnlocked(disabledGoal, 1000, 100)).toBe(false);
  });

  it('sanitizes cashout goals safely from raw storage', () => {
    expect(sanitizeCashoutGoals(null)).toEqual(DEFAULT_CASHOUT_GOALS);
    expect(sanitizeCashoutGoals('not an array')).toEqual(DEFAULT_CASHOUT_GOALS);
    expect(sanitizeCashoutGoals([])).toEqual(DEFAULT_CASHOUT_GOALS);

    const validRaw = [
      { id: 'custom', name: 'Car Payment', targetAmount: 400, metric: 'profit', enabled: true },
      { id: 'sub', name: 'Netflix', targetAmount: 20, metric: 'balance', enabled: false },
    ];
    const sanitized = sanitizeCashoutGoals(validRaw);
    expect(sanitized).toHaveLength(2);
    expect(sanitized[0]?.name).toBe('Car Payment');
    expect(sanitized[0]?.metric).toBe('profit');
    expect(sanitized[1]?.enabled).toBe(false);
  });
});

describe('installProfitLock lifecycle and 2-stage intervention', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('initializes baseline balance and peak on first check', () => {
    const handle = installProfitLock(document);
    handle.check(100);

    expect(handle.getBaseline()).toBe(100);
    expect(handle.getPeak()).toBe(100);
    expect(handle.getFloor()).toBeNull();

    handle.stop();
  });

  it('arms ratchet floor when peak profit threshold is reached', () => {
    const handle = installProfitLock(document, { minProfit: 50, trailingPercent: 50 });
    handle.check(100); // Baseline $100
    handle.check(200); // Peak $200 (+$100 profit) -> floor should be $150

    expect(handle.getBaseline()).toBe(100);
    expect(handle.getPeak()).toBe(200);
    expect(handle.getFloor()).toBe(150);

    handle.stop();
  });

  it('renders Reality Cashout Goal toast when threshold is unlocked', () => {
    const testGoals: CashoutGoal[] = [
      { id: 'coffee', name: 'Fancy Coffee', targetAmount: 8, metric: 'balance', enabled: true },
    ];

    const handle = installProfitLock(document, { goals: testGoals });
    handle.check(5);
    expect(document.querySelector('.tiltcheck-goal-toast')).toBeNull();

    handle.check(10);
    const toast = document.querySelector('.tiltcheck-goal-toast');
    expect(toast).not.toBeNull();
    expect(toast?.textContent).toContain('Fancy Coffee');
    expect(toast?.textContent).toContain('$8.00');

    // Should not re-toast on subsequent check
    handle.check(12);
    expect(document.querySelectorAll('.tiltcheck-goal-toast')).toHaveLength(1);

    handle.stop();
  });

  it('executes Stage 1 Soft Warning when floor is touched', () => {
    const handle = installProfitLock(document, { minProfit: 50, trailingPercent: 50 });
    handle.check(100); // Baseline $100
    handle.check(300); // Peak $300 -> floor $200
    expect(handle.isSoftWarningActive()).toBe(false);

    // Retrace to $195 (below floor $200)
    handle.check(195);
    expect(handle.isSoftWarningActive()).toBe(true);

    const modal = document.getElementById(PROFIT_LOCK_MODAL_ID);
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Ratchet Floor Touched');
    expect(modal?.textContent).toContain('$200.00');
    expect(modal?.textContent).toContain('$300.00');

    // Acknowledge warning
    const ackBtn = modal?.querySelector('#tiltcheck-modal-ack-btn') as HTMLButtonElement | null;
    expect(ackBtn).not.toBeNull();
    ackBtn?.click();

    expect(handle.isSoftWarningActive()).toBe(false);

    handle.stop();
  });

  it('escalates to Stage 2 Hard Guard on unacted spin below floor', async () => {
    const handle = installProfitLock(document, {
      minProfit: 50,
      trailingPercent: 50,
      hardGuardCooldownMs: 60_000,
    });

    handle.check(100);
    handle.check(300); // Floor is $200
    handle.check(195); // Floor touched -> Soft Warning modal

    // Acknowledge soft warning
    const ackBtn = document.getElementById(PROFIT_LOCK_MODAL_ID)?.querySelector('#tiltcheck-modal-ack-btn') as HTMLButtonElement | null;
    ackBtn?.click();

    // Now player tries to spin again or check runs again below floor
    handle.check(190);

    expect(handle.isHardGuardTriggered()).toBe(true);
    // Touch Grass lockdown overlay should be in the DOM
    expect(document.getElementById('tiltcheck-lockdown-root')).not.toBeNull();

    handle.stop();
  });

  it('cleans up DOM and timers on stop()', () => {
    const handle = installProfitLock(document, { minProfit: 50, trailingPercent: 50 });
    handle.check(100);
    handle.check(300);
    handle.check(190);

    expect(document.getElementById(PROFIT_LOCK_MODAL_ID)).not.toBeNull();

    handle.stop();
    expect(document.getElementById(PROFIT_LOCK_MODAL_ID)).toBeNull();
    expect(document.getElementById(GOAL_TOAST_CONTAINER_ID)).toBeNull();
  });
});
