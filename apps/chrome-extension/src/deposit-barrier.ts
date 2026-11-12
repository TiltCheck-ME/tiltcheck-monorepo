/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */
/**
 * deposit-barrier.ts
 * DOM Deposit Barrier.
 * Intercepts cashier/deposit clicks during Touch Grass timeouts or voluntary cooldown locks.
 * Non-custodial: client-side DOM interception with zero custody of player funds.
 */

import { isTouchGrassActive } from './touch-grass-timeout.js';
import { detectCashoutTarget } from './cashout-router.js';

export const TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY = 'tiltcheck_cooldown_active_until';
export const TILTCHECK_COOLDOWN_WALLET_KEY = 'tiltcheck_cooldown_wallet';
export const TILTCHECK_COOLDOWN_SOURCE_KEY = 'tiltcheck_cooldown_source';
export const TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY = 'tiltcheck_deposit_barrier_enabled';

export const ALERT_ID = 'tiltcheck-deposit-barrier-alert';
export const ALERT_DISMISS_MS = 4000;

export const COOLDOWN_HUD_ID = 'tiltcheck-cooldown-hud';

export function formatCooldownRemaining(diffSecs: number): string {
  if (diffSecs <= 0) return '0s';
  const days = Math.floor(diffSecs / 86400);
  const hours = Math.floor((diffSecs % 86400) / 3600);
  const mins = Math.floor((diffSecs % 3600) / 60);
  const secs = Math.floor(diffSecs % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${mins}m left`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s left`;
  }
  return `${mins}m ${secs}s left`;
}


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
let inMemoryCooldownSource: string | null = null;
let inMemoryBarrierEnabled = true;

export function getCooldownActiveUntil(): number {
  return inMemoryCooldownActiveUntil;
}

export function getCooldownSource(): string | null {
  return inMemoryCooldownSource;
}

export function setInMemoryCooldownActiveUntil(timestamp: number): void {
  inMemoryCooldownActiveUntil = Math.max(0, timestamp);
}

export function setInMemoryCooldownSource(source: string | null): void {
  inMemoryCooldownSource = source;
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
      TILTCHECK_COOLDOWN_SOURCE_KEY,
      TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY,
    ]);
    const val = stored[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY];
    if (typeof val === 'number' && Number.isFinite(val)) {
      inMemoryCooldownActiveUntil = Math.max(0, val);
    }
    const sourceVal = stored[TILTCHECK_COOLDOWN_SOURCE_KEY];
    if (typeof sourceVal === 'string' && sourceVal.length > 0) {
      inMemoryCooldownSource = sourceVal;
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
  const currentTime = now ?? Date.now();
  // A running "Take a break" lock can't be switched off early: it ignores the
  // deposit-block setting and the extension on/off switch until it ends.
  if (inMemoryCooldownActiveUntil > currentTime) {
    return true;
  }
  if (!inMemoryBarrierEnabled) {
    return false;
  }
  return isTouchGrassActive();
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
  getCooldownSource: () => string | null;
  updateCooldown: (timestamp: number, source?: string | null) => void;
  updateEnabled: (enabled: boolean) => void;
  isHudVisible: () => boolean;
}

