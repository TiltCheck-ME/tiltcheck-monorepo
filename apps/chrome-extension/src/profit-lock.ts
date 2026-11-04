/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
/**
 * profit-lock.ts
 * Profit-Lock & Step-Ladder Ratchet with Reality Cashout Goals.
 *
 * 1. Ratchet Floor:
 *    When session balance reaches peak profit above baseline, locks in a trailing
 *    floor (default: 50% of peak profit). If balance falls back to the floor,
 *    triggers an escalating 2-stage intervention:
 *    - Stage 1: Soft Warning modal prompting player to secure profit at cashier.
 *    - Stage 2: Hard Guard cooldown if soft warning is ignored and further spins occur.
 *
 * 2. Reality Cashout Goals:
 *    Ties casino chips to real-world tangible goods and utility bills (e.g. power bill $250,
 *    groceries $120, tank of gas $50, trash bags $14, Spotify $11).
 *    Fires non-intrusive reality-anchoring HUD toasts when balance thresholds are reached.
 *
 * Non-custodial: client-side DOM heuristic with zero custody of player funds.
 */

import { readBalance } from './reality-hud.js';
import { triggerTouchGrassTimeout } from './touch-grass-timeout.js';
import { triggerCashoutNavigation } from './cashout-router.js';

export const TILTCHECK_PROFIT_LOCK_ENABLED_KEY = 'tiltcheck_profit_lock_enabled';
export const TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY = 'tiltcheck_profit_lock_trailing_percent';
export const TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY = 'tiltcheck_profit_lock_min_profit';
export const TILTCHECK_CASHOUT_GOALS_ENABLED_KEY = 'tiltcheck_cashout_goals_enabled';
export const TILTCHECK_CASHOUT_GOALS_KEY = 'tiltcheck_cashout_goals';

export const DEFAULT_PROFIT_LOCK_ENABLED = true;
export const DEFAULT_TRAILING_PERCENT = 50; // 50% of peak profit locked
export const DEFAULT_MIN_PROFIT = 50; // $50 profit minimum before ratchet arms
export const DEFAULT_CASHOUT_GOALS_ENABLED = true;
export const DEFAULT_HARD_GUARD_COOLDOWN_MS = 60_000;

export const PROFIT_LOCK_MODAL_ID = 'tiltcheck-profit-lock-modal';
export const GOAL_TOAST_CONTAINER_ID = 'tiltcheck-goals-toast-container';
export const PROFIT_LOCK_STYLES_ID = 'tiltcheck-profit-lock-styles';

export type GoalMetric = 'balance' | 'profit';

export interface CashoutGoal {
  id: string;
  name: string;
  targetAmount: number;
  linkUrl?: string;
  metric: GoalMetric;
  enabled: boolean;
}

export const DEFAULT_CASHOUT_GOALS: readonly CashoutGoal[] = [
  {
    id: 'spotify',
    name: 'Spotify Premium (1 Mo)',
    targetAmount: 11,
    linkUrl: 'https://www.spotify.com',
    metric: 'balance',
    enabled: true,
  },
  {
    id: 'trash_bags',
    name: 'Trash Bags & Essentials',
    targetAmount: 15,
    linkUrl: 'https://www.amazon.com',
    metric: 'balance',
    enabled: true,
  },
  {
    id: 'gas_tank',
    name: 'Full Tank of Gas',
    targetAmount: 50,
    linkUrl: '',
    metric: 'balance',
    enabled: true,
  },
  {
    id: 'power_bill',
    name: 'Power Bill',
    targetAmount: 250,
    linkUrl: '',
    metric: 'balance',
    enabled: true,
  },
  {
    id: 'rent_car',
    name: 'Rent / Car Payment',
    targetAmount: 600,
    linkUrl: '',
    metric: 'profit',
    enabled: true,
  },
];

