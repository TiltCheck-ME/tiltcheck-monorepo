/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */

/**
 * streak-volatility.ts
 * Session Win-Streak & Cold-Run Volatility Tracker.
 *
 * Monitors consecutive outcomes, dead-spin runs, and heater streaks in real time.
 * Detects statistical anomalies and the Gambler's Fallacy ("I'm Due") chase trap,
 * warning players before they escalate stakes into prolonged cold streaks.
 *
 * Non-custodial: client-side DOM telemetry with zero custody of player funds.
 */

import { readBalance } from './reality-hud.js';
import { triggerCashoutNavigation } from './cashout-router.js';
import { CASINO_SELECTORS } from './extractor.js';
import { playAudioCue } from './audio-alerts.js';
import { findSpinControl } from './spin-pace-lock.js';
import { recordActivityFeedEvent } from './activity-feed.js';

export const STREAK_SPIN_SELECTOR = [
  'button[data-test="spin-button"]',
  'button.spin-button',
  'button[aria-label="Spin"]',
  'button[class*="SpinButton"]',
  'button[class*="play-button"]',
  'button[data-testid="play-button"]',
  'button[data-testid="spin-button"]',
  'button[class*="bet-button"]',
  'button[data-test="bet-button"]',
  '.game-controls button',
  '#spin-button',
  '.play-btn',
  '.spin-btn',
  'button[class*="bet"]',
  'button[class*="spin"]',
  '[data-action="bet"]',
  '[data-action="spin"]',
].join(', ');

export type StreakType = 'COLD' | 'HOT' | 'NEUTRAL';
export type StreakAlertLevel = 'NORMAL' | 'WARN_COLD' | 'CRITICAL_COLD' | 'HEATER_ALERT';

export interface StreakVolatilityState {
  currentStreakType: StreakType;
  consecutiveDeadSpins: number;
  maxDeadSpins: number;
  consecutiveWins: number;
  maxWinStreak: number;
  totalSpins: number;
  winCount: number;
  lossCount: number;
  hitRate: number; // e.g. 24.5%
  isDueTrapActive: boolean;
  stakeEscalatedDuringCold: boolean;
  streakAlertLevel: StreakAlertLevel;
  alertMessage: string;
  lastBetAmount: number | null;
  lastUpdated: number;
}

export const TILTCHECK_STREAK_VOLATILITY_KEY = 'tiltcheck_streak_volatility_state';

export const DEAD_SPIN_WARN_THRESHOLD = 10;
export const DEAD_SPIN_CRITICAL_THRESHOLD = 18;
export const WIN_STREAK_ALERT_THRESHOLD = 4;
export const DUE_TRAP_MIN_DEAD_SPINS = 6;

export const DEFAULT_STREAK_VOLATILITY_STATE: StreakVolatilityState = {
  currentStreakType: 'NEUTRAL',
  consecutiveDeadSpins: 0,
  maxDeadSpins: 0,
  consecutiveWins: 0,
  maxWinStreak: 0,
  totalSpins: 0,
  winCount: 0,
  lossCount: 0,
  hitRate: 0,
  isDueTrapActive: false,
  stakeEscalatedDuringCold: false,
  streakAlertLevel: 'NORMAL',
  alertMessage: 'Pacing steady. Volatility telemetry active.',
  lastBetAmount: null,
  lastUpdated: 0,
};

export function parseMoney(text: string | null): number | null {
  if (text == null) return null;
  const tokens = text.split(/\s+/).map((token) => token.replace(/,/g, '').replace(/[^\d.-]/g, ''));
  const matches = tokens.filter((token) => /^-?\d+(\.\d+)?$/.test(token));
  if (matches.length !== 1) return null;
  return Number(matches[0]);
}

export function readBetAmount(doc: Document): number | null {
  const hostname = doc.location?.hostname || '';
  const entry = CASINO_SELECTORS.find((item) => (hostname && hostname.includes(item.domain)) || item.domain === '*');
  const selector = entry?.selectors?.betAmount;
  if (!selector) return null;
  const element = doc.querySelector(selector);
  if (!element) return null;
  const raw = element.getAttribute('data-value') || element.getAttribute('value') || element.textContent;
  return parseMoney(raw);
}

