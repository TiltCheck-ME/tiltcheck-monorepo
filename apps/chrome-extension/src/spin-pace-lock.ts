/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 */

export const PACE_LOCK_MS = 2000;
export const PACE_TICK_MS = 250;
export const PACE_TOAST_TEXT = "No cap, the balance is still catching that last spin.";
export const PACE_HOST_ID = 'tiltcheck-pace-host';

export const SPIN_CONTROL_SELECTOR = [
  'button[class*="bet"]',
  'button[class*="spin"]',
  '[data-action="bet"]',
  '[data-action="spin"]',
].join(', ');

export type PaceLockHandle = {
  stop: () => void;
  lockUntil: () => number;
};

export function installSpinPaceLock(doc: Document = document): PaceLockHandle {
  let lockUntil = 0;
  let anchor: Element | null = null;
  let tickId: ReturnType<typeof setInterval> | null = null;
  const disabledByLock = new Set<HTMLButtonElement>();

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

  const matches = (): HTMLElement[] =>
    Array.from(doc.querySelectorAll<HTMLElement>(SPIN_CONTROL_SELECTOR));

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
    for (const button of disabledByLock) {
      button.disabled = false;
    }
    disabledByLock.clear();
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
        el.disabled = true;
        disabledByLock.add(el);
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
    anchor = spin;
    hideToast();
    applyLockVisuals();
    if (tickId !== null) {
      clearInterval(tickId);
    }
    tickId = setInterval(applyLockVisuals, PACE_TICK_MS);
  };

  const swallow = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    showToast();
  };

  const onDocumentClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const spin = target.closest(SPIN_CONTROL_SELECTOR);
    if (!spin) return;
    if (Date.now() < lockUntil) {
      swallow(event);
      return;
    }
    queueMicrotask(() => {
      if (!spin.isConnected) return;
      startLock(spin);
    });
  };

  const onChipClick = (event: Event): void => {
    if (Date.now() >= lockUntil) return;
    swallow(event);
  };

  chip.addEventListener('click', onChipClick);
  doc.addEventListener('click', onDocumentClick, true);

  const stop = (): void => {
    doc.removeEventListener('click', onDocumentClick, true);
    release();
    host.remove();
  };

  return {
    stop,
    lockUntil: () => lockUntil,
  };
}
