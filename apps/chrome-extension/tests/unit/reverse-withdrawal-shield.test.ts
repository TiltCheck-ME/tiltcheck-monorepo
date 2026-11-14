/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */
/**
 * @vitest-environment jsdom
 * DOM Reverse-Withdrawal Shield tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ALERT_ID,
  CANCEL_WITHDRAWAL_SELECTORS,
  installReverseWithdrawalShield,
  isCancelWithdrawalTarget,
  neutralizeCancelElement,
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

describe('neutralizeCancelElement', () => {
  it('disables button and applies pointer-events none and tooltip', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Cancel Withdrawal';
    neutralizeCancelElement(btn);

    expect(btn.getAttribute('data-tiltcheck-shield')).toBe('blocked');
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('style')).toContain('pointer-events: none');
    expect(btn.getAttribute('title')).toContain('TiltCheck Payout Lock is on');
  });
});

describe('installReverseWithdrawalShield interception and lifecycle', () => {
  beforeEach(() => {
    setInMemoryShieldEnabled(true);
    document.body.innerHTML = '';
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ tiltcheck_reverse_withdrawal_shield_enabled: true }),
          set: vi.fn().mockResolvedValue(undefined),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    const alertEl = document.getElementById(ALERT_ID);
    alertEl?.remove();
  });

  it('intercepts click on cancel withdrawal target and shows HUD alert', () => {
    const shield = installReverseWithdrawalShield(document);

    const btn = document.createElement('button');
    btn.textContent = 'Cancel Withdrawal';
    document.body.appendChild(btn);

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    btn.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(btn.getAttribute('data-tiltcheck-shield')).toBe('blocked');

    const alertEl = document.getElementById(ALERT_ID);
    expect(alertEl).not.toBeNull();
    expect(alertEl?.textContent).toContain('TiltCheck Payout Lock is on');

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

    const alertEl = document.getElementById(ALERT_ID);
    expect(alertEl).not.toBeNull();

    shield.stop();
  });

  it('scans and neutralizes dynamically rendered pending cancel buttons', () => {
    const shield = installReverseWithdrawalShield(document);

    const dynamicContainer = document.createElement('div');
    dynamicContainer.className = 'transactions-list';
    document.body.appendChild(dynamicContainer);

    const newBtn = document.createElement('button');
    newBtn.setAttribute('data-test', 'cancel-withdrawal-btn');
    newBtn.textContent = 'Cancel';
    dynamicContainer.appendChild(newBtn);

    const neutralized = shield.scanNow();
    expect(neutralized).toBeGreaterThanOrEqual(1);
    expect(newBtn.getAttribute('data-tiltcheck-shield')).toBe('blocked');
    expect(newBtn.disabled).toBe(true);

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

    shield.stop();
  });
});
