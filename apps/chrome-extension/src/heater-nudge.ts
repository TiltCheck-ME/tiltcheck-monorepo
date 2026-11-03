/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */
/**
 * heater-nudge.ts
 * Real-time spotter nudge during win streaks.
 * Non-custodial: optional client-side lock heuristic with zero custody of player funds.
 */

import { PACE_HOST_ID, SPIN_CONTROL_SELECTOR } from './spin-pace-lock.js';

export const HEATER_TOAST_TEXT = "You're up right now. Lock half this win before the house claws it back. Skip anytime.";
export const HEATER_CAP_TEXT = "Spotter check: lock half your profit before volatility reverses. Opt-in. Skip anytime.";
export const HEATER_RATIO = 1.05;

export type HeaterHandle = {
  stop: () => void;
  armed: () => boolean;
};

export function detectHeater(previousBalance: number | null, nextBalance: number | null): boolean {
  if (previousBalance == null || nextBalance == null) return false;
  if (previousBalance <= 0) return nextBalance > 0;
  return nextBalance / previousBalance >= HEATER_RATIO;
}

export function installHeaterNudge(doc: Document = document): HeaterHandle {
  const host = doc.getElementById(PACE_HOST_ID);
  const shadow = host?.shadowRoot;
  if (!host || !shadow) {
    throw new Error('installHeaterNudge requires #tiltcheck-pace-host');
  }

  let previous: number | null = null;
  let armed = false;
  let stopped = false;

  const toast = doc.createElement('div');
  toast.className = 'heater-toast';
  toast.setAttribute('role', 'status');
  toast.style.cssText = 'position:fixed;display:none;left:50%;bottom:4.5rem;transform:translateX(-50%);max-width:22rem;padding:0.75rem 1rem;background:#0f1115;color:#fff;font:600 0.875rem ui-monospace,monospace;z-index:2;pointer-events:auto;';
  toast.textContent = HEATER_TOAST_TEXT;
  const skip = doc.createElement('button');
  skip.type = 'button';
  skip.textContent = 'Skip';
  skip.style.cssText = 'margin-left:0.5rem;font:inherit;background:#17c3b2;color:#0f1115;border:0;padding:0.2rem 0.5rem;';
  skip.addEventListener('click', () => {
    toast.style.display = 'none';
    armed = false;
  });
  toast.appendChild(skip);
  shadow.append(toast);

  const onClick = (event: Event): void => {
    if (stopped) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(SPIN_CONTROL_SELECTOR)) return;
    const labeled = doc.querySelector('[data-balance], [class*="balance"]');
    const raw = labeled?.getAttribute('data-value') || labeled?.textContent;
    const next = raw ? Number(String(raw).replace(/[^0-9.]/g, '')) : null;
    if (detectHeater(previous, Number.isFinite(next) ? next : null)) {
      armed = true;
      toast.style.display = 'block';
    }
    if (Number.isFinite(next)) previous = next;
  };

  doc.addEventListener('click', onClick, true);

  return {
    stop: () => {
      stopped = true;
      doc.removeEventListener('click', onClick, true);
      toast.remove();
    },
    armed: () => armed,
  };
}
