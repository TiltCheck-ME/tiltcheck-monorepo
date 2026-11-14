/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/touch-grass-timeout.js', () => ({
  triggerTouchGrassTimeout: vi.fn(),
}));
vi.mock('../../src/cashout-router.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/cashout-router.js')>();
  return { ...actual, triggerCashoutNavigation: vi.fn() };
});

import {
  CASHOUT_MINIMUMS,
  evaluateCashoutGate,
  findCashoutMinimum,
  formatCashoutAmount,
  getCashoutGateCopy,
  shouldOfferCashier,
} from '../../src/cashout-minimums.js';
import { CASINO_CASHOUT_ROUTES, triggerCashoutNavigation } from '../../src/cashout-router.js';
import { triggerTouchGrassTimeout } from '../../src/touch-grass-timeout.js';
import {
  BELOW_MINIMUM_BREAK_REASON,
  GOAL_TOAST_CONTAINER_ID,
  PROFIT_LOCK_MODAL_ID,
  hardBrakeClosingLine,
  installProfitLock,
  showSoftWarningModal,
  type CashoutGoal,
} from '../../src/profit-lock.js';
import { showBonusCompleteModal } from '../../src/bonus-tracker.js';

const BANNED_NUDGES = /deposit|buy (more )?coins|top ?up|reload|keep playing|play on to|spin (a few )?more|almost there|so close/i;

