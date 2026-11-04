/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
/**
 * deposit-barrier.ts
 * DOM Deposit Barrier.
 * Intercepts cashier/deposit clicks during Touch Grass timeouts or voluntary cooldown locks.
 * Non-custodial: client-side DOM interception with zero custody of player funds.
 */

import { isTouchGrassActive } from './touch-grass-timeout.js';

export const TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY = 'tiltcheck_cooldown_active_until';
export const TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY = 'tiltcheck_deposit_barrier_enabled';

export const ALERT_ID = 'tiltcheck-deposit-barrier-alert';
export const ALERT_DISMISS_MS = 4000;

export const DEPOSIT_SELECTORS: readonly string[] = [
  '[data-test="cashier-button"]',
  '[data-testid="cashier-button"]',
  '[data-test="wallet-button"]',
  '[data-testid="wallet-button"]',
  'button[data-testid="cashier-btn"]',
  '[data-testid="deposit-button"]',
  '.wallet-btn',
  'button[data-test="deposit"]',
  '[data-test="deposit-button"]',
];

const ADDITIONAL_DEPOSIT_SELECTORS: readonly string[] = [
  'a[href*="/deposit"]',
  'a[href*="/cashier"]',
  '[data-action="deposit"]',
  '[data-action="cashier"]',
];

const DEPOSIT_TEXT_REGEX = /\b(deposit|cashier|add\s+funds|buy\s+crypto|buy\s+coins|wallet|top\s+up|deposito|depósito|dépôt|einzahlen|recharger|recargar)\b/i;
const EXCLUDED_TEXT_REGEX = /\b(withdraw|withdrawal|redeem|redemption|vault|tip|send|transfer|history|statement|retirer|auszahlung|retirada)\b/i;

let inMemoryCooldownActiveUntil = 0;
let inMemoryBarrierEnabled = true;

export function getCooldownActiveUntil(): number {
  return inMemoryCooldownActiveUntil;
}

export function setInMemoryCooldownActiveUntil(timestamp: number): void {
  inMemoryCooldownActiveUntil = Math.max(0, timestamp);
}

export function setInMemoryBarrierEnabled(enabled: boolean): void {
  inMemoryBarrierEnabled = enabled;
}

export async function setCooldownActiveUntil(timestamp: number): Promise<void> {
  inMemoryCooldownActiveUntil = Math.max(0, timestamp);
  try {
    await chrome.storage.local.set({
      [TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]: inMemoryCooldownActiveUntil,
    });
  } catch {
    // Storage unavailable in test harnesses without mock
  }
}

export async function loadCooldownActiveUntil(): Promise<number> {
  try {
    const stored = await chrome.storage.local.get([
      TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY,
      TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY,
    ]);
    const val = stored[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY];
    if (typeof val === 'number' && Number.isFinite(val)) {
      inMemoryCooldownActiveUntil = Math.max(0, val);
    }
    const enabledVal = stored[TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY];
    if (typeof enabledVal === 'boolean') {
      inMemoryBarrierEnabled = enabledVal;
    }
  } catch {
    // Ignore storage failure
  }
  return inMemoryCooldownActiveUntil;
}

export function isDepositBarrierActive(now?: number): boolean {
  if (!inMemoryBarrierEnabled) {
    return false;
  }
  if (isTouchGrassActive()) {
    return true;
  }
  const currentTime = now ?? Date.now();
  return inMemoryCooldownActiveUntil > currentTime;
}

export function isDepositTarget(target: Element): boolean {
  const container = target.closest(
    'button, a, [role="button"], input[type="submit"], input[type="button"], ' +
      DEPOSIT_SELECTORS.join(', ')
  ) ?? target;

  const textContent = (
    (container.textContent ?? '') + ' ' +
    (container.getAttribute('aria-label') ?? '') + ' ' +
    (container.getAttribute('title') ?? '') + ' ' +
    (container.getAttribute('value') ?? '')
  );

  const attrContent = (
    (container.getAttribute('href') ?? '') + ' ' +
    (container.getAttribute('data-action') ?? '')
  );

  if (EXCLUDED_TEXT_REGEX.test(textContent) || EXCLUDED_TEXT_REGEX.test(attrContent)) {
    return false;
  }

  for (const selector of DEPOSIT_SELECTORS) {
    if (target.matches(selector) || target.closest(selector) !== null) {
      return true;
    }
  }

  for (const selector of ADDITIONAL_DEPOSIT_SELECTORS) {
    if (target.matches(selector) || target.closest(selector) !== null) {
      return true;
    }
  }

  if (DEPOSIT_TEXT_REGEX.test(textContent) || DEPOSIT_TEXT_REGEX.test(attrContent)) {
    return true;
  }

  return false;
}

