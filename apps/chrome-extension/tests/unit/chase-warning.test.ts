/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 */
/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHASE_TOAST_TEXT,
  installChaseWarning,
  parseMoney,
  type ChaseHandle,
} from '../../src/chase-warning.js';
import { PACE_HOST_ID } from '../../src/spin-pace-lock.js';

function chaseToast(): HTMLElement | null {
  return document.getElementById('tiltcheck-pace-host')?.shadowRoot?.querySelector('.chase-toast') ?? null;
}

function chaseToasts(): NodeListOf<Element> {
  return document.getElementById('tiltcheck-pace-host')?.shadowRoot?.querySelectorAll('.chase-toast')
    ?? document.createElement('div').querySelectorAll('.chase-toast');
}

describe('parseMoney', () => {
  it('reads one money amount and rejects ambiguous text', () => {
    expect(parseMoney('$1,250.50')).toBe(1250.5);
    expect(parseMoney('5 10')).toBeNull();
    expect(parseMoney('Spin')).toBeNull();
  });
});

describe('installChaseWarning', () => {
  let lockUntil: () => number = () => 0;
  let button: HTMLButtonElement;
  let bet: HTMLElement;
  let balance: HTMLElement;
  const handles: ChaseHandle[] = [];

  function install(): ChaseHandle {
    const handle = installChaseWarning(document, () => lockUntil());
    handles.push(handle);
    return handle;
  }

  function clickSpin(): void {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }

  function recordLoss(stake: string, startBalance: string, endBalance: string): void {
    bet.textContent = stake;
    balance.textContent = startBalance;
    clickSpin();
    balance.textContent = endBalance;
    vi.advanceTimersByTime(250);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T15:00:00.000Z'));
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    lockUntil = () => 0;

    const host = document.createElement('div');
    host.id = PACE_HOST_ID;
    host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);

    button = document.createElement('button');
    button.className = 'spin-button';
    button.textContent = 'Spin';
    document.body.appendChild(button);

    bet = document.createElement('div');
    bet.setAttribute('data-bet', '');
    document.body.appendChild(bet);

    balance = document.createElement('div');
    balance.setAttribute('data-balance', '');
    document.body.appendChild(balance);
  });

  afterEach(() => {
    for (const handle of handles) handle.stop();
    handles.length = 0;
    vi.useRealTimers();
  });

  it('warns when the stake climbs after a loss and the spin still runs', () => {
    let buttonListenerCount = 0;
    button.addEventListener('click', () => {
      buttonListenerCount += 1;
    });
    const handle = install();
    recordLoss('1', '100', '90');
    expect(handle.lastLosingStake()).toBe(1);
    bet.textContent = '2';
    clickSpin();
    expect(buttonListenerCount).toBe(2);
    expect(chaseToast()?.textContent).toBe(CHASE_TOAST_TEXT);
    expect(chaseToasts().length).toBe(1);
  });

  it('clears the losing stake when the next balance rises', () => {
    const handle = install();
    recordLoss('1', '100', '90');
    bet.textContent = '2';
    balance.textContent = '90';
    clickSpin();
    balance.textContent = '110';
    vi.advanceTimersByTime(250);
    expect(chaseToast()?.style.display).toBe('none');
    expect(handle.lastLosingStake()).toBeNull();
  });

  it('stays quiet when the stake matches the loss', () => {
    install();
    recordLoss('5', '100', '80');
    bet.textContent = '5';
    clickSpin();
    expect(chaseToast()?.style.display).not.toBe('block');
  });

  it('stays quiet when the stake is smaller than the loss', () => {
    install();
    recordLoss('5', '100', '80');
    bet.textContent = '4';
    clickSpin();
    expect(chaseToast()?.style.display).not.toBe('block');
  });

  it('ignores an unreadable stake without changing the losing stake', () => {
    const handle = install();
    recordLoss('3', '50', '40');
    bet.textContent = 'nope';
    clickSpin();
    expect(handle.lastLosingStake()).toBe(3);
    expect(chaseToast()?.style.display).not.toBe('block');
  });

  it('leaves the losing stake empty when the balance never moves', () => {
    const handle = install();
    bet.textContent = '1';
    balance.textContent = '100';
    clickSpin();
    vi.advanceTimersByTime(5000);
    expect(handle.lastLosingStake()).toBeNull();
  });

  it('reuses one toast when the stake climbs again after another loss', () => {
    install();
    recordLoss('1', '100', '90');
    bet.textContent = '2';
    clickSpin();
    balance.textContent = '70';
    vi.advanceTimersByTime(250);
    bet.textContent = '3';
    clickSpin();
    expect(chaseToasts().length).toBe(1);
  });

  it('stays quiet during the pace lock and still lets the button listener run', () => {
    let buttonListenerCount = 0;
    button.addEventListener('click', () => {
      buttonListenerCount += 1;
    });
    const handle = install();
    recordLoss('1', '100', '90');
    const losingStake = handle.lastLosingStake();
    lockUntil = () => Date.now() + 10_000;
    bet.textContent = '4';
    clickSpin();
    expect(chaseToast()?.style.display).not.toBe('block');
    expect(handle.lastLosingStake()).toBe(losingStake);
    expect(buttonListenerCount).toBe(2);
  });

  it('keeps the chase stylesheet inside the shadow root', () => {
    install();
    const root = document.getElementById('tiltcheck-pace-host')?.shadowRoot;
    expect(root?.querySelector('style')?.textContent).toContain('.chase-toast');
    expect(document.head.querySelector('style')).toBeNull();
  });
});