describe('cashout minimums table', () => {
  it('has an entry for every supported cashout route', () => {
    for (const route of CASINO_CASHOUT_ROUTES) {
      expect(CASHOUT_MINIMUMS.find((m) => m.siteId === route.id), route.id).toBeDefined();
    }
  });

  it('only carries a number when it carries an https source and a check date', () => {
    for (const entry of CASHOUT_MINIMUMS) {
      expect(entry.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (entry.minAmount === null) {
        expect(entry.unit).toBeNull();
        expect(entry.sourceUrl).toBeNull();
      } else {
        expect(entry.minAmount).toBeGreaterThan(0);
        expect(entry.unit).not.toBeNull();
        expect(entry.sourceUrl).toMatch(/^https:\/\//);
      }
    }
  });

  it('matches hosts and subdomains without loose substring hits', () => {
    expect(findCashoutMinimum('www.chumbacasino.com')?.siteId).toBe('chumba');
    expect(findCashoutMinimum('lobby.chumbacasino.com')?.siteId).toBe('chumba');
    expect(findCashoutMinimum('play.luckylandslots.com')?.siteId).toBe('luckyland');
    expect(findCashoutMinimum('stake.us')?.siteId).toBe('stake_us');
    expect(findCashoutMinimum('stake.com')?.siteId).toBe('stake');
    expect(findCashoutMinimum('notchumbacasino.com.evil.io')).toBeNull();
    expect(findCashoutMinimum('')).toBeNull();
  });
});

describe('evaluateCashoutGate', () => {
  it('is clear at and above the minimum', () => {
    expect(evaluateCashoutGate('chumbacasino.com', 100).status).toBe('clear');
    expect(evaluateCashoutGate('chumbacasino.com', 250.5).status).toBe('clear');
  });

  it('is below under the minimum, with the shortfall', () => {
    const gate = evaluateCashoutGate('chumbacasino.com', 62.4);
    expect(gate.status).toBe('below');
    expect(gate.shortfall).toBe(37.6);
    expect(gate.minAmount).toBe(100);
    expect(gate.unit).toBe('SC');
  });

  it('is unknown for blank sites, unknown hosts and unreadable balances', () => {
    expect(evaluateCashoutGate('stake.com', 5).status).toBe('unknown');
    expect(evaluateCashoutGate('example.com', 5).status).toBe('unknown');
    expect(evaluateCashoutGate('chumbacasino.com', null).status).toBe('unknown');
    expect(evaluateCashoutGate('chumbacasino.com', Number.NaN).status).toBe('unknown');
  });

  it('only hides the cashier when the balance is known to be under', () => {
    expect(shouldOfferCashier(evaluateCashoutGate('mcluck.com', 10))).toBe(false);
    expect(shouldOfferCashier(evaluateCashoutGate('mcluck.com', 75))).toBe(true);
    expect(shouldOfferCashier(evaluateCashoutGate('stake.com', 1))).toBe(true);
  });
});

describe('gate copy', () => {
  it('leaves clear alone', () => {
    expect(getCashoutGateCopy(evaluateCashoutGate('zulacasino.com', 80))).toBeNull();
  });

  it('below: says how far under, never says cash out, points at a break', () => {
    const copy = getCashoutGateCopy(evaluateCashoutGate('mcluck.com', 40))!;
    expect(copy.action).toBe('break');
    expect(copy.body).toContain('75 SC');
    expect(copy.body).toContain('35 SC under');
    expect(copy.body).toMatch(/stop|break/i);
    expect(copy.body).not.toMatch(/cash out/i);
    expect(copy.body).not.toMatch(BANNED_NUDGES);
  });

  it('unknown: neutral, does not promise a withdrawal', () => {
    const copy = getCashoutGateCopy(evaluateCashoutGate('stake.com', 500))!;
    expect(copy.action).toBe('cashier');
    expect(copy.body).toContain("doesn't have");
    expect(copy.body).not.toMatch(/cash out now|withdrawable|lock in/i);
  });

  it('house copy rules: no exclamation marks, TiltCheck spelling, no shield framing', () => {
    const samples = [
      getCashoutGateCopy(evaluateCashoutGate('chumbacasino.com', 3)),
      getCashoutGateCopy(evaluateCashoutGate('chumbacasino.com', null)),
      getCashoutGateCopy(evaluateCashoutGate('roobet.com', 3)),
    ];
    for (const copy of samples) {
      const text = `${copy!.tag} ${copy!.body} ${copy!.actionLabel}`;
      expect(text).not.toContain('!');
      expect(text).not.toMatch(/shield|armory|armor|guard/i);
      expect(text).not.toMatch(/tilt check|Tiltcheck|TILTCHECK/);
      expect(text).not.toMatch(BANNED_NUDGES);
    }
    expect(BELOW_MINIMUM_BREAK_REASON).not.toContain('!');
  });

  it('formats SC and USD', () => {
    expect(formatCashoutAmount(50, 'SC')).toBe('50 SC');
    expect(formatCashoutAmount(12.5, 'SC')).toBe('12.50 SC');
    expect(formatCashoutAmount(20, 'USD')).toBe('$20.00');
  });
});

const coffee: CashoutGoal = { id: 'coffee', name: 'Fancy Coffee', targetAmount: 8, metric: 'balance', enabled: true };

describe('profit-lock goal toast respects the minimum', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.mocked(triggerTouchGrassTimeout).mockClear();
    vi.mocked(triggerCashoutNavigation).mockClear();
  });

  it('above the minimum: works as before', () => {
    const handle = installProfitLock(document, { goals: [coffee], profitLockEnabled: false, hostnameOverride: 'chumbacasino.com' });
    handle.check(5);
    handle.check(120);
    const toast = document.querySelector('.tiltcheck-goal-toast')!;
    expect(toast.getAttribute('data-cashout-gate')).toBe('clear');
    expect(toast.textContent).toContain('Cashout Goal Unlocked');
    const btn = toast.querySelector('.tiltcheck-goal-cashout-btn') as HTMLButtonElement;
    expect(btn.textContent).toContain('Lock In Profit');
    btn.click();
    expect(triggerCashoutNavigation).toHaveBeenCalledTimes(1);
    handle.stop();
  });

  it('below the minimum: no cash-out button, shortfall shown, break offered', () => {
    const handle = installProfitLock(document, { goals: [coffee], profitLockEnabled: false, hostnameOverride: 'chumbacasino.com' });
    handle.check(5);
    handle.check(9);
    const toast = document.querySelector('.tiltcheck-goal-toast')!;
    expect(toast.getAttribute('data-cashout-gate')).toBe('below');
    expect(toast.textContent).toContain('91 SC under');
    expect(toast.textContent).not.toMatch(/cash (it )?out|lock in profit/i);
    expect(toast.querySelector('.tiltcheck-goal-cashout-btn')).toBeNull();
    (toast.querySelector('.tiltcheck-goal-break-btn') as HTMLButtonElement).click();
    expect(triggerTouchGrassTimeout).toHaveBeenCalledTimes(1);
    expect(triggerCashoutNavigation).not.toHaveBeenCalled();
    expect(document.getElementById(GOAL_TOAST_CONTAINER_ID)?.children.length).toBe(0);
    handle.stop();
  });

  it('unknown minimum: neutral wording', () => {
    const handle = installProfitLock(document, { goals: [coffee], profitLockEnabled: false, hostnameOverride: 'stake.com' });
    handle.check(5);
    handle.check(9);
    const toast = document.querySelector('.tiltcheck-goal-toast')!;
    expect(toast.getAttribute('data-cashout-gate')).toBe('unknown');
    expect(toast.textContent).toContain("doesn't have Stake.com's minimum");
    expect(toast.textContent).not.toMatch(/cash (it )?out/i);
    handle.stop();
  });
});