export interface ProfitLockOptions {
  profitLockEnabled: boolean;
  trailingPercent: number;
  minProfit: number;
  goalsEnabled: boolean;
  goals: CashoutGoal[];
  hardGuardCooldownMs: number;
}

export interface ProfitLockSessionState {
  baselineBalance: number | null;
  peakBalance: number;
  currentFloor: number | null;
  softWarningActive: boolean;
  softWarningAcknowledged: boolean;
  hardGuardTriggered: boolean;
  unlockedGoalIds: Set<string>;
}

export function computeRatchetFloor(
  baseline: number,
  peak: number,
  trailingPercent: number,
  minProfit: number
): number | null {
  if (peak <= baseline) return null;
  const profit = peak - baseline;
  if (profit < minProfit) return null;
  const pct = Math.min(95, Math.max(10, trailingPercent));
  const lockedProfit = profit * (pct / 100);
  return Math.round((baseline + lockedProfit) * 100) / 100;
}

export function isGoalUnlocked(
  goal: CashoutGoal,
  currentBalance: number,
  baselineBalance: number | null
): boolean {
  if (!goal.enabled || goal.targetAmount <= 0) return false;
  if (goal.metric === 'profit') {
    if (baselineBalance === null) return false;
    return currentBalance - baselineBalance >= goal.targetAmount;
  }
  return currentBalance >= goal.targetAmount;
}

export function sanitizeCashoutGoals(raw: unknown): CashoutGoal[] {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_CASHOUT_GOALS];
  }
  const result: CashoutGoal[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    const id = typeof obj['id'] === 'string' && obj['id'].trim() ? obj['id'].trim() : `goal_${Date.now()}_${Math.random()}`;
    const name = typeof obj['name'] === 'string' && obj['name'].trim() ? obj['name'].trim() : 'Unnamed Goal';
    const targetAmount = typeof obj['targetAmount'] === 'number' && Number.isFinite(obj['targetAmount']) ? Math.max(1, obj['targetAmount']) : 10;
    const linkUrl = typeof obj['linkUrl'] === 'string' ? obj['linkUrl'].trim() : '';
    const metric: GoalMetric = obj['metric'] === 'profit' ? 'profit' : 'balance';
    const enabled = typeof obj['enabled'] === 'boolean' ? obj['enabled'] : true;
    result.push({ id, name, targetAmount, linkUrl, metric, enabled });
  }
  return result.length > 0 ? result : [...DEFAULT_CASHOUT_GOALS];
}

export async function loadProfitLockOptions(): Promise<ProfitLockOptions> {
  try {
    const stored = await chrome.storage.local.get([
      TILTCHECK_PROFIT_LOCK_ENABLED_KEY,
      TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY,
      TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY,
      TILTCHECK_CASHOUT_GOALS_ENABLED_KEY,
      TILTCHECK_CASHOUT_GOALS_KEY,
    ]);

    const profitLockOpt = stored[TILTCHECK_PROFIT_LOCK_ENABLED_KEY];
    const profitLockEnabled = profitLockOpt === undefined ? DEFAULT_PROFIT_LOCK_ENABLED : profitLockOpt === true;

    const trailingPercentRaw = stored[TILTCHECK_PROFIT_LOCK_TRAILING_PERCENT_KEY];
    const trailingPercent = typeof trailingPercentRaw === 'number' && Number.isFinite(trailingPercentRaw)
      ? Math.min(90, Math.max(10, trailingPercentRaw))
      : DEFAULT_TRAILING_PERCENT;

    const minProfitRaw = stored[TILTCHECK_PROFIT_LOCK_MIN_PROFIT_KEY];
    const minProfit = typeof minProfitRaw === 'number' && Number.isFinite(minProfitRaw)
      ? Math.max(10, minProfitRaw)
      : DEFAULT_MIN_PROFIT;

    const goalsOpt = stored[TILTCHECK_CASHOUT_GOALS_ENABLED_KEY];
    const goalsEnabled = goalsOpt === undefined ? DEFAULT_CASHOUT_GOALS_ENABLED : goalsOpt === true;

    const rawGoals = stored[TILTCHECK_CASHOUT_GOALS_KEY];
    const goals = sanitizeCashoutGoals(rawGoals);

    return {
      profitLockEnabled,
      trailingPercent,
      minProfit,
      goalsEnabled,
      goals,
      hardGuardCooldownMs: DEFAULT_HARD_GUARD_COOLDOWN_MS,
    };
  } catch {
    return {
      profitLockEnabled: DEFAULT_PROFIT_LOCK_ENABLED,
      trailingPercent: DEFAULT_TRAILING_PERCENT,
      minProfit: DEFAULT_MIN_PROFIT,
      goalsEnabled: DEFAULT_CASHOUT_GOALS_ENABLED,
      goals: [...DEFAULT_CASHOUT_GOALS],
      hardGuardCooldownMs: DEFAULT_HARD_GUARD_COOLDOWN_MS,
    };
  }
}

