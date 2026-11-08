/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */
/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installDefaultBetBreaker,
  DEFAULT_BET_MODAL_ID,
  detectCurrentBetAmount,
  findBetDecreaseControl,
  type DefaultBetBreakerHandle,
} from '../../src/default-bet-breaker.js';

describe('default-bet-breaker', () => {
  let handle: DefaultBetBreakerHandle | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (handle) {
      handle.stop();
      handle = null;
    }
    vi.useRealTimers();
  });

  it('detects bet amount across data-test and class conventions', () => {
    const input = document.createElement('input');
    input.setAttribute('data-test', 'bet-amount');
    input.value = '2.00';
    document.body.appendChild(input);

    expect(detectCurrentBetAmount(document)).toBe(2.0);

    input.remove();

    const span = document.createElement('span');
    span.className = 'currentBet-label';
    span.textContent = '$1.50';
    document.body.appendChild(span);

    expect(detectCurrentBetAmount(document)).toBe(1.5);
  });

  it('intercepts first spin if default bet exceeds base stake threshold', () => {
    // Bet input at $2.00
    const betEl = document.createElement('input');
    betEl.setAttribute('data-test', 'bet-amount');
    betEl.value = '2.00';
    document.body.appendChild(betEl);

    // Spin button
    const spinBtn = document.createElement('button');
    spinBtn.setAttribute('data-test', 'bet-button');
    spinBtn.textContent = 'Bet';
    document.body.appendChild(spinBtn);

    handle = installDefaultBetBreaker(document, {
      enabled: true,
      baseStakeThreshold: 0.5,
    });

    let spinDispatched = false;
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    spinBtn.addEventListener('click', () => {
      spinDispatched = true;
    });

    spinBtn.dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(true);
    expect(spinDispatched).toBe(false);
    expect(document.getElementById(DEFAULT_BET_MODAL_ID)).not.toBeNull();
    expect(document.body.textContent).toContain('$2.00');
  });

  it('allows spin through immediately if bet is within base stake threshold', () => {
    // Bet input at $0.20
    const betEl = document.createElement('input');
    betEl.setAttribute('data-test', 'bet-amount');
    betEl.value = '0.20';
    document.body.appendChild(betEl);

    // Spin button
    const spinBtn = document.createElement('button');
    spinBtn.setAttribute('data-test', 'bet-button');
    spinBtn.textContent = 'Bet';
    document.body.appendChild(spinBtn);

    handle = installDefaultBetBreaker(document, {
      enabled: true,
      baseStakeThreshold: 0.5,
    });

    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    spinBtn.dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(false);
    expect(document.getElementById(DEFAULT_BET_MODAL_ID)).toBeNull();
    expect(handle.isArmed()).toBe(false);
  });

  it('unblocks and permits spins after clicking confirm on modal', () => {
    const betEl = document.createElement('input');
    betEl.setAttribute('data-test', 'bet-amount');
    betEl.value = '1.00';
    document.body.appendChild(betEl);

    const spinBtn = document.createElement('button');
    spinBtn.setAttribute('data-test', 'bet-button');
    spinBtn.textContent = 'Bet';
    document.body.appendChild(spinBtn);

    handle = installDefaultBetBreaker(document, {
      enabled: true,
      baseStakeThreshold: 0.5,
    });

    // 1st click blocked
    const evt1 = new MouseEvent('click', { bubbles: true, cancelable: true });
    spinBtn.dispatchEvent(evt1);
    expect(evt1.defaultPrevented).toBe(true);

    const confirmBtn = document.querySelector<HTMLButtonElement>('#tiltcheck-btn-confirm');
    expect(confirmBtn).not.toBeNull();
    confirmBtn?.click();

    expect(document.getElementById(DEFAULT_BET_MODAL_ID)).toBeNull();
    expect(handle.isArmed()).toBe(false);
    expect(handle.getAcknowledgedStake()).toBe(1.0);

    // 2nd click allowed through
    const evt2 = new MouseEvent('click', { bubbles: true, cancelable: true });
    spinBtn.dispatchEvent(evt2);
    expect(evt2.defaultPrevented).toBe(false);
  });

  it('re-arms on page reset / navigation', () => {
    const betEl = document.createElement('input');
    betEl.setAttribute('data-test', 'bet-amount');
    betEl.value = '0.20';
    document.body.appendChild(betEl);

    const spinBtn = document.createElement('button');
    spinBtn.setAttribute('data-test', 'bet-button');
    spinBtn.textContent = 'Bet';
    document.body.appendChild(spinBtn);

    handle = installDefaultBetBreaker(document, {
      enabled: true,
      baseStakeThreshold: 0.5,
    });

    // 1st spin allowed (bet is $0.20)
    spinBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(handle.isArmed()).toBe(false);

    // Page reloads or user navigates to new game that defaults to $2.00
    betEl.value = '2.00';
    handle.reset();
    expect(handle.isArmed()).toBe(true);

    // Next spin blocked
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    spinBtn.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
    expect(document.getElementById(DEFAULT_BET_MODAL_ID)).not.toBeNull();
  });

  it('does nothing when disabled in options', () => {
    const betEl = document.createElement('input');
    betEl.setAttribute('data-test', 'bet-amount');
    betEl.value = '5.00';
    document.body.appendChild(betEl);

    const spinBtn = document.createElement('button');
    spinBtn.setAttribute('data-test', 'bet-button');
    spinBtn.textContent = 'Bet';
    document.body.appendChild(spinBtn);

    handle = installDefaultBetBreaker(document, {
      enabled: false,
      baseStakeThreshold: 0.5,
    });

    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    spinBtn.dispatchEvent(evt);

    expect(evt.defaultPrevented).toBe(false);
    expect(document.getElementById(DEFAULT_BET_MODAL_ID)).toBeNull();
  });

  it('finds minus button and steps down towards minimum', () => {
    const minusBtn = document.createElement('button');
    minusBtn.setAttribute('data-test', 'bet-minus');
    minusBtn.textContent = '-';
    // Make sure offsetParent is mocked in jsdom
    Object.defineProperty(minusBtn, 'offsetParent', { value: document.body });
    document.body.appendChild(minusBtn);

    expect(findBetDecreaseControl(document)).toBe(minusBtn);
  });
});
