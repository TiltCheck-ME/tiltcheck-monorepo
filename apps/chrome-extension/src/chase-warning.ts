/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 */

import { CASINO_SELECTORS } from './extractor.js';
import { PACE_HOST_ID, SPIN_CONTROL_SELECTOR } from './spin-pace-lock.js';

export const CHASE_SETTLE_MS = 5000;
export const CHASE_TOAST_TEXT = "No cap, the last one lost and this stake is bigger. That's the chase.";

const CHASE_POLL_MS = 250;

export type ChaseHandle = {
  stop: () => void;
  lastLosingStake: () => number | null;
};

export function parseMoney(text: string | null): number | null {
  if (text == null) return null;
  const tokens = text.split(/\s+/).map((token) => token.replace(/,/g, '').replace(/[^\d.-]/g, ''));
  const matches = tokens.filter((token) => /^-?\d+(\.\d+)?$/.test(token));
  if (matches.length !== 1) return null;
  return Number(matches[0]);
}

function readField(doc: Document, field: 'betAmount' | 'balance'): number | null {
  const hostname = doc.location.hostname;
  const entry = CASINO_SELECTORS.find((item) => hostname.includes(item.domain) || item.domain === '*');
  const selector = entry?.selectors[field];
  if (!selector) return null;
  const element = doc.querySelector(selector);
  if (!element) return null;
  const raw = element.getAttribute('data-value') || element.getAttribute('value') || element.textContent;
  return parseMoney(raw);
}

export function installChaseWarning(doc: Document, lockUntil: () => number): ChaseHandle {
  const host = doc.getElementById(PACE_HOST_ID);
  const shadow = host?.shadowRoot;
  if (!host || !shadow) {
    throw new Error('installChaseWarning requires #tiltcheck-pace-host with an open shadow root');
  }

  const alreadyStyled = Array.from(shadow.querySelectorAll('style')).some((style) =>
    (style.textContent ?? '').includes('.chase-toast'),
  );
  if (!alreadyStyled) {
    const style = doc.createElement('style');
    style.textContent = `
      .chase-toast {
        position: fixed;
        display: none;
        left: 50%;
        top: 4.5rem;
        transform: translateX(-50%);
        max-width: 22rem;
        padding: 0.75rem 1rem;
        pointer-events: none;
        background: #0f1115;
        color: #ffffff;
        font: 600 0.875rem ui-monospace, monospace;
      }
    `;
    shadow.append(style);
  }

  let toast = shadow.querySelector<HTMLElement>('.chase-toast');
  if (!toast) {
    toast = doc.createElement('div');
    toast.className = 'chase-toast';
    toast.textContent = CHASE_TOAST_TEXT;
    toast.style.display = 'none';
    shadow.append(toast);
  }

  let lastLosingStake: number | null = null;
  let pollId: ReturnType<typeof setInterval> | null = null;
  let settleId: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const clearPoll = (): void => {
    if (pollId !== null) {
      clearInterval(pollId);
      pollId = null;
    }
    if (settleId !== null) {
      clearTimeout(settleId);
      settleId = null;
    }
  };

  const watchBalance = (stake: number, baseline: number): void => {
    clearPoll();
    const startedAt = Date.now();
    const finish = (next: number | null): void => {
      if (stopped) return;
      if (next !== null && next !== baseline) {
        if (next < baseline) {
          lastLosingStake = stake;
        } else {
          lastLosingStake = null;
          toast.style.display = 'none';
        }
        clearPoll();
        return;
      }
      if (Date.now() - startedAt >= CHASE_SETTLE_MS) {
        clearPoll();
      }
    };
    pollId = setInterval(() => {
      finish(readField(doc, 'balance'));
    }, CHASE_POLL_MS);
    settleId = setTimeout(() => {
      if (stopped) return;
      clearPoll();
    }, CHASE_SETTLE_MS);
  };

  const onClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(SPIN_CONTROL_SELECTOR)) return;
    if (Date.now() < lockUntil()) return;
    const stake = readField(doc, 'betAmount');
    const balance = readField(doc, 'balance');
    if (stake === null || balance === null) return;
    if (typeof lastLosingStake === 'number' && stake > lastLosingStake) {
      toast.style.display = 'block';
    }
    watchBalance(stake, balance);
  };

  doc.addEventListener('click', onClick, true);

  const stop = (): void => {
    stopped = true;
    doc.removeEventListener('click', onClick, true);
    clearPoll();
    toast.style.display = 'none';
  };

  return {
    stop,
    lastLosingStake: () => lastLosingStake,
  };
}