export function installDepositBarrier(doc: Document = document): DepositBarrierHandle {
  void loadCooldownActiveUntil().then(() => { renderOrUpdateCooldownHud(); });

  let alertTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let hudIntervalId: ReturnType<typeof setInterval> | null = null;
  let isHudMinimized = false;
  let stopped = false;

  const removeCooldownHud = () => {
    if (hudIntervalId !== null) {
      clearInterval(hudIntervalId);
      hudIntervalId = null;
    }
    const hudEl = doc.getElementById(COOLDOWN_HUD_ID);
    if (hudEl) {
      hudEl.remove();
    }
  };

  const renderOrUpdateCooldownHud = () => {
    if (stopped) {
      removeCooldownHud();
      return;
    }

    const now = Date.now();
    const cooldownUntil = getCooldownActiveUntil();

    if (cooldownUntil <= now) {
      removeCooldownHud();
      return;
    }

    const diffSecs = Math.max(0, Math.floor((cooldownUntil - now) / 1000));
    if (diffSecs === 0) {
      removeCooldownHud();
      return;
    }

    let hudEl = doc.getElementById(COOLDOWN_HUD_ID);
    if (!hudEl) {
      hudEl = doc.createElement('div');
      hudEl.id = COOLDOWN_HUD_ID;
      hudEl.setAttribute('role', 'region');
      hudEl.setAttribute('aria-label', 'TiltCheck On-Chain Cooldown HUD');
      hudEl.style.cssText = [
        'position: fixed',
        'bottom: 1.25rem',
        'left: 1.25rem',
        'z-index: 2147483640',
        'background: rgba(15, 17, 21, 0.96)',
        'border: 1px solid #17c3b2',
        'border-radius: 8px',
        'padding: 10px 14px',
        'font-family: ui-monospace, SF Mono, Menlo, Consolas, monospace',
        'color: #ffffff',
        'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.75), 0 0 10px rgba(23, 195, 178, 0.2)',
        'min-width: 240px',
        'max-width: 320px',
        'box-sizing: border-box',
        'backdrop-filter: blur(8px)',
        'transition: all 0.2s ease',
      ].join(';');

      (doc.body ?? doc.documentElement).appendChild(hudEl);
    }

    const isAutoTilt = inMemoryCooldownSource === 'auto_tilt';
    if (isHudMinimized) {
      hudEl.style.padding = '6px 10px';
      hudEl.style.minWidth = 'auto';
      hudEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="font-size: 11px; font-weight: 700; color: ${isAutoTilt ? '#ff4a4a' : '#17c3b2'};">${isAutoTilt ? 'TILT LOCK' : 'LOCK'}: ${formatCooldownRemaining(diffSecs)}</span>
          <button type="button" class="tiltcheck-cooldown-toggle" style="background: transparent; border: none; color: #94a3b8; font-family: inherit; font-size: 12px; cursor: pointer; padding: 0 2px;">+</button>
        </div>
      `;
      const expandBtn = hudEl.querySelector('.tiltcheck-cooldown-toggle');
      expandBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        isHudMinimized = false;
        renderOrUpdateCooldownHud();
      });
    } else {
      hudEl.style.padding = '10px 14px';
      hudEl.style.minWidth = '240px';
      let hudCashierUrl: string | null = null;
      try {
        if (typeof doc?.querySelector === 'function') {
          hudCashierUrl = detectCashoutTarget(doc).cashierUrl;
        }
      } catch {
        // Safe fallback
      }

      hudEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 10px; font-weight: 800; color: ${isAutoTilt ? '#ff4a4a' : '#17c3b2'}; text-transform: uppercase; letter-spacing: 0.05em;">${isAutoTilt ? 'Tilt Break Active' : 'Vault Lock Active'}</span>
          <button type="button" class="tiltcheck-cooldown-toggle" style="background: transparent; border: none; color: #94a3b8; font-family: inherit; font-size: 14px; cursor: pointer; line-height: 1; padding: 0 2px;" title="Minimize">-</button>
        </div>
        <div class="cooldown-timer-val" style="font-size: 1.15rem; font-weight: 800; color: #ffffff; margin: 2px 0 4px 0;">
          ${formatCooldownRemaining(diffSecs)}
        </div>
        <div style="font-size: 10px; color: ${isAutoTilt ? '#fca5a5' : '#94a3b8'}; margin-bottom: 8px; line-height: 1.3;">
          ${isAutoTilt ? 'Level 3+ Tilt Lockout (Cashier Blocked)' : 'Deposit Barrier Engaged (Cashier Blocked)'}
        </div>
        <div style="display: flex; gap: 10px; align-items: center; font-size: 10px; flex-wrap: wrap;">
          ${hudCashierUrl ? `<a href="${hudCashierUrl}" style="color: #17c3b2; text-decoration: underline; font-weight: 700;">Cash Out &rarr;</a>` : ''}
          <a href="https://tiltcheck.me/cooldown" target="_blank" rel="noopener noreferrer" style="color: ${isAutoTilt ? '#ff4a4a' : '#17c3b2'}; text-decoration: underline; font-weight: 600;">${isAutoTilt ? 'Confirm On-Chain &rarr;' : 'Verify PDA &rarr;'}</a>
          <a href="https://tiltcheck.me/cooldown?extend=7" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline; font-weight: 600;">Extend +7d &rarr;</a>
        </div>
      `;
      const minimizeBtn = hudEl.querySelector('.tiltcheck-cooldown-toggle');
      minimizeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        isHudMinimized = true;
        renderOrUpdateCooldownHud();
      });
    }

    if (hudIntervalId === null) {
      hudIntervalId = setInterval(() => {
        renderOrUpdateCooldownHud();
      }, 1000);
    }
  };

  const showAlert = (message: string, withdrawUrl?: string | null) => {
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
        'pointer-events: auto',
        'max-width: 90vw',
        'box-sizing: border-box',
      ].join(';');
      (doc.body ?? doc.documentElement).appendChild(alertEl);
    }

    if (withdrawUrl) {
      alertEl.innerHTML = `
        <div style="margin-bottom: 6px;">${message}</div>
        <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: center; align-items: center;">
          <a href="${withdrawUrl}" style="background: #17c3b2; color: #06080b; padding: 5px 12px; border-radius: 4px; font-weight: 800; font-size: 11px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">Cash Out / Withdraw &rarr;</a>
        </div>
      `;
    } else {
      alertEl.textContent = message;
    }

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

    let cashierWithdrawUrl: string | null = null;
    try {
      if (typeof doc?.querySelector === 'function') {
        cashierWithdrawUrl = detectCashoutTarget(doc).cashierUrl;
      }
    } catch {
      // Safe fallback
    }

    // Stake wallet handling: Clicking the header "Wallet" button shouldn't dead-end the player.
    // Automatically route into the withdrawal/redemption modal so players can always cash out.
    const host = doc.location?.hostname ?? '';
    const isStake = /stake\.(com|us|bet|games)/i.test(host);
    const isWalletHeaderBtn = target.closest('[data-test="wallet-button"]') ||
                              target.closest('[data-testid="wallet-button"]') ||
                              target.closest('.wallet-btn');

    if (isStake && isWalletHeaderBtn) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const isStakeUs = /stake\.us/i.test(host);
      const withdrawUrl = isStakeUs
        ? 'https://stake.us/?modal=wallet&tab=redeem'
        : 'https://stake.com/?modal=wallet&tab=withdraw';

      if (doc.location) {
        if (typeof doc.location.assign === 'function') {
          doc.location.assign(withdrawUrl);
        } else {
          doc.location.href = withdrawUrl;
        }
      }
      showAlert('Deposit Barrier Active: Deposits blocked during cooldown. Directing to Cashier / Withdraw.', withdrawUrl);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const cooldownUntil = getCooldownActiveUntil();
    let message: string;

    if (cooldownUntil > now) {
      const remainingMins = Math.max(1, Math.ceil((cooldownUntil - now) / 60000));
      if (inMemoryCooldownSource === 'auto_tilt') {
        message = `Deposit Barrier Active: you took the tilt break (${remainingMins}m left). It ends when it ends.`;
      } else {
        message = `Deposit Barrier Active: Voluntary lock engaged (${remainingMins}m remaining). Don't reload. Step away.`;
      }
    } else {
      message = "Deposit Barrier Active: You locked the door. Don't dig the hole deeper. Wait out the timer.";
    }

    showAlert(message, cashierWithdrawUrl);
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
      renderOrUpdateCooldownHud();
    }
    if (TILTCHECK_COOLDOWN_SOURCE_KEY in changes) {
      const val = changes[TILTCHECK_COOLDOWN_SOURCE_KEY]?.newValue;
      inMemoryCooldownSource = typeof val === 'string' && val.length > 0 ? val : null;
      renderOrUpdateCooldownHud();
    }
    if (TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY in changes) {
      const val = changes[TILTCHECK_DEPOSIT_BARRIER_ENABLED_KEY]?.newValue;
      if (typeof val === 'boolean') {
        inMemoryBarrierEnabled = val;
        renderOrUpdateCooldownHud();
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
    removeCooldownHud();
    const alertEl = doc.getElementById(ALERT_ID);
    if (alertEl) {
      alertEl.remove();
    }
  };

  return {
    stop,
    isActive: (now?: number) => isDepositBarrierActive(now),
    getCooldownActiveUntil,
    getCooldownSource: () => inMemoryCooldownSource,
    updateCooldown: (timestamp: number, source?: string | null) => {
      inMemoryCooldownActiveUntil = Math.max(0, timestamp);
      if (source !== undefined) {
        inMemoryCooldownSource = source;
      }
      renderOrUpdateCooldownHud();
    },
    updateEnabled: (enabled: boolean) => {
      inMemoryBarrierEnabled = enabled;
      renderOrUpdateCooldownHud();
    },
    isHudVisible: () => doc.getElementById(COOLDOWN_HUD_ID) !== null,
  };
}