function ensureStyles(doc: Document): void {
  if (doc.getElementById(PROFIT_LOCK_STYLES_ID)) return;
  const style = doc.createElement('style');
  style.id = PROFIT_LOCK_STYLES_ID;
  style.textContent = `
    #${GOAL_TOAST_CONTAINER_ID} {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483645;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .tiltcheck-goal-toast {
      pointer-events: auto;
      background: #080a0e;
      border: 1px solid #17c3b2;
      border-left: 4px solid #17c3b2;
      border-radius: 8px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(23, 195, 178, 0.2);
      padding: 14px 16px;
      width: 320px;
      color: #ffffff;
      animation: tiltcheck-toast-slide 0.25s ease-out;
    }
    @keyframes tiltcheck-toast-slide {
      from { transform: translateX(40px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .tiltcheck-toast-tag {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #17c3b2;
      margin-bottom: 4px;
    }
    .tiltcheck-toast-title {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .tiltcheck-toast-desc {
      font-size: 12px;
      color: rgba(160, 175, 190, 0.9);
      line-height: 1.4;
      margin-bottom: 10px;
    }
    .tiltcheck-toast-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .tiltcheck-toast-btn-primary {
      background: #17c3b2;
      color: #000000;
      font-weight: 700;
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 4px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .tiltcheck-toast-btn-primary:hover {
      background: #1ae5d1;
    }
    .tiltcheck-toast-btn-subtle {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.7);
      font-size: 11px;
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      cursor: pointer;
    }
    .tiltcheck-toast-btn-subtle:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.16);
    }
    #${PROFIT_LOCK_MODAL_ID} {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(8, 10, 14, 0.88);
      backdrop-filter: blur(8px);
      z-index: 2147483646;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .tiltcheck-modal-card {
      background: #0d1117;
      border: 1px solid #fbbf24;
      border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(251, 191, 36, 0.2);
      width: 90%;
      max-width: 440px;
      padding: 24px;
      color: #ffffff;
      text-align: center;
      animation: tiltcheck-modal-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes tiltcheck-modal-pop {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .tiltcheck-modal-tag {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #fbbf24;
      margin-bottom: 8px;
    }
    .tiltcheck-modal-title {
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 10px;
      color: #ffffff;
    }
    .tiltcheck-modal-stats {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 12px;
      margin: 16px 0;
      display: flex;
      justify-content: space-around;
      font-size: 12px;
    }
    .tiltcheck-stat-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .tiltcheck-stat-label {
      color: rgba(160, 175, 190, 0.8);
      font-size: 10px;
      text-transform: uppercase;
    }
    .tiltcheck-stat-val {
      font-weight: 700;
      font-size: 14px;
      font-family: 'JetBrains Mono', monospace;
    }
    .tiltcheck-modal-body {
      font-size: 13px;
      color: rgba(200, 210, 220, 0.9);
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .tiltcheck-modal-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .tiltcheck-modal-btn-cashout {
      background: #17c3b2;
      color: #000000;
      font-weight: 800;
      font-size: 14px;
      padding: 12px 20px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .tiltcheck-modal-btn-cashout:hover {
      background: #1ae5d1;
    }
    .tiltcheck-modal-btn-ack {
      background: transparent;
      color: rgba(160, 175, 190, 0.7);
      font-size: 12px;
      padding: 8px;
      border: none;
      cursor: pointer;
    }
    .tiltcheck-modal-btn-ack:hover {
      color: #ffffff;
      text-decoration: underline;
    }
  `;
  (doc.head || doc.documentElement).appendChild(style);
}

