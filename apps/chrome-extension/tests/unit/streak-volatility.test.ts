/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
/**
 * @vitest-environment jsdom
 * Unit tests for Session Win-Streak & Cold-Run Volatility Tracker.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  parseMoney,
  recordSpinOutcome,
  resetStreakVolatility,
  installStreakVolatilityTracker,
  DEFAULT_STREAK_VOLATILITY_STATE,
  DEAD_SPIN_WARN_THRESHOLD,
  DEAD_SPIN_CRITICAL_THRESHOLD,
  WIN_STREAK_ALERT_THRESHOLD,
  type StreakVolatilityState,
} from '../../src/streak-volatility.js';

describe('streak-volatility calculations', () => {
  it('parses currency and numeric text correctly', () => {
    expect(parseMoney('$10.00')).toBe(10);
    expect(parseMoney('1,250.50')).toBe(1250.5);
    expect(parseMoney('0.20')).toBe(0.2);
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney('invalid multiple 10.00 20.00')).toBeNull();
  });

  it('records dead spins and tracks max cold streak', () => {
    let state: StreakVolatilityState = { ...DEFAULT_STREAK_VOLATILITY_STATE };
    const t0 = 1700000000000;

    // First dead spin: balance drops from 100 to 98
    state = recordSpinOutcome(state, 2.0, 100, 98, t0);
    expect(state.currentStreakType).toBe('COLD');
    expect(state.consecutiveDeadSpins).toBe(1);
    expect(state.maxDeadSpins).toBe(1);
    expect(state.consecutiveWins).toBe(0);
    expect(state.totalSpins).toBe(1);
    expect(state.lossCount).toBe(1);
    expect(state.hitRate).toBe(0);
    expect(state.streakAlertLevel).toBe('NORMAL');

    // Run 9 more dead spins (total 10)
    for (let i = 2; i <= 10; i++) {
      state = recordSpinOutcome(state, 2.0, 100 - (i - 1) * 2, 100 - i * 2, t0 + i * 1000);
    }
    expect(state.consecutiveDeadSpins).toBe(10);
    expect(state.maxDeadSpins).toBe(10);
    expect(state.streakAlertLevel).toBe('WARN_COLD');
    expect(state.alertMessage).toContain('Cold Streak: 10 consecutive dead spins');
    expect(state.alertMessage).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);

    // Run 8 more dead spins (total 18) -> CRITICAL_COLD
    for (let i = 11; i <= 18; i++) {
      state = recordSpinOutcome(state, 2.0, 100 - (i - 1) * 2, 100 - i * 2, t0 + i * 1000);
    }
    expect(state.consecutiveDeadSpins).toBe(18);
    expect(state.maxDeadSpins).toBe(18);
    expect(state.streakAlertLevel).toBe('CRITICAL_COLD');
    expect(state.alertMessage).toContain('Extreme Cold Run: 18 dead spins');
  });

  it('records win streaks and heater alerts', () => {
    let state: StreakVolatilityState = { ...DEFAULT_STREAK_VOLATILITY_STATE };
    const t0 = 1700000000000;

    // 4 consecutive wins
    for (let i = 1; i <= 4; i++) {
      state = recordSpinOutcome(state, 1.0, 100 + (i - 1) * 5, 100 + i * 5, t0 + i * 1000);
    }
    expect(state.currentStreakType).toBe('HOT');
    expect(state.consecutiveWins).toBe(4);
    expect(state.maxWinStreak).toBe(4);
    expect(state.consecutiveDeadSpins).toBe(0);
    expect(state.winCount).toBe(4);
    expect(state.hitRate).toBe(100);
    expect(state.streakAlertLevel).toBe('HEATER_ALERT');
    expect(state.alertMessage).toContain('Heater Detected: 4 consecutive wins');
    expect(state.alertMessage).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
  });

  it('detects Gambler\'s Fallacy ("I\'m Due") trap when raising bets during cold streaks', () => {
    let state: StreakVolatilityState = { ...DEFAULT_STREAK_VOLATILITY_STATE };
    const t0 = 1700000000000;

    // 6 dead spins at $1 bet
    for (let i = 1; i <= 6; i++) {
      state = recordSpinOutcome(state, 1.0, 100 - (i - 1), 100 - i, t0 + i * 1000);
    }
    expect(state.consecutiveDeadSpins).toBe(6);
    expect(state.isDueTrapActive).toBe(false);

    // 7th spin: user raises bet from $1.00 to $2.00 (+100% escalation) while cold
    state = recordSpinOutcome(state, 2.0, 94, 92, t0 + 7000);
    expect(state.consecutiveDeadSpins).toBe(7);
    expect(state.isDueTrapActive).toBe(true);
    expect(state.stakeEscalatedDuringCold).toBe(true);
    expect(state.streakAlertLevel).toBe('CRITICAL_COLD');
    expect(state.alertMessage).toContain("Gambler's Fallacy Trap");
    expect(state.alertMessage).toContain('The next spin is NOT "due"');
    expect(state.alertMessage).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);

    // Hit resets due trap
    state = recordSpinOutcome(state, 2.0, 92, 105, t0 + 8000);
    expect(state.isDueTrapActive).toBe(false);
    expect(state.consecutiveWins).toBe(1);
    expect(state.consecutiveDeadSpins).toBe(0);
  });

  it('resets streak volatility cleanly', () => {
    const reset = resetStreakVolatility();
    expect(reset.consecutiveDeadSpins).toBe(0);
    expect(reset.consecutiveWins).toBe(0);
    expect(reset.totalSpins).toBe(0);
    expect(reset.hitRate).toBe(0);
    expect(reset.isDueTrapActive).toBe(false);
    expect(reset.streakAlertLevel).toBe('NORMAL');
    expect(reset.alertMessage).toContain('Fresh volatility session');
    expect(reset.alertMessage).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
  });
});

describe('installStreakVolatilityTracker DOM interactions', () => {
  let doc: Document;

  beforeEach(() => {
    vi.useFakeTimers();
    doc = document.implementation.createHTMLDocument('Casino Test Page');
    doc.body.innerHTML = `
      <div class="user-balance" data-value="100.00">$100.00</div>
      <div class="bet-input" data-value="1.00">$1.00</div>
      <button class="spin-btn" data-test="spin-button">SPIN</button>
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('injects badge into DOM and tracks spins', () => {
    const tracker = installStreakVolatilityTracker(doc);
    const badge = doc.getElementById('tiltcheck-streak-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('VOLATILITY TRACKER ACTIVE');

    // Simulate spin button click
    const spinBtn = doc.querySelector('.spin-btn') as HTMLButtonElement;
    const balanceEl = doc.querySelector('.user-balance')!;

    // Player fires spin
    spinBtn.click();
    // Reel resolves and balance drops from 100 to 99 after spin
    balanceEl.setAttribute('data-value', '99.00');
    balanceEl.textContent = '$99.00';

    // Advance settlement timer (1200ms)
    vi.advanceTimersByTime(1300);

    const state = tracker.getState();
    expect(state.totalSpins).toBe(1);
    expect(state.consecutiveDeadSpins).toBe(1);
    expect(badge?.textContent).toContain('SPINS: 1');

    tracker.stop();
    expect(doc.getElementById('tiltcheck-streak-badge')).toBeNull();
  });

  it('shows and dismisses critical toast intervention', () => {
    const tracker = installStreakVolatilityTracker(doc);
    const spinBtn = doc.querySelector('.spin-btn') as HTMLButtonElement;
    const balanceEl = doc.querySelector('.user-balance')!;

    // Force 18 dead spins to trigger critical toast
    for (let i = 1; i <= DEAD_SPIN_CRITICAL_THRESHOLD; i++) {
      spinBtn.click();
      balanceEl.setAttribute('data-value', (100 - i).toFixed(2));
      balanceEl.textContent = `$${(100 - i).toFixed(2)}`;
      vi.advanceTimersByTime(1300);
    }

    const toast = doc.getElementById('tiltcheck-streak-toast');
    expect(toast).not.toBeNull();
    expect(toast?.textContent).toContain('Extreme Cold Run: 18 dead spins');

    // Dismiss toast
    const dismissBtn = toast?.querySelector('.tiltcheck-streak-toast-dismiss') as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();
    dismissBtn.click();
    expect(doc.getElementById('tiltcheck-streak-toast')).toBeNull();

    tracker.stop();
  });
});