export function recordSpinOutcome(
  state: StreakVolatilityState,
  currentBet: number | null,
  prevBalance: number | null,
  nextBalance: number | null,
  timestamp = Date.now(),
): StreakVolatilityState {
  if (prevBalance === null || nextBalance === null) {
    return {
      ...state,
      lastBetAmount: currentBet ?? state.lastBetAmount,
      lastUpdated: timestamp,
    };
  }

  const balanceDelta = Math.round((nextBalance - prevBalance) * 100) / 100;
  let {
    consecutiveDeadSpins,
    maxDeadSpins,
    consecutiveWins,
    maxWinStreak,
    totalSpins,
    winCount,
    lossCount,
    currentStreakType,
    isDueTrapActive,
    stakeEscalatedDuringCold,
  } = state;

  totalSpins++;

  if (balanceDelta > 0.001) {
    // Win hit
    consecutiveWins++;
    consecutiveDeadSpins = 0;
    currentStreakType = 'HOT';
    maxWinStreak = Math.max(maxWinStreak, consecutiveWins);
    winCount++;
    isDueTrapActive = false;
  } else if (balanceDelta < -0.001) {
    // Dead spin / loss
    consecutiveDeadSpins++;
    consecutiveWins = 0;
    currentStreakType = 'COLD';
    maxDeadSpins = Math.max(maxDeadSpins, consecutiveDeadSpins);
    lossCount++;

    // Check for "I'm Due" trap (stake raised while on a cold streak >= 6 spins)
    if (
      consecutiveDeadSpins >= DUE_TRAP_MIN_DEAD_SPINS &&
      currentBet !== null &&
      state.lastBetAmount !== null &&
      currentBet > state.lastBetAmount * 1.15
    ) {
      isDueTrapActive = true;
      stakeEscalatedDuringCold = true;
    }
  }

  const hitRate = totalSpins > 0 ? Math.round((winCount / totalSpins) * 1000) / 10 : 0;

  // Determine alert level & spotter message
  let streakAlertLevel: StreakAlertLevel = 'NORMAL';
  let alertMessage = 'Pacing steady. Volatility telemetry normal.';

  if (isDueTrapActive) {
    streakAlertLevel = 'CRITICAL_COLD';
    alertMessage = `Gambler's Fallacy Trap: ${consecutiveDeadSpins} dead spins and stake raised. The next spin is NOT "due". Volatility has no memory. Step back.`;
  } else if (consecutiveDeadSpins >= DEAD_SPIN_CRITICAL_THRESHOLD) {
    streakAlertLevel = 'CRITICAL_COLD';
    alertMessage = `Extreme Cold Run: ${consecutiveDeadSpins} dead spins without a payout. Outlier volatility active. Consider stopping.`;
  } else if (consecutiveDeadSpins >= DEAD_SPIN_WARN_THRESHOLD) {
    streakAlertLevel = 'WARN_COLD';
    alertMessage = `Cold Streak: ${consecutiveDeadSpins} consecutive dead spins. Hit rate down to ${hitRate}%. Do not chase.`;
  } else if (consecutiveWins >= WIN_STREAK_ALERT_THRESHOLD) {
    streakAlertLevel = 'HEATER_ALERT';
    alertMessage = `Heater Detected: ${consecutiveWins} consecutive wins. Skim profit before volatility reverses.`;
  }

  return {
    currentStreakType,
    consecutiveDeadSpins,
    maxDeadSpins,
    consecutiveWins,
    maxWinStreak,
    totalSpins,
    winCount,
    lossCount,
    hitRate,
    isDueTrapActive,
    stakeEscalatedDuringCold,
    streakAlertLevel,
    alertMessage,
    lastBetAmount: currentBet ?? state.lastBetAmount,
    lastUpdated: timestamp,
  };
}

export function resetStreakVolatility(timestamp = Date.now()): StreakVolatilityState {
  return {
    ...DEFAULT_STREAK_VOLATILITY_STATE,
    alertMessage: 'Streak tracker reset. Fresh volatility session.',
    lastUpdated: timestamp,
  };
}

/**
 * Dispatches relevant acoustic cues when streak volatility thresholds are breached.
 */
export function dispatchStreakAudioCue(
  prevState: StreakVolatilityState,
  nextState: StreakVolatilityState,
): void {
  if (
    (nextState.isDueTrapActive && !prevState.isDueTrapActive) ||
    (nextState.streakAlertLevel === 'CRITICAL_COLD' && prevState.streakAlertLevel !== 'CRITICAL_COLD')
  ) {
    playAudioCue('due_trap');
    return;
  }

  if (
    nextState.streakAlertLevel === 'HEATER_ALERT' &&
    prevState.streakAlertLevel !== 'HEATER_ALERT'
  ) {
    playAudioCue('heater_alert');
    return;
  }

  if (
    nextState.streakAlertLevel === 'WARN_COLD' &&
    prevState.streakAlertLevel !== 'WARN_COLD'
  ) {
    playAudioCue('cold_warn');
    return;
  }
}