function showGoalToast(doc: Document, goal: CashoutGoal, balance: number): void {
  ensureStyles(doc);
  let container = doc.getElementById(GOAL_TOAST_CONTAINER_ID);
  if (!container) {
    container = doc.createElement('div');
    container.id = GOAL_TOAST_CONTAINER_ID;
    (doc.body || doc.documentElement).appendChild(container);
  }

  const toast = doc.createElement('div');
  toast.className = 'tiltcheck-goal-toast';
  toast.setAttribute('data-goal-id', goal.id);

  const metricLabel = goal.metric === 'profit' ? 'Profit Goal Funded' : 'Cashout Goal Unlocked';
  const actionButtonHtml = goal.linkUrl
    ? `<a href="${goal.linkUrl}" target="_blank" rel="noopener noreferrer" class="tiltcheck-toast-btn-primary">Pay / Buy Now (${goal.targetAmount}) &rarr;</a>`
    : `<button type="button" class="tiltcheck-toast-btn-primary tiltcheck-goal-cashout-btn">Lock In Profit &rarr;</button>`;

  toast.innerHTML = `
    <div class="tiltcheck-toast-tag">${metricLabel}</div>
    <div class="tiltcheck-toast-title">${goal.name} ($${goal.targetAmount.toFixed(2)})</div>
    <div class="tiltcheck-toast-desc">Current balance is $${balance.toFixed(2)}. Turn electronic casino chips into real-world peace of mind.</div>
    <div class="tiltcheck-toast-actions">
      ${actionButtonHtml}
      <button type="button" class="tiltcheck-toast-btn-subtle tiltcheck-goal-dismiss-btn">Dismiss</button>
    </div>
  `;

  const dismissBtn = toast.querySelector('.tiltcheck-goal-dismiss-btn');
  dismissBtn?.addEventListener('click', () => {
    toast.remove();
  });

  const cashoutBtn = toast.querySelector('.tiltcheck-goal-cashout-btn');
  cashoutBtn?.addEventListener('click', () => {
    toast.remove();
    navigateToCashier(doc);
  });

  container.appendChild(toast);

  // Auto fade after 10 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 10_000);
}

function navigateToCashier(doc: Document): void {
  triggerCashoutNavigation(doc);
}

