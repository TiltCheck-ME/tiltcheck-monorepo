/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */
/**
 * spin-pace-lock.ts
 * Pacing circuit breaker for rapid betting / slot spin clicks.
 * Non-custodial: client-side DOM throttling with zero custody of player funds.
 */

import { playAudioCue } from './audio-alerts.js';
import { recordActivityFeedEvent } from './activity-feed.js';

export const PACE_LOCK_MS = 2000;
export const PACE_TICK_MS = 250;
export const PACE_TOAST_TEXT = "Pacing lock active. Let the last spin settle before firing again.";
export const PACE_HOST_ID = 'tiltcheck-pace-host';

export const SPIN_CONTROL_SELECTOR = [
  'button[data-test*="bet"]',
  'button[data-test*="play"]',
  'button[data-test*="spin"]',
  '[data-test="bet-button"]',
  '[data-test="play-button"]',
  '[data-test="spin-button"]',
  '[data-testid*="bet"]',
  '[data-testid*="spin"]',
  '[data-testid*="play"]',
  'button[class*="bet" i]',
  'button[class*="spin" i]',
  'button[class*="play" i]',
  '[data-action="bet"]',
  '[data-action="spin"]',
  'button[aria-label*="spin" i]',
  'button[aria-label*="bet" i]',
  'button[aria-label*="play" i]',
  '.game-controls button',
  '#spin-button',
  '.play-btn',
  '.spin-btn',
].join(', ');

export function findSpinControl(target: Element): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  const selectorMatch = target.closest<HTMLElement>(SPIN_CONTROL_SELECTOR);
  if (selectorMatch) return selectorMatch;

  const button = target.closest<HTMLElement>('button, [role="button"], input[type="button"], input[type="submit"]');
  if (!button) return null;

  const dataTest = (button.getAttribute('data-test') || button.getAttribute('data-testid') || '').toLowerCase();
  if (dataTest.includes('bet') || dataTest.includes('spin') || dataTest.includes('play') || dataTest.includes('roll')) {
    return button;
  }

  const aria = (button.getAttribute('aria-label') || button.getAttribute('title') || '').toLowerCase();
  if (aria.includes('spin') || aria.includes('bet') || aria.includes('play') || aria.includes('roll')) {
    return button;
  }

  const text = (button.textContent || '').trim().toLowerCase();
  if (/^(bet|spin|play|start|roll|deal|double|split|hit|stand)(\s+.*)?$/i.test(text) && text.length <= 25) {
    if (!text.includes('history') && !text.includes('slip') && !text.includes('rules') && !text.includes('detail') && !text.includes('sport')) {
      return button;
    }
  }

  return null;
}

export type PaceLockHandle = {
  stop: () => void;
  lockUntil: () => number;
};

export function installSpinPaceLock(doc: Document = document): PaceLockHandle {
  let lockUntil = 0;
  let anchor: Element | null = null;
  let tickId: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  const priorDisabled = new Map<HTMLButtonElement, boolean>();

  const host = doc.createElement('div');
  host.id = PACE_HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });

  const style = doc.createElement('style');
  style.textContent = `
    :host { position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; }
    .chip {
      position: fixed;
      display: none;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      background: rgba(15, 17, 21, 0.88);
      color: #ffffff;
      font: 700 1.25rem ui-monospace, monospace;
    }
    .toast {
      position: fixed;
      display: none;
      left: 50%;
      top: 1rem;
      transform: translateX(-50%);
      max-width: 22rem;
      padding: 0.75rem 1rem;
      pointer-events: none;
      background: #0f1115;
      color: #ffffff;
      font: 600 0.875rem ui-monospace, monospace;
    }
  `;

  const chip = doc.createElement('div');
  chip.className = 'chip';
  const toast = doc.createElement('div');
  toast.className = 'toast';
  toast.textContent = PACE_TOAST_TEXT;
  shadow.append(style, chip, toast);
  doc.body.append(host);

  const matches = (): HTMLElement[] => {
    const list = Array.from(doc.querySelectorAll<HTMLElement>(SPIN_CONTROL_SELECTOR));
    if (anchor instanceof HTMLElement && !list.includes(anchor)) {
      list.push(anchor);
    }
    return list;
  };

  const showToast = (): void => {
    toast.style.display = 'block';
  };

  const hideToast = (): void => {
    toast.style.display = 'none';
  };

  const placeChip = (target: Element): void => {
    const rect = target.getBoundingClientRect();
    chip.style.display = 'flex';
    chip.style.left = `${rect.left}px`;
    chip.style.top = `${rect.top}px`;
    chip.style.width = `${Math.max(rect.width, 48)}px`;
    chip.style.height = `${Math.max(rect.height, 32)}px`;
  };

  const release = (): void => {
    if (tickId !== null) {
      clearInterval(tickId);
      tickId = null;
    }
    for (const [button, wasDisabled] of priorDisabled) {
      button.disabled = wasDisabled;
    }
    priorDisabled.clear();
    chip.style.display = 'none';
    hideToast();
    anchor = null;
    lockUntil = 0;
  };

  const applyLockVisuals = (): void => {
    const left = lockUntil - Date.now();
    if (left <= 0) {
      release();
      return;
    }
    chip.textContent = String(Math.ceil(left / 1000));
    const current = matches();
    for (const el of current) {
      if (el instanceof HTMLButtonElement) {
        if (!priorDisabled.has(el)) {
          priorDisabled.set(el, el.disabled);
        }
        el.disabled = true;
      }
    }
    const liveAnchor = anchor && anchor.isConnected ? anchor : (current[0] ?? null);
    anchor = liveAnchor;
    if (liveAnchor) {
      placeChip(liveAnchor);
    } else {
      chip.style.display = 'none';
    }
  };

  const startLock = (spin: Element): void => {
    lockUntil = Date.now() + PACE_LOCK_MS;
    const connected = matches();
    anchor = spin.isConnected ? spin : (connected[0] ?? null);
    hideToast();
    applyLockVisuals();
    if (tickId !== null) {
      clearInterval(tickId);
    }
    tickId = setInterval(applyLockVisuals, PACE_TICK_MS);
    void recordActivityFeedEvent('Spin brake locked spin button (2s cooldown enforced)', 'info');
  };

  const swallow = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    showToast();
    playAudioCue('spin_brake');
    void recordActivityFeedEvent('Rapid spin click blocked by 2s pace brake', 'warn');
  };

  const onDocumentClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const spin = findSpinControl(target);
    if (!spin) return;
    if (Date.now() < lockUntil) {
      swallow(event);
      return;
    }
    if (spin instanceof HTMLButtonElement && !priorDisabled.has(spin)) {
      priorDisabled.set(spin, spin.disabled);
    }
    setTimeout(() => {
      if (stopped) return;
      startLock(spin);
    }, 0);
  };

  const onChipClick = (event: Event): void => {
    if (Date.now() >= lockUntil) return;
    swallow(event);
  };

  chip.addEventListener('click', onChipClick);
  doc.addEventListener('click', onDocumentClick, true);

  const stop = (): void => {
    stopped = true;
    doc.removeEventListener('click', onDocumentClick, true);
    release();
    host.remove();
  };

  return {
    stop,
    lockUntil: () => lockUntil,
  };
}