export interface StreakVolatilityHandle {
  getState: () => StreakVolatilityState;
  reset: () => StreakVolatilityState;
  recordOutcome: (currentBet: number | null, prevBalance: number | null, nextBalance: number | null) => StreakVolatilityState;
  stop: () => void;
}

const STREAK_BADGE_ID = 'tiltcheck-streak-badge';
const STREAK_TOAST_ID = 'tiltcheck-streak-toast';
const STREAK_STYLES_ID = 'tiltcheck-streak-styles';

function ensureStreakStyles(doc: Document): void {
  if (doc.getElementById(STREAK_STYLES_ID)) return;
  const style = doc.createElement('style');
  style.id = STREAK_STYLES_ID;
  style.textContent = `
    #${STREAK_BADGE_ID} {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 2147483640;
      background: #0f1115;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      padding: 6px 10px;
      color: #ffffff;
      font-family: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      gap: 6px;
      pointer-events: auto;
      transition: all 0.2s ease;
    }
    #${STREAK_BADGE_ID}.badge-cold {
      border-color: #f97316;
      color: #f97316;
      background: rgba(249, 115, 22, 0.1);
    }
    #${STREAK_BADGE_ID}.badge-trap {
      border-color: #ef4444;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
      animation: tiltcheck-streak-pulse 1s infinite alternate;
    }
    #${STREAK_BADGE_ID}.badge-hot {
      border-color: #17c3b2;
      color: #17c3b2;
      background: rgba(23, 195, 178, 0.1);
    }
    @keyframes tiltcheck-streak-pulse {
      from { transform: scale(1); }
      to { transform: scale(1.04); }
    }
    #${STREAK_TOAST_ID} {
      position: fixed;
      top: 5rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483645;
      background: #0d1117;
      border: 1px solid #ef4444;
      border-radius: 8px;
      padding: 12px 16px;
      color: #ffffff;
      font-family: ui-monospace, "Cascadia Code", monospace;
      font-size: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 90vw;
      width: 420px;
      box-sizing: border-box;
      pointer-events: auto;
    }
    .tiltcheck-streak-toast-text {
      flex: 1;
      line-height: 1.4;
      font-weight: 600;
    }
    .tiltcheck-streak-toast-cashier {
      background: #17c3b2;
      color: #000000;
      border: none;
      border-radius: 4px;
      font-weight: 800;
      font-size: 11px;
      padding: 6px 10px;
      cursor: pointer;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .tiltcheck-streak-toast-dismiss {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      font-size: 14px;
      padding: 2px 6px;
    }
    .tiltcheck-streak-toast-dismiss:hover {
      color: #ffffff;
    }
  `;
  (doc.head || doc.documentElement).appendChild(style);
}

