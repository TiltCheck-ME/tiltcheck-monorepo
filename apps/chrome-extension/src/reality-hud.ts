/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
/**
 * reality-hud.ts
 * Reality-Grounding Wage-Hour Equivalence HUD.
 * Translates casino balance drawdowns into real-world labor hours torched.
 * Non-custodial: client-side DOM heuristic with zero custody of player funds.
 */

import { CASINO_SELECTORS } from './extractor.js';
import { triggerCashoutNavigation } from './cashout-router.js';

export const TILTCHECK_HOURLY_WAGE_KEY = 'tiltcheck_hourly_wage';
export const TILTCHECK_REALITY_HUD_ENABLED_KEY = 'tiltcheck_reality_hud_enabled';
export const TILTCHECK_REALITY_THRESHOLD_HOURS_KEY = 'tiltcheck_reality_threshold_hours';

export const DEFAULT_HOURLY_WAGE = 25;
export const MIN_HOURLY_WAGE = 5;
export const MAX_HOURLY_WAGE = 2000;

export const DEFAULT_REALITY_HUD_ENABLED = true;
export const DEFAULT_REALITY_THRESHOLD_HOURS = 2;
export const MIN_REALITY_THRESHOLD_HOURS = 0.5;
export const MAX_REALITY_THRESHOLD_HOURS = 24;

export const REALITY_HUD_ID = 'tiltcheck-reality-hud';
export const REALITY_HUD_POLL_MS = 1000;

export interface RealityHudOptions {
  hourlyWage: number;
  enabled: boolean;
  thresholdHours: number;
}

export function clampHourlyWage(val: unknown): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n)) return DEFAULT_HOURLY_WAGE;
  return Math.min(MAX_HOURLY_WAGE, Math.max(MIN_HOURLY_WAGE, Math.round(n)));
}

export function clampThresholdHours(val: unknown): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_REALITY_THRESHOLD_HOURS;
  return Math.min(MAX_REALITY_THRESHOLD_HOURS, Math.max(MIN_REALITY_THRESHOLD_HOURS, n));
}

export async function loadRealityHudOptions(): Promise<RealityHudOptions> {
  try {
    const stored = await chrome.storage.local.get([
      TILTCHECK_HOURLY_WAGE_KEY,
      TILTCHECK_REALITY_HUD_ENABLED_KEY,
      TILTCHECK_REALITY_THRESHOLD_HOURS_KEY,
    ]);
    const enabledRaw = stored[TILTCHECK_REALITY_HUD_ENABLED_KEY];
    return {
      hourlyWage: clampHourlyWage(stored[TILTCHECK_HOURLY_WAGE_KEY]),
      enabled: enabledRaw === undefined ? DEFAULT_REALITY_HUD_ENABLED : enabledRaw === true,
      thresholdHours: clampThresholdHours(stored[TILTCHECK_REALITY_THRESHOLD_HOURS_KEY]),
    };
  } catch {
    return {
      hourlyWage: DEFAULT_HOURLY_WAGE,
      enabled: DEFAULT_REALITY_HUD_ENABLED,
      thresholdHours: DEFAULT_REALITY_THRESHOLD_HOURS,
    };
  }
}

export function computeWageEquivalence(drawdown: number, hourlyWage: number): number {
  if (drawdown <= 0 || hourlyWage <= 0) {
    return 0;
  }
  return drawdown / hourlyWage;
}

export function formatRealityMessage(drawdown: number, hours: number): string {
  const absDrawdown = Math.abs(drawdown);
  if (hours >= 8) {
    return `Session Drawdown: -$${absDrawdown.toFixed(2)} (${hours.toFixed(1)} hrs of labor torched). That's a full shift gone. Step away.`;
  }
  return `Session Drawdown: -$${absDrawdown.toFixed(2)} (${hours.toFixed(1)} hrs of work torched). Step back.`;
}

export function parseMoney(text: string | null): number | null {
  if (text == null) return null;
  const tokens = text.split(/\s+/).map((token) => token.replace(/,/g, '').replace(/[^\d.-]/g, ''));
  const matches = tokens.filter((token) => /^-?\d+(\.\d+)?$/.test(token));
  if (matches.length !== 1) return null;
  return Number(matches[0]);
}

