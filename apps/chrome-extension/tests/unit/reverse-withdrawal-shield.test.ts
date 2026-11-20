/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
/**
 * @vitest-environment jsdom
 * Redemption guard (PocketCheck): detection, confirm step, 10-second hold, private log.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CANCEL_WITHDRAWAL_SELECTORS,
  GUARD_DIALOG_ID,
  REDEMPTION_GUARD_LOG_KEY,
  REDEMPTION_GUARD_QUESTION,
  REDEMPTION_HOLD_MS,
  installReverseWithdrawalShield,
  isCancelWithdrawalTarget,
  markGuardedCancelElement,
  setInMemoryShieldEnabled,
} from '../../src/reverse-withdrawal-shield.js';

describe('isCancelWithdrawalTarget detection and scoping', () => {
  beforeEach(() => {
    setInMemoryShieldEnabled(true);
    document.body.innerHTML = '';
  });

  it('identifies cancel triggers across selector conventions', () => {
    for (const selector of CANCEL_WITHDRAWAL_SELECTORS) {
      const tagName = selector.startsWith('a') ? 'a' : 'button';
      const el = document.createElement(tagName);
      if (selector.startsWith('[')) {
        const match = selector.match(/\[([^=*~|^$]+)[*~|^$]?="([^"]+)"\]/);
        if (match) {
          el.setAttribute(match[1]!, match[2]!);
        }
      } else if (selector.startsWith('.')) {
        el.className = selector.slice(1);
      } else if (selector.startsWith('button[')) {
        const match = selector.match(/button\[([^=*~|^$]+)[*~|^$]?="([^"]+)"\]/);
        if (match) {
          el.setAttribute(match[1]!, match[2]!);
        }
      } else if (selector.startsWith('a[')) {
        const match = selector.match(/a\[([^=*~|^$]+)[*~|^$]?="([^"]+)"\]/);
        if (match) {
          el.setAttribute(match[1]!, match[2]!);
        }
      }
      expect(isCancelWithdrawalTarget(el)).toBe(true);
    }
  });

  it('matches explicit text patterns for cashout cancellation', () => {
    const tests = [
      'Cancel Withdrawal',
      'CANCEL WITHDRAWAL',
      'Reverse Withdrawal',
      'Cancel Cashout',
      'Cancel Payout',
      'Cancel Redemption',
      'Reverse Cashout',
      'Cancel Pending',
      'Reclaim Funds',
      'Cancelar Retirada',
      'Annuler le retrait',
      'Auszahlung stornieren',
    ];

    for (const text of tests) {
      const btn = document.createElement('button');
      btn.textContent = text;
      expect(isCancelWithdrawalTarget(btn)).toBe(true);
    }
  });

  it('contextually detects generic Cancel button inside a pending withdrawal row', () => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>2026-11-04</td>
      <td>Withdrawal to Bank (ACH)</td>
      <td>$500.00</td>
      <td><span class="status">Pending Review</span></td>
      <td><button class="action-btn">Cancel</button></td>
    `;
    document.body.appendChild(row);

    const cancelBtn = row.querySelector('.action-btn')!;
    expect(isCancelWithdrawalTarget(cancelBtn)).toBe(true);
  });

  it('strictly ignores generic Cancel buttons outside of pending withdrawal contexts', () => {
    // 1. Settings / Profile modal
    const modal = document.createElement('div');
    modal.className = 'profile-modal';
    modal.innerHTML = `
      <h2>Edit Profile</h2>
      <p>Settings & Avatar</p>
      <button class="btn-cancel">Cancel</button>
      <button class="btn-save">Save</button>
    `;
    document.body.appendChild(modal);

    const modalCancel = modal.querySelector('.btn-cancel')!;
    expect(isCancelWithdrawalTarget(modalCancel)).toBe(false);

    // 2. Normal Deposit or Withdraw action buttons
    const depositBtn = document.createElement('button');
    depositBtn.textContent = 'Deposit Funds';
    expect(isCancelWithdrawalTarget(depositBtn)).toBe(false);

    const withdrawBtn = document.createElement('button');
    withdrawBtn.textContent = 'Request Withdrawal';
    expect(isCancelWithdrawalTarget(withdrawBtn)).toBe(false);
  });
});

describe('markGuardedCancelElement', () => {
  it('tags the control but leaves it clickable', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Cancel Withdrawal';
    markGuardedCancelElement(btn);

    expect(btn.getAttribute('data-tiltcheck-shield')).toBe('guarded');
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('style') ?? '').not.toContain('pointer-events');
    expect(btn.getAttribute('title')).toContain('10-second hold');
  });
});

describe('installReverseWithdrawalShield confirm step and hold', () => {
  let storage: Record<string, unknown>;

  beforeEach(() => {
    vi.useFakeTimers();
    setInMemoryShieldEnabled(true);
    document.body.innerHTML = '';
    storage = { tiltcheck_reverse_withdrawal_shield_enabled: true };
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (keys: string[]) => {
            const out: Record<string, unknown> = {};
            for (const k of keys) if (k in storage) out[k] = storage[k];
            return out;
          }),
          set: vi.fn(async (data: Record<string, unknown>) => {
            Object.assign(storage, data);
          }),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    document.getElementById(GUARD_DIALOG_ID)?.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('blocks the first click and opens the confirm step', () => {
    const shield = installReverseWithdrawalShield(document);
    const btn = document.createElement('button');
    btn.textContent = 'Cancel Withdrawal';
    document.body.appendChild(btn);

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    btn.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    const dialog = document.getElementById(GUARD_DIALOG_ID);
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain(REDEMPTION_GUARD_QUESTION);
    expect(dialog?.textContent).not.toMatch(/\$\d/);
    shield.stop();
  });

  it('keeps "Reverse it" disabled for the 10-second hold, then lets the original click through once', async () => {
    const shield = installReverseWithdrawalShield(document);
    const btn = document.createElement('button');
    btn.textContent = 'Cancel Redemption';
    const siteHandler = vi.fn();
    btn.addEventListener('click', siteHandler);
    document.body.appendChild(btn);

    btn.click();
    expect(siteHandler).not.toHaveBeenCalled();

    const reverse = document.querySelector<HTMLButtonElement>(`#${GUARD_DIALOG_ID} button[data-guard="reverse"]`)!;
    expect(reverse.disabled).toBe(true);
    reverse.click();
    expect(siteHandler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(REDEMPTION_HOLD_MS - 1_000);
    expect(reverse.disabled).toBe(true);

    vi.advanceTimersByTime(1_250);
    expect(reverse.disabled).toBe(false);
    reverse.click();

    expect(siteHandler).toHaveBeenCalledTimes(1);
    expect(document.getElementById(GUARD_DIALOG_ID)).toBeNull();

    await vi.runOnlyPendingTimersAsync();
    const log = storage[REDEMPTION_GUARD_LOG_KEY] as Array<Record<string, unknown>>;
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ outcome: 'reversed' });
    expect(Object.keys(log[0]!).sort()).toEqual(['host', 'outcome', 'ts']);

    // Next click is guarded again.
    btn.click();
    expect(siteHandler).toHaveBeenCalledTimes(1);
    expect(document.getElementById(GUARD_DIALOG_ID)).not.toBeNull();
    shield.stop();
  });

  it('"Keep my cashout" closes the step, logs privately, and never fires the site handler', async () => {
    const shield = installReverseWithdrawalShield(document);
    const btn = document.createElement('button');
    btn.textContent = 'Cancel Withdrawal';
    const siteHandler = vi.fn();
    btn.addEventListener('click', siteHandler);
    document.body.appendChild(btn);

    btn.click();
    document.querySelector<HTMLButtonElement>(`#${GUARD_DIALOG_ID} button[data-guard="keep"]`)!.click();

    expect(document.getElementById(GUARD_DIALOG_ID)).toBeNull();
    expect(siteHandler).not.toHaveBeenCalled();
    await vi.runOnlyPendingTimersAsync();
    const log = storage[REDEMPTION_GUARD_LOG_KEY] as Array<Record<string, unknown>>;
    expect(log[0]).toMatchObject({ outcome: 'kept' });
    shield.stop();
  });

  it('intercepts Enter keydown on focused cancel target', () => {
    const shield = installReverseWithdrawalShield(document);
    const btn = document.createElement('button');
    btn.textContent = 'Cancel Cashout';
    document.body.appendChild(btn);

    const keyEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    btn.dispatchEvent(keyEvent);

    expect(keyEvent.defaultPrevented).toBe(true);
    expect(document.getElementById(GUARD_DIALOG_ID)).not.toBeNull();
    shield.stop();
  });

  it('tags dynamically rendered pending cancel buttons without disabling them', () => {
    const shield = installReverseWithdrawalShield(document);
    const dynamicContainer = document.createElement('div');
    dynamicContainer.className = 'transactions-list';
    document.body.appendChild(dynamicContainer);

    const newBtn = document.createElement('button');
    newBtn.setAttribute('data-test', 'cancel-withdrawal-btn');
    newBtn.textContent = 'Cancel';
    dynamicContainer.appendChild(newBtn);

    expect(shield.scanNow()).toBeGreaterThanOrEqual(1);
    expect(newBtn.getAttribute('data-tiltcheck-shield')).toBe('guarded');
    expect(newBtn.disabled).toBe(false);
    shield.stop();
  });

  it('honors updateEnabled toggle', () => {
    const shield = installReverseWithdrawalShield(document);
    const btn = document.createElement('button');
    btn.textContent = 'Cancel Withdrawal';
    document.body.appendChild(btn);

    shield.updateEnabled(false);
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    btn.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(false);
    expect(document.getElementById(GUARD_DIALOG_ID)).toBeNull();
    shield.stop();
  });
});
