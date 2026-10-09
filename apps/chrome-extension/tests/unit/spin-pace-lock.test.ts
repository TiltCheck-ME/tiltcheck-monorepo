/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 */
/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installSpinPaceLock,
  PACE_HOST_ID,
  PACE_LOCK_MS,
  PACE_TOAST_TEXT,
} from '../../src/spin-pace-lock.js';

function spinButton(label = 'Spin'): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'spin-button';
  button.textContent = label;
  document.body.appendChild(button);
  return button;
}

function chip(): HTMLElement | null {
  return document.getElementById(PACE_HOST_ID)?.shadowRoot?.querySelector('.chip') ?? null;
}

function toast(): HTMLElement | null {
  return document.getElementById(PACE_HOST_ID)?.shadowRoot?.querySelector('.toast') ?? null;
}

async function flush(): Promise<void> {
  await Promise.resolve();
}

describe('installSpinPaceLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T15:00:00.000Z'));
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('locks an allowed spin for 2000ms and shows 2', async () => {
    const button = spinButton();
    let spins = 0;
    button.addEventListener('click', () => {
      spins += 1;
    });
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(spins).toBe(1);
    await flush();
    expect(handle.lockUntil()).toBe(Date.now() + PACE_LOCK_MS);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Spin');
    expect(chip()?.textContent).toBe('2');
    handle.stop();
  });

  it('shows 1 after 1000ms and keeps the button disabled', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    vi.advanceTimersByTime(1000);
    expect(chip()?.textContent).toBe('1');
    expect(button.disabled).toBe(true);
    handle.stop();
  });

  it('swallows a spin click during the lock without adding time', async () => {
    const button = spinButton();
    let spins = 0;
    button.addEventListener('click', () => {
      spins += 1;
    });
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    const until = handle.lockUntil();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(spins).toBe(1);
    expect(handle.lockUntil()).toBe(until);
    expect(toast()?.textContent).toBe(PACE_TOAST_TEXT);
    expect(toast()?.style.display).toBe('block');
    expect(document.querySelectorAll('.toast').length).toBe(0);
    handle.stop();
  });

  it('shows the toast when the click lands on the chip', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    chip()?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    chip()?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(document.getElementById(PACE_HOST_ID)?.shadowRoot?.querySelectorAll('.toast').length).toBe(1);
    expect(toast()?.style.display).toBe('block');
    handle.stop();
  });

  it('restores the button and clears the chip and toast at 2000ms', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    chip()?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(PACE_LOCK_MS);
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Spin');
    expect(chip()?.style.display).toBe('none');
    expect(toast()?.style.display).toBe('none');
    handle.stop();
  });

  it('ignores a click that is not a spin control', async () => {
    const other = document.createElement('button');
    other.textContent = 'Chat';
    document.body.appendChild(other);
    const handle = installSpinPaceLock();
    other.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    expect(handle.lockUntil()).toBe(0);
    expect(document.getElementById(PACE_HOST_ID)?.shadowRoot?.querySelector('.chip')?.style.display).not.toBe('flex');
    handle.stop();
  });

  it('starts a fresh 2000ms lock on the next allowed spin', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    vi.advanceTimersByTime(PACE_LOCK_MS);
    const start = Date.now();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    expect(handle.lockUntil()).toBe(start + PACE_LOCK_MS);
    handle.stop();
  });

  it('disables a spin button inserted during the lock', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    const redrawn = spinButton('Spin again');
    vi.advanceTimersByTime(250);
    expect(redrawn.disabled).toBe(true);
    handle.stop();
  });

  it('keeps the stylesheet inside the shadow root', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    const root = document.getElementById(PACE_HOST_ID)?.shadowRoot;
    expect(root?.querySelector('style')?.textContent).toContain('pointer-events: none');
    expect(document.head.querySelector('style')).toBeNull();
    expect(document.body.querySelector(':scope > style')).toBeNull();
    handle.stop();
  });

  it('re-enables a spin button that its own click listener disabled during the lock', async () => {
    const button = spinButton();
    button.addEventListener('click', () => {
      button.disabled = true;
    });
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    expect(button.disabled).toBe(true);
    vi.advanceTimersByTime(PACE_LOCK_MS);
    expect(button.disabled).toBe(false);
    handle.stop();
  });

  it('does not re-enable a spin button that was already disabled before the lock', async () => {
    const disabledSpin = spinButton('Disabled');
    disabledSpin.disabled = true;
    const enabledSpin = spinButton('Enabled');
    const handle = installSpinPaceLock();
    enabledSpin.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    expect(disabledSpin.disabled).toBe(true);
    expect(enabledSpin.disabled).toBe(true);
    vi.advanceTimersByTime(PACE_LOCK_MS);
    expect(disabledSpin.disabled).toBe(true);
    expect(enabledSpin.disabled).toBe(false);
    handle.stop();
  });

  it('starts lock when clicked spin is replaced before the microtask runs', async () => {
    const oldButton = spinButton('Old');
    const handle = installSpinPaceLock();
    oldButton.addEventListener('click', () => {
      oldButton.remove();
      spinButton('New');
    });
    oldButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    expect(handle.lockUntil()).toBe(Date.now() + PACE_LOCK_MS);
    const newButton = document.querySelector('.spin-button') as HTMLButtonElement;
    expect(newButton.textContent).toBe('New');
    vi.advanceTimersByTime(250);
    expect(newButton.disabled).toBe(true);
    handle.stop();
  });

  it('does not start a lock after stop() before the microtask flush', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    handle.stop();
    await flush();
    expect(document.getElementById(PACE_HOST_ID)).toBeNull();
    expect(handle.lockUntil()).toBe(0);
    expect(button.disabled).toBe(false);
  });
});
