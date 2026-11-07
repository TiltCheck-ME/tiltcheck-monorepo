/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
/**
 * @vitest-environment jsdom
 * DOM Deposit Barrier tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ALERT_ID,
  COOLDOWN_HUD_ID,
  DEPOSIT_SELECTORS,
  formatCooldownRemaining,
  installDepositBarrier,
  isDepositBarrierActive,
  isDepositTarget,
  setCooldownActiveUntil,
} from '../../src/deposit-barrier.js';
import {
  resetTouchGrassTimeoutForTests,
  triggerTouchGrassTimeout,
} from '../../src/touch-grass-timeout.js';

describe('isDepositTarget detection and exclusion', () => {
  it('identifies deposit triggers across selector conventions', () => {
    for (const selector of DEPOSIT_SELECTORS) {
      const tagName = selector.startsWith('button') ? 'button' : 'div';
      const el = document.createElement(tagName);
      if (selector.startsWith('[')) {
        const match = selector.match(/\[([^=]+)="([^"]+)"\]/);
        if (match) {
          el.setAttribute(match[1]!, match[2]!);
        }
      } else if (selector.startsWith('.')) {
        el.className = selector.slice(1);
      } else if (selector.startsWith('button[')) {
        const match = selector.match(/button\[([^=]+)="([^"]+)"\]/);
        if (match) {
          el.setAttribute(match[1]!, match[2]!);
        }
      }
      expect(isDepositTarget(el)).toBe(true);
    }
  });

  it('matches text tokens for deposit and cashier', () => {
    const tests = [
      'Deposit',
      'DEPOSIT',
      'Cashier',
      'Add Funds',
      'Buy Crypto',
      'Buy Coins',
      'Wallet',
      'Top Up',
      'Quick Deposit',
      'Einzahlen',
      'Depósito',
      'Recharger',
      'Recargar',
    ];

    for (const text of tests) {
      const btn = document.createElement('button');
      btn.textContent = text;
      expect(isDepositTarget(btn)).toBe(true);
    }
  });

  it('matches title and href attributes on icon-only deposit elements', () => {
    const iconBtn = document.createElement('button');
    iconBtn.setAttribute('title', 'Deposit');
    expect(isDepositTarget(iconBtn)).toBe(true);

    const iconLink = document.createElement('a');
    iconLink.setAttribute('href', 'https://stake.com/cashier');
    expect(isDepositTarget(iconLink)).toBe(true);

    const withdrawLink = document.createElement('a');
    withdrawLink.setAttribute('href', 'https://stake.com/withdraw');
    expect(isDepositTarget(withdrawLink)).toBe(false);
  });

  it('strictly excludes withdrawal, redeem, and vault buttons', () => {
    const excludedCases = [
      'Withdraw',
      'Withdrawal',
      'Instant Withdraw',
      'Redeem',
      'Redeem Prize',
      'Redemption History',
      'Vault',
      'Auto-Vault',
      'Send Tip',
      'Transfer Funds',
    ];

    for (const text of excludedCases) {
      const btn = document.createElement('button');
      btn.textContent = text;
      expect(isDepositTarget(btn)).toBe(false);

      // Even if it has a cashier class, withdrawal takes precedence
      btn.setAttribute('data-test', 'cashier-button');
      expect(isDepositTarget(btn)).toBe(false);
    }
  });

  it('returns false for standard gameplay controls', () => {
    const spin = document.createElement('button');
    spin.textContent = 'Spin';
    expect(isDepositTarget(spin)).toBe(false);

    const bet = document.createElement('button');
    bet.textContent = 'Bet $1.00';
    expect(isDepositTarget(bet)).toBe(false);

    const settings = document.createElement('button');
    settings.textContent = 'Settings';
    expect(isDepositTarget(settings)).toBe(false);
  });
});

describe('isDepositBarrierActive conditions', () => {
  afterEach(async () => {
    resetTouchGrassTimeoutForTests();
    await setCooldownActiveUntil(0);
  });

  it('is inactive by default', () => {
    expect(isDepositBarrierActive()).toBe(false);
  });

  it('is active when Touch Grass is running', () => {
    triggerTouchGrassTimeout('Testing timeout');
    expect(isDepositBarrierActive()).toBe(true);
  });

  it('is active when voluntary cooldown is active in the future', async () => {
    const future = Date.now() + 600_000; // 10 minutes
    await setCooldownActiveUntil(future);
    expect(isDepositBarrierActive()).toBe(true);
  });

  it('becomes inactive after voluntary cooldown timestamp passes', async () => {
    const past = Date.now() - 1000;
    await setCooldownActiveUntil(past);
    expect(isDepositBarrierActive()).toBe(false);
  });
});

describe('installDepositBarrier click interception', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(async () => {
    document.body.innerHTML = '';
    resetTouchGrassTimeoutForTests();
    await setCooldownActiveUntil(0);
    vi.useRealTimers();
  });

  it('allows deposit clicks when barrier is inactive', () => {
    const handle = installDepositBarrier(document);
    const depositBtn = document.createElement('button');
    depositBtn.setAttribute('data-test', 'cashier-button');
    depositBtn.textContent = 'Deposit';
    document.body.appendChild(depositBtn);

    let clicked = false;
    depositBtn.addEventListener('click', () => {
      clicked = true;
    });

    depositBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicked).toBe(true);
    expect(document.getElementById(ALERT_ID)).toBeNull();

    handle.stop();
  });

  it('intercepts deposit clicks and displays alert during Touch Grass timeout', () => {
    const handle = installDepositBarrier(document);
    triggerTouchGrassTimeout('Tilt signal detected.');

    const depositBtn = document.createElement('button');
    depositBtn.setAttribute('data-testid', 'deposit-button');
    depositBtn.textContent = 'Deposit';
    document.body.appendChild(depositBtn);

    let clicked = false;
    depositBtn.addEventListener('click', () => {
      clicked = true;
    });

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    depositBtn.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(clicked).toBe(false);

    const alert = document.getElementById(ALERT_ID);
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain("Deposit Barrier Active: You locked the door. Don't dig the hole deeper. Wait out the timer.");

    handle.stop();
  });

  it('intercepts deposit clicks and displays remaining minutes during voluntary cooldown', async () => {
    const handle = installDepositBarrier(document);
    const now = Date.now();
    // 15 minutes remaining
    await setCooldownActiveUntil(now + 15 * 60 * 1000);

    const depositBtn = document.createElement('button');
    depositBtn.textContent = 'Add Funds';
    document.body.appendChild(depositBtn);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    depositBtn.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);

    const alert = document.getElementById(ALERT_ID);
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain("Deposit Barrier Active: Voluntary lock engaged (15m remaining). Don't reload. Step away.");

    handle.stop();
  });

  it('never blocks withdrawal buttons even when barrier is active', async () => {
    const handle = installDepositBarrier(document);
    await setCooldownActiveUntil(Date.now() + 600_000);

    const withdrawBtn = document.createElement('button');
    withdrawBtn.textContent = 'Withdraw';
    document.body.appendChild(withdrawBtn);

    let clicked = false;
    withdrawBtn.addEventListener('click', () => {
      clicked = true;
    });

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    withdrawBtn.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(clicked).toBe(true);
    expect(document.getElementById(ALERT_ID)).toBeNull();

    handle.stop();
  });

  it('auto-dismisses alert after 4000ms', () => {
    vi.useFakeTimers();
    const handle = installDepositBarrier(document);
    triggerTouchGrassTimeout('Tilt signal detected.');

    const depositBtn = document.createElement('button');
    depositBtn.setAttribute('data-test', 'deposit');
    depositBtn.textContent = 'Deposit';
    document.body.appendChild(depositBtn);

    depositBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(document.getElementById(ALERT_ID)).not.toBeNull();

    vi.advanceTimersByTime(3900);
    expect(document.getElementById(ALERT_ID)).not.toBeNull();

    vi.advanceTimersByTime(200);
    expect(document.getElementById(ALERT_ID)).toBeNull();

    handle.stop();
  });

  it('resets auto-dismiss timer on rapid double-clicks without crashing or leaking clicks', () => {
    vi.useFakeTimers();
    const handle = installDepositBarrier(document);
    triggerTouchGrassTimeout('Testing rapid clicks');

    const depositBtn = document.createElement('button');
    depositBtn.setAttribute('data-test', 'deposit');
    depositBtn.textContent = 'Deposit';
    document.body.appendChild(depositBtn);

    let clicked = false;
    depositBtn.addEventListener('click', () => { clicked = true; });

    // Click 1
    const evt1 = new MouseEvent('click', { bubbles: true, cancelable: true });
    depositBtn.dispatchEvent(evt1);
    expect(evt1.defaultPrevented).toBe(true);
    expect(clicked).toBe(false);

    // Advance 3000ms
    vi.advanceTimersByTime(3000);
    expect(document.getElementById(ALERT_ID)).not.toBeNull();

    // Click 2 (rapid second click while alert still visible)
    const evt2 = new MouseEvent('click', { bubbles: true, cancelable: true });
    depositBtn.dispatchEvent(evt2);
    expect(evt2.defaultPrevented).toBe(true);
    expect(clicked).toBe(false);

    // After 2000ms more (5000ms from start, but only 2000ms from click 2), alert is still visible
    vi.advanceTimersByTime(2000);
    expect(document.getElementById(ALERT_ID)).not.toBeNull();

    // After 2100ms more (4100ms from click 2), alert dismisses
    vi.advanceTimersByTime(2100);
    expect(document.getElementById(ALERT_ID)).toBeNull();

    handle.stop();
  });

  it('syncs cooldown changes dynamically into running handle via updateCooldown', () => {
    const handle = installDepositBarrier(document);
    expect(handle.isActive()).toBe(false);

    handle.updateCooldown(Date.now() + 600_000);
    expect(handle.isActive()).toBe(true);

    handle.updateCooldown(0);
    expect(handle.isActive()).toBe(false);

    handle.stop();
  });
});

describe('formatCooldownRemaining helper', () => {
  it('formats days, hours, minutes, and seconds properly', () => {
    expect(formatCooldownRemaining(86400 * 2 + 3600 * 3 + 60 * 15)).toBe('2d 3h 15m left');
    expect(formatCooldownRemaining(3600 * 4 + 60 * 12 + 30)).toBe('4h 12m 30s left');
    expect(formatCooldownRemaining(65)).toBe('1m 5s left');
    expect(formatCooldownRemaining(0)).toBe('0s');
    expect(formatCooldownRemaining(-10)).toBe('0s');
  });
});

describe('in-session Cooldown Timer HUD', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.getElementById(COOLDOWN_HUD_ID)?.remove();
  });

  it('renders floating HUD when an on-chain lock is active', () => {
    const handle = installDepositBarrier(document);
    expect(handle.isHudVisible()).toBe(false);
    expect(document.getElementById(COOLDOWN_HUD_ID)).toBeNull();

    // Set 2 hours lock
    const futureTime = Date.now() + 7200 * 1000;
    handle.updateCooldown(futureTime);

    expect(handle.isHudVisible()).toBe(true);
    const hud = document.getElementById(COOLDOWN_HUD_ID);
    expect(hud).not.toBeNull();
    expect(hud?.textContent).toContain('Vault Lock Active');
    expect(hud?.textContent).toContain('Deposit Barrier Engaged');
    expect(hud?.innerHTML).toContain('Verify PDA');
    expect(hud?.innerHTML).toContain('Extend +7d');

    // Toggle minimize
    const toggleBtn = hud?.querySelector('.tiltcheck-cooldown-toggle') as HTMLButtonElement | null;
    expect(toggleBtn).not.toBeNull();
    toggleBtn?.click();

    expect(hud?.textContent).toContain('LOCK:');
    expect(hud?.querySelector('.tiltcheck-cooldown-toggle')?.textContent).toBe('+');

    // Expand back
    (hud?.querySelector('.tiltcheck-cooldown-toggle') as HTMLButtonElement)?.click();
    expect(hud?.textContent).toContain('Vault Lock Active');

    // Set 2 seconds lock to verify expiration without thousands of fake timer ticks
    handle.updateCooldown(Date.now() + 2000);
    expect(handle.isHudVisible()).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(handle.isHudVisible()).toBe(false);
    expect(document.getElementById(COOLDOWN_HUD_ID)).toBeNull();

    handle.stop();
  });

  it('removes HUD cleanly when handle.stop() is called', () => {
    const handle = installDepositBarrier(document);
    handle.updateCooldown(Date.now() + 3600 * 1000);
    expect(handle.isHudVisible()).toBe(true);

    handle.stop();
    expect(handle.isHudVisible()).toBe(false);
    expect(document.getElementById(COOLDOWN_HUD_ID)).toBeNull();
  });

  it('renders critical Tilt Auto-Lock badge and message when source is auto_tilt', () => {
    const handle = installDepositBarrier(document);
    const futureTime = Date.now() + 86400 * 1000;
    handle.updateCooldown(futureTime, 'auto_tilt');

    expect(handle.isHudVisible()).toBe(true);
    expect(handle.getCooldownSource()).toBe('auto_tilt');
    const hud = document.getElementById(COOLDOWN_HUD_ID);
    expect(hud?.textContent).toContain('Tilt Auto-Lock Active');
    expect(hud?.textContent).toContain('Level 3+ Tilt Lockout');
    expect(hud?.innerHTML).toContain('Confirm On-Chain');

    // Test minimize
    const toggleBtn = hud?.querySelector('.tiltcheck-cooldown-toggle') as HTMLButtonElement | null;
    toggleBtn?.click();
    expect(hud?.textContent).toContain('TILT LOCK:');

    // Test deposit click interception alert message
    const depositBtn = document.createElement('button');
    depositBtn.setAttribute('data-test', 'cashier-button');
    depositBtn.textContent = 'Cashier';
    document.body.appendChild(depositBtn);

    depositBtn.click();
    const alert = document.getElementById(ALERT_ID);
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('Level 3+ tilt auto-lock engaged');

    depositBtn.remove();
    handle.stop();
  });
});