export function showSoftWarningModal(
  doc: Document,
  data: {
    baseline: number;
    peak: number;
    floor: number;
    current: number;
    onAcknowledge: () => void;
    onCashout: () => void;
  }
): void {
  ensureStyles(doc);
  if (doc.getElementById(PROFIT_LOCK_MODAL_ID)) return;

  const modal = doc.createElement('div');
  modal.id = PROFIT_LOCK_MODAL_ID;

  const profitMade = data.current - data.baseline;
  const profitText = profitMade >= 0 ? `+$${profitMade.toFixed(2)}` : `-$${Math.abs(profitMade).toFixed(2)}`;

  modal.innerHTML = `
    <div class="tiltcheck-modal-card">
      <div class="tiltcheck-modal-tag">Profit-Lock Intervention</div>
      <div class="tiltcheck-modal-title">Ratchet Floor Touched</div>
      <div class="tiltcheck-modal-stats">
        <div class="tiltcheck-stat-item">
          <span class="tiltcheck-stat-label">Initial</span>
          <span class="tiltcheck-stat-val">$${data.baseline.toFixed(2)}</span>
        </div>
        <div class="tiltcheck-stat-item">
          <span class="tiltcheck-stat-label">Session Peak</span>
          <span class="tiltcheck-stat-val" style="color:#17c3b2;">$${data.peak.toFixed(2)}</span>
        </div>
        <div class="tiltcheck-stat-item">
          <span class="tiltcheck-stat-label">Ratchet Floor</span>
          <span class="tiltcheck-stat-val" style="color:#fbbf24;">$${data.floor.toFixed(2)}</span>
        </div>
        <div class="tiltcheck-stat-item">
          <span class="tiltcheck-stat-label">Current</span>
          <span class="tiltcheck-stat-val">${profitText}</span>
        </div>
      </div>
      <div class="tiltcheck-modal-body">
        You ran your balance up to <strong>$${data.peak.toFixed(2)}</strong>. You have hit your protected floor at <strong>$${data.floor.toFixed(2)}</strong>.
        Cash out now while you are still ahead. If you continue spinning below this floor, a 60-second hard brake will be engaged.
      </div>
      <div class="tiltcheck-modal-actions">
        <button type="button" class="tiltcheck-modal-btn-cashout" id="tiltcheck-modal-cashout-btn">Cash Out at Cashier &rarr;</button>
        <button type="button" class="tiltcheck-modal-btn-ack" id="tiltcheck-modal-ack-btn">I acknowledge the risk (Next spin arms Hard Guard)</button>
      </div>
    </div>
  `;

  modal.querySelector('#tiltcheck-modal-cashout-btn')?.addEventListener('click', () => {
    modal.remove();
    data.onCashout();
    navigateToCashier(doc);
  });

  modal.querySelector('#tiltcheck-modal-ack-btn')?.addEventListener('click', () => {
    modal.remove();
    data.onAcknowledge();
  });

  (doc.body || doc.documentElement).appendChild(modal);
}

export interface ProfitLockHandle {
  stop: () => void;
  check: (balanceOverride?: number) => void;
  getBaseline: () => number | null;
  getPeak: () => number;
  getFloor: () => number | null;
  isSoftWarningActive: () => boolean;
  isHardGuardTriggered: () => boolean;
  getOptions: () => ProfitLockOptions;
  updateOptions: (newOpts: Partial<ProfitLockOptions>) => void;
}