describe('profit-lock soft warning and hard brake respect the minimum', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.mocked(triggerTouchGrassTimeout).mockClear();
    vi.mocked(triggerCashoutNavigation).mockClear();
  });

  const base = { baseline: 20, peak: 90, floor: 55, onAcknowledge: () => {}, onCashout: () => {} };

  it('keeps the cash-out line when the floor balance clears the minimum', () => {
    showSoftWarningModal(document, { ...base, current: 60, hostnameOverride: 'wowvegas.com' });
    const modal = document.getElementById(PROFIT_LOCK_MODAL_ID)!;
    expect(modal.textContent).toContain('Cash out now while you are ahead.');
  });

  it('drops the cash-out line under the minimum and offers a break instead', () => {
    showSoftWarningModal(document, { ...base, current: 40, hostnameOverride: 'wowvegas.com' });
    const modal = document.getElementById(PROFIT_LOCK_MODAL_ID)!;
    expect(modal.getAttribute('data-cashout-gate')).toBe('below');
    expect(modal.textContent).not.toContain('Cash out now');
    expect(modal.textContent).toContain('10 SC under');
    (modal.querySelector('#tiltcheck-modal-cashout-btn') as HTMLButtonElement).click();
    expect(triggerTouchGrassTimeout).toHaveBeenCalledTimes(1);
    expect(triggerCashoutNavigation).not.toHaveBeenCalled();
  });

  it('hard brake says cash out only when clear', () => {
    expect(hardBrakeClosingLine(document, 150, 'high5casino.com')).toBe('Step back and cash out.');
    expect(hardBrakeClosingLine(document, 99, 'high5casino.com')).not.toMatch(/cash out\./i);
    expect(hardBrakeClosingLine(document, 99, 'stake.com')).toBe('Step back.');
  });
});

describe('bonus complete modal respects the minimum', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('below: no "100% withdrawable" claim', () => {
    showBonusCompleteModal(document, 300, () => {}, 30, 'crowncoinscasino.com');
    const modal = document.querySelector('[data-cashout-gate]')!;
    expect(modal.getAttribute('data-cashout-gate')).toBe('below');
    expect(modal.textContent).not.toMatch(/withdrawable|cash out/i);
    expect(modal.textContent).toContain('20 SC under');
  });

  it('clear: unchanged copy', () => {
    showBonusCompleteModal(document, 300, () => {}, 80, 'crowncoinscasino.com');
    expect(document.body.textContent).toContain('Stop spinning and cash out.');
  });
});