export function readBalance(doc: Document): number | null {
  const hostname = doc.location?.hostname ?? '';
  const entry = CASINO_SELECTORS.find(
    (item) => (hostname && hostname.includes(item.domain)) || item.domain === '*'
  );
  const selector = entry?.selectors?.balance;
  if (selector) {
    const elements = doc.querySelectorAll(selector);
    for (const el of elements) {
      const raw = el.getAttribute('data-value') || el.getAttribute('value') || el.textContent;
      const parsed = parseMoney(raw);
      if (parsed !== null) return parsed;
    }
  }

  const fallbackElements = doc.querySelectorAll('[data-balance], [data-test="balance"], .balance, [class*="balance-value"], [class*="balance"]');
  for (const fallback of fallbackElements) {
    const raw = fallback.getAttribute('data-value') || fallback.getAttribute('value') || fallback.textContent;
    const parsed = parseMoney(raw);
    if (parsed !== null) return parsed;
  }

  return null;
}

export interface RealityHudHandle {
  stop: () => void;
  check: (balanceOverride?: number) => void;
  getBaseline: () => number | null;
  setBaseline: (balance: number) => void;
  isVisible: () => boolean;
  dismiss: () => void;
  getOptions: () => RealityHudOptions;
  updateOptions: (newOpts: Partial<RealityHudOptions>) => void;
}