export function installProfitLock(
  doc: Document,
  initialOptions?: Partial<ProfitLockOptions>
): ProfitLockHandle {
  let opts: ProfitLockOptions = {
    profitLockEnabled: initialOptions?.profitLockEnabled ?? DEFAULT_PROFIT_LOCK_ENABLED,
    trailingPercent: initialOptions?.trailingPercent ?? DEFAULT_TRAILING_PERCENT,
    minProfit: initialOptions?.minProfit ?? DEFAULT_MIN_PROFIT,
    goalsEnabled: initialOptions?.goalsEnabled ?? DEFAULT_CASHOUT_GOALS_ENABLED,
    goals: initialOptions?.goals ? sanitizeCashoutGoals(initialOptions.goals) : [...DEFAULT_CASHOUT_GOALS],
    hardGuardCooldownMs: initialOptions?.hardGuardCooldownMs ?? DEFAULT_HARD_GUARD_COOLDOWN_MS,
  };

  let baselineBalance: number | null = null;
  let peakBalance = 0;
  let currentFloor: number | null = null;
  let softWarningAcknowledged = false;
  let hardGuardTriggered = false;
  let stopped = false;
  const unlockedGoalIds = new Set<string>();

  function evaluate(current: number): void {
    if (stopped || current < 0) return;

    if (baselineBalance === null) {
      baselineBalance = current;
      peakBalance = current;
      return;
    }

    if (current > peakBalance) {
      peakBalance = current;
      // If balance increased back above floor, reset acknowledgment so new floor protects higher peak
      if (currentFloor !== null && current > currentFloor) {
        softWarningAcknowledged = false;
      }
    }

    // 1. Evaluate Reality Cashout Goals
    if (opts.goalsEnabled) {
      for (const goal of opts.goals) {
        if (!unlockedGoalIds.has(goal.id) && isGoalUnlocked(goal, current, baselineBalance)) {
          unlockedGoalIds.add(goal.id);
          showGoalToast(doc, goal, current);
        }
      }
    }

    // 2. Evaluate Ratchet Floor
    if (opts.profitLockEnabled) {
      const calculatedFloor = computeRatchetFloor(
        baselineBalance,
        peakBalance,
        opts.trailingPercent,
        opts.minProfit
      );
      currentFloor = calculatedFloor;

      if (currentFloor !== null && current <= currentFloor) {
        if (!softWarningAcknowledged) {
          // Stage 1: Soft Warning Modal
          showSoftWarningModal(doc, {
            baseline: baselineBalance,
            peak: peakBalance,
            floor: currentFloor,
            current,
            onAcknowledge: () => {
              softWarningAcknowledged = true;
            },
            onCashout: () => {
              softWarningAcknowledged = true;
            },
          });
        } else if (!hardGuardTriggered) {
          // Stage 2: Hard Guard if warning unacted upon and player is still at/below floor
          hardGuardTriggered = true;
          triggerTouchGrassTimeout(
            `Profit-Lock Hard Guard: You reached a peak of $${peakBalance.toFixed(2)} with a floor at $${currentFloor.toFixed(2)}. 60-second brake engaged so you don't rage-dump your profit. Step back and cash out.`,
            opts.hardGuardCooldownMs
          );
        }
      }
    }
  }

  function check(balanceOverride?: number): void {
    if (stopped) return;
    const balance = balanceOverride !== undefined ? balanceOverride : readBalance(doc);
    if (balance !== null) {
      evaluate(balance);
    }
  }

  // Intercept spin button clicks to enforce hard guard if below floor after acknowledgment
  const onSpinClickCapture = (_e: Event) => {
    if (stopped || !opts.profitLockEnabled || currentFloor === null || !softWarningAcknowledged) {
      return;
    }
    const current = readBalance(doc);
    if (current !== null && current <= currentFloor && !hardGuardTriggered) {
      hardGuardTriggered = true;
      triggerTouchGrassTimeout(
        `Profit-Lock Hard Guard: Floor touched at $${currentFloor.toFixed(2)}. 60-second brake engaged so you don't burn your profit.`,
        opts.hardGuardCooldownMs
      );
    }
  };

  doc.addEventListener('click', onSpinClickCapture, true);

  const pollInterval = setInterval(() => {
    check();
  }, 1000);

  return {
    stop: () => {
      stopped = true;
      clearInterval(pollInterval);
      doc.removeEventListener('click', onSpinClickCapture, true);
      doc.getElementById(PROFIT_LOCK_MODAL_ID)?.remove();
      doc.getElementById(GOAL_TOAST_CONTAINER_ID)?.remove();
      doc.getElementById(PROFIT_LOCK_STYLES_ID)?.remove();
    },
    check,
    getBaseline: () => baselineBalance,
    getPeak: () => peakBalance,
    getFloor: () => currentFloor,
    isSoftWarningActive: () => doc.getElementById(PROFIT_LOCK_MODAL_ID) !== null,
    isHardGuardTriggered: () => hardGuardTriggered,
    getOptions: () => ({ ...opts }),
    updateOptions: (newOpts: Partial<ProfitLockOptions>) => {
      Object.assign(opts, newOpts);
      if (newOpts.goals) {
        opts.goals = sanitizeCashoutGoals(newOpts.goals);
      }
    },
  };
}