export function installStreakVolatilityTracker(
  doc: Document = document,
): StreakVolatilityHandle {
  ensureStreakStyles(doc);

  let state: StreakVolatilityState = { ...DEFAULT_STREAK_VOLATILITY_STATE };
  let lastKnownBalance: number | null = readBalance(doc);
  let stopped = false;
  let toastDismissed = false;

  // Hydrate from storage if available
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get([TILTCHECK_STREAK_VOLATILITY_KEY], (res) => {
      const saved = res[TILTCHECK_STREAK_VOLATILITY_KEY] as StreakVolatilityState | undefined;
      if (saved && typeof saved.consecutiveDeadSpins === 'number') {
        state = saved;
        updateDomBadge();
      }
    });
  }

  const persist = () => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [TILTCHECK_STREAK_VOLATILITY_KEY]: state });
    }
  };

  const updateDomBadge = () => {
    if (stopped) return;
    let badge = doc.getElementById(STREAK_BADGE_ID);
    if (!badge) {
      badge = doc.createElement('div');
      badge.id = STREAK_BADGE_ID;
      (doc.body || doc.documentElement).appendChild(badge);
    }

    if (state.isDueTrapActive) {
      badge.className = 'badge-trap';
      badge.textContent = `FALLACY TRAP: ${state.consecutiveDeadSpins} DEAD SPINS (STAKE UP)`;
    } else if (state.consecutiveDeadSpins >= DEAD_SPIN_WARN_THRESHOLD) {
      badge.className = 'badge-cold';
      badge.textContent = `COLD: ${state.consecutiveDeadSpins} DEAD SPINS (${state.hitRate}% HIT)`;
    } else if (state.consecutiveWins >= WIN_STREAK_ALERT_THRESHOLD) {
      badge.className = 'badge-hot';
      badge.textContent = `HEATER: ${state.consecutiveWins} WINS IN A ROW`;
    } else if (state.totalSpins > 0) {
      badge.className = '';
      badge.textContent = `SPINS: ${state.totalSpins} | HIT: ${state.hitRate}%`;
    } else {
      badge.className = '';
      badge.textContent = 'VOLATILITY TRACKER ACTIVE';
    }

    // Handle toast alert for critical streaks / fallacy trap
    const shouldShowToast =
      (state.streakAlertLevel === 'CRITICAL_COLD' || state.isDueTrapActive) &&
      !toastDismissed;

    let toast = doc.getElementById(STREAK_TOAST_ID);
    if (shouldShowToast) {
      if (!toast) {
        toast = doc.createElement('div');
        toast.id = STREAK_TOAST_ID;

        const textEl = doc.createElement('span');
        textEl.className = 'tiltcheck-streak-toast-text';
        textEl.textContent = state.alertMessage;

        const cashierBtn = doc.createElement('button');
        cashierBtn.type = 'button';
        cashierBtn.className = 'tiltcheck-streak-toast-cashier';
        cashierBtn.textContent = 'Cashier ->';
        cashierBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          triggerCashoutNavigation(doc);
        });

        const dismissBtn = doc.createElement('button');
        dismissBtn.type = 'button';
        dismissBtn.className = 'tiltcheck-streak-toast-dismiss';
        dismissBtn.textContent = 'x';
        dismissBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toastDismissed = true;
          toast?.remove();
        });

        toast.appendChild(textEl);
        toast.appendChild(cashierBtn);
        toast.appendChild(dismissBtn);
        (doc.body || doc.documentElement).appendChild(toast);
      } else {
        const textEl = toast.querySelector('.tiltcheck-streak-toast-text');
        if (textEl) textEl.textContent = state.alertMessage;
      }
    } else if (toast) {
      toast.remove();
    }
  };

  const handleSpinClick = () => {
    if (stopped) return;
    const currentBet = readBetAmount(doc);
    const balanceBefore = lastKnownBalance ?? readBalance(doc);

    // Settle balance check after spin result resolves
    setTimeout(() => {
      if (stopped) return;
      const balanceAfter = readBalance(doc);
      if (balanceAfter !== null && Number.isFinite(balanceAfter)) {
        const prevState = state;
        state = recordSpinOutcome(state, currentBet, balanceBefore, balanceAfter);
        dispatchStreakAudioCue(prevState, state);
        if (state.consecutiveDeadSpins === DEAD_SPIN_WARN_THRESHOLD && prevState.consecutiveDeadSpins < DEAD_SPIN_WARN_THRESHOLD) {
          void recordActivityFeedEvent(`Cold streak: ${state.consecutiveDeadSpins} dead spins reached`, 'warn');
        } else if (state.isDueTrapActive && !prevState.isDueTrapActive) {
          void recordActivityFeedEvent(`Fallacy trap: ${state.consecutiveDeadSpins} dead spins with stake escalated`, 'danger');
        } else if (state.consecutiveWins === WIN_STREAK_ALERT_THRESHOLD && prevState.consecutiveWins < WIN_STREAK_ALERT_THRESHOLD) {
          void recordActivityFeedEvent(`Heater alert: ${state.consecutiveWins} consecutive wins`, 'info');
        }
        lastKnownBalance = balanceAfter;
        persist();
        updateDomBadge();
      }
    }, 1200);
  };

  const onDocClick = (e: MouseEvent) => {
    const target = e.target;
    if (target instanceof Element && (findSpinControl(target) || target.closest(STREAK_SPIN_SELECTOR))) {
      handleSpinClick();
    }
  };

  doc.addEventListener('click', onDocClick, true);
  updateDomBadge();

  return {
    getState: () => state,
    reset: () => {
      state = resetStreakVolatility();
      toastDismissed = false;
      persist();
      updateDomBadge();
      return state;
    },
    recordOutcome: (currentBet: number | null, prevBalance: number | null, nextBalance: number | null) => {
      if (stopped) return state;
      const prevState = state;
      state = recordSpinOutcome(state, currentBet, prevBalance, nextBalance);
      dispatchStreakAudioCue(prevState, state);
      if (nextBalance !== null) lastKnownBalance = nextBalance;
      persist();
      updateDomBadge();
      return state;
    },
    stop: () => {
      stopped = true;
      doc.removeEventListener('click', onDocClick, true);
      doc.getElementById(STREAK_BADGE_ID)?.remove();
      doc.getElementById(STREAK_TOAST_ID)?.remove();
      doc.getElementById(STREAK_STYLES_ID)?.remove();
    },
  };
}