export function installRealityHud(
  doc: Document,
  options?: Partial<RealityHudOptions>
): RealityHudHandle {
  let opts: RealityHudOptions = {
    hourlyWage: clampHourlyWage(options?.hourlyWage ?? DEFAULT_HOURLY_WAGE),
    enabled: options?.enabled ?? DEFAULT_REALITY_HUD_ENABLED,
    thresholdHours: clampThresholdHours(options?.thresholdHours ?? DEFAULT_REALITY_THRESHOLD_HOURS),
  };

  let baselineBalance: number | null = null;
  let lastCurrentBalance: number | null = null;
  let dismissed = false;
  let lastDismissedDrawdown = 0;
  let stopped = false;
  let pollId: ReturnType<typeof setInterval> | null = null;

  const removeHud = () => {
    const existing = doc.getElementById(REALITY_HUD_ID);
    if (existing) {
      existing.remove();
    }
  };

  const isVisible = (): boolean => {
    const el = doc.getElementById(REALITY_HUD_ID);
    return Boolean(el && el.style.display !== 'none' && el.isConnected);
  };

  const dismiss = () => {
    dismissed = true;
    const el = doc.getElementById(REALITY_HUD_ID);
    if (el) {
      el.style.display = 'none';
    }
  };

  const renderOrUpdateHud = (drawdown: number, hours: number) => {
    let hud = doc.getElementById(REALITY_HUD_ID);
    const message = formatRealityMessage(drawdown, hours);

    if (!hud) {
      hud = doc.createElement('div');
      hud.id = REALITY_HUD_ID;
      hud.setAttribute('role', 'status');
      hud.setAttribute('aria-live', 'polite');
      hud.style.cssText = [
        'position: fixed',
        'top: 1rem',
        'left: 50%',
        'transform: translateX(-50%)',
        'z-index: 2147483646',
        'background: #0f1115',
        'border: 1px solid #ff4a4a',
        'border-radius: 6px',
        'color: #ffffff',
        'font-family: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace',
        'font-size: 0.875rem',
        'font-weight: 600',
        'padding: 0.75rem 1rem',
        'display: flex',
        'align-items: center',
        'gap: 0.75rem',
        'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7)',
        'max-width: 90vw',
        'box-sizing: border-box',
        'pointer-events: auto',
      ].join(';');

      const textSpan = doc.createElement('span');
      textSpan.className = 'tiltcheck-reality-hud-text';
      textSpan.textContent = message;

      const dismissBtn = doc.createElement('button');
      dismissBtn.type = 'button';
      dismissBtn.className = 'tiltcheck-reality-hud-dismiss';
      dismissBtn.setAttribute('aria-label', 'Dismiss reality HUD');
      dismissBtn.textContent = 'x';
      dismissBtn.style.cssText = [
        'background: transparent',
        'border: none',
        'color: #ff4a4a',
        'font-family: inherit',
        'font-size: 1rem',
        'font-weight: bold',
        'cursor: pointer',
        'padding: 0 4px',
        'line-height: 1',
      ].join(';');

      dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        lastDismissedDrawdown = drawdown;
        dismiss();
      });

      const cashoutBtn = doc.createElement('button');
      cashoutBtn.type = 'button';
      cashoutBtn.className = 'tiltcheck-reality-hud-cashout';
      cashoutBtn.setAttribute('aria-label', 'Open casino cashier');
      cashoutBtn.textContent = 'Cashier ->';
      cashoutBtn.style.cssText = [
        'background: #17c3b2',
        'border: none',
        'border-radius: 4px',
        'color: #000000',
        'font-family: inherit',
        'font-size: 0.75rem',
        'font-weight: 700',
        'cursor: pointer',
        'padding: 3px 8px',
        'text-transform: uppercase',
        'margin-left: 0.5rem',
        'white-space: nowrap',
      ].join(';');

      cashoutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerCashoutNavigation(doc);
      });

      hud.appendChild(textSpan);
      hud.appendChild(cashoutBtn);
      hud.appendChild(dismissBtn);
      (doc.body ?? doc.documentElement).appendChild(hud);
    } else {
      const textSpan = hud.querySelector('.tiltcheck-reality-hud-text');
      if (textSpan) {
        textSpan.textContent = message;
      }
      hud.style.display = 'flex';
    }
  };

  const check = (balanceOverride?: number) => {
    if (stopped || !opts.enabled) {
      removeHud();
      return;
    }

    const currentBalance = typeof balanceOverride === 'number'
      ? balanceOverride
      : (readBalance(doc) ?? lastCurrentBalance);
    if (currentBalance === null || !Number.isFinite(currentBalance)) {
      return;
    }
    lastCurrentBalance = currentBalance;

    if (baselineBalance === null) {
      baselineBalance = currentBalance;
      return;
    }

    // If player has profited above baseline, raise the high-water baseline
    if (currentBalance > baselineBalance) {
      baselineBalance = currentBalance;
      dismissed = false;
      removeHud();
      return;
    }

    const drawdown = baselineBalance - currentBalance;
    const hours = computeWageEquivalence(drawdown, opts.hourlyWage);

    if (drawdown <= 0 || hours < opts.thresholdHours) {
      removeHud();
      return;
    }

    // If dismissed, only re-emerge if drawdown escalated by at least 1 more hour of labor
    if (dismissed) {
      if (drawdown >= lastDismissedDrawdown + opts.hourlyWage) {
        dismissed = false;
      } else {
        return;
      }
    }

    renderOrUpdateHud(drawdown, hours);
  };

  const onClickCapture = () => {
    check();
  };

  doc.addEventListener('click', onClickCapture, true);
  pollId = setInterval(() => check(), REALITY_HUD_POLL_MS);

  // Initial check
  check();

  const stop = () => {
    stopped = true;
    doc.removeEventListener('click', onClickCapture, true);
    if (pollId !== null) {
      clearInterval(pollId);
      pollId = null;
    }
    removeHud();
  };

  const updateOptions = (newOpts: Partial<RealityHudOptions>) => {
    if (newOpts.hourlyWage !== undefined) {
      opts.hourlyWage = clampHourlyWage(newOpts.hourlyWage);
    }
    if (newOpts.enabled !== undefined) {
      opts.enabled = newOpts.enabled;
    }
    if (newOpts.thresholdHours !== undefined) {
      opts.thresholdHours = clampThresholdHours(newOpts.thresholdHours);
    }
    check(lastCurrentBalance ?? undefined);
  };

  return {
    stop,
    check,
    getBaseline: () => baselineBalance,
    setBaseline: (b: number) => {
      baselineBalance = b;
      dismissed = false;
      check(lastCurrentBalance ?? undefined);
    },
    isVisible,
    dismiss,
    getOptions: () => ({ ...opts }),
    updateOptions,
  };
}