export interface DepositBarrierHandle {
  stop: () => void;
  isActive: (now?: number) => boolean;
  getCooldownActiveUntil: () => number;
  updateCooldown: (timestamp: number) => void;
  updateEnabled: (enabled: boolean) => void;
}

export function installDepositBarrier(doc: Document = document): DepositBarrierHandle {
  void loadCooldownActiveUntil();

  let alertTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const showAlert = (message: string) => {
    let alertEl = doc.getElementById(ALERT_ID);
    if (!alertEl) {
      alertEl = doc.createElement('div');
      alertEl.id = ALERT_ID;
      alertEl.setAttribute('role', 'alert');
      alertEl.setAttribute('aria-live', 'assertive');
      alertEl.style.cssText = [
        'position: fixed',
        'top: 1.5rem',
        'left: 50%',
        'transform: translateX(-50%)',
        'z-index: 2147483647',
        'background: #0f1115',
        'border: 2px solid #ff4a4a',
        'border-radius: 6px',
        'color: #ffffff',
        'padding: 0.85rem 1.25rem',
        'font-family: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace',
        'font-size: 0.875rem',
        'font-weight: 700',
        'box-shadow: 0 4px 24px rgba(0, 0, 0, 0.85)',
        'text-align: center',
        'pointer-events: none',
        'max-width: 90vw',
        'box-sizing: border-box',
      ].join(';');
      (doc.body ?? doc.documentElement).appendChild(alertEl);
    }

    alertEl.textContent = message;

    if (alertTimeoutId !== null) {
      clearTimeout(alertTimeoutId);
      alertTimeoutId = null;
    }

    alertTimeoutId = setTimeout(() => {
      alertTimeoutId = null;
      alertEl?.remove();
    }, ALERT_DISMISS_MS);
  };

  const onClickCapture = (event: Event) => {
    if (stopped) return;

    const now = Date.now();
    if (!isDepositBarrierActive(now)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (!isDepositTarget(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const cooldownUntil = getCooldownActiveUntil();
    let message: string;

    if (cooldownUntil > now) {
      const remainingMins = Math.max(1, Math.ceil((cooldownUntil - now) / 60000));
      message = `Deposit Barrier Active: Voluntary lock engaged (${remainingMins}m remaining). Don't reload. Step away.`;
    } else {
      message = "Deposit Barrier Active: You locked the door. Don't dig the hole deeper. Wait out the timer.";
    }

    showAlert(message);
  };

  const onStorageChanged = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: string
  ) => {
    if (area !== 'local') return;
    if (TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY in changes) {
      const val = changes[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]?.newValue;
      if (typeof val === 'number' && Number.isFinite(val)) {
        inMemoryCooldownActiveUntil = Math.max(0, val);
      } else {
        inMemoryCooldownActiveUntil = 0;
      }
    }
    if (TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY in changes) {
      const val = changes[TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY]?.newValue;
      if (typeof val === 'boolean') {
        inMemoryBarrierEnabled = val;
      }
    }
  };

  try {
    chrome.storage?.onChanged?.addListener?.(onStorageChanged);
  } catch {
    // Storage listener unavailable in test harnesses without full mock
  }

  doc.addEventListener('click', onClickCapture, true);

  const stop = () => {
    stopped = true;
    doc.removeEventListener('click', onClickCapture, true);
    try {
      chrome.storage?.onChanged?.removeListener?.(onStorageChanged);
    } catch {
      // Ignore
    }
    if (alertTimeoutId !== null) {
      clearTimeout(alertTimeoutId);
      alertTimeoutId = null;
    }
    const alertEl = doc.getElementById(ALERT_ID);
    if (alertEl) {
      alertEl.remove();
    }
  };

  return {
    stop,
    isActive: (now?: number) => isDepositBarrierActive(now),
    getCooldownActiveUntil,
    updateCooldown: (timestamp: number) => {
      inMemoryCooldownActiveUntil = Math.max(0, timestamp);
    },
    updateEnabled: (enabled: boolean) => {
      inMemoryBarrierEnabled = enabled;
    },
  };
}
