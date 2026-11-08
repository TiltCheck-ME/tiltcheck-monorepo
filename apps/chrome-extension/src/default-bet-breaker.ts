/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */
/**
 * default-bet-breaker.ts
 * Fresh-load default stake interceptor and table minimum guardian.
 *
 * Prevents "Default Stake Traps" where casinos and game providers silently reset
 * bet amounts on page load / reload to $1.00 or $2.00 (e.g., Crown Coins, LoneStar, RealPrize)
 * when table minimum is $0.10 or $0.20.
 *
 * Non-custodial: client-side DOM throttling with zero custody of player funds.
 */

import { findSpinControl } from './spin-pace-lock.js';
import { readBetAmount, parseMoney } from './streak-volatility.js';
import { playAudioCue } from './audio-alerts.js';
import { recordActivityFeedEvent } from './activity-feed.js';

export const TILTCHECK_DEFAULT_BET_BREAKER_ENABLED_KEY = 'tiltcheck_default_bet_breaker_enabled';
export const TILTCHECK_BASE_STAKE_THRESHOLD_KEY = 'tiltcheck_base_stake_threshold';

export const DEFAULT_DEFAULT_BET_BREAKER_ENABLED = true;
export const DEFAULT_BASE_STAKE_THRESHOLD = 0.50;
export const MIN_BASE_STAKE_THRESHOLD = 0.05;
export const MAX_BASE_STAKE_THRESHOLD = 100.00;

export const DEFAULT_BET_MODAL_ID = 'tiltcheck-default-bet-modal';
export const DEFAULT_BET_STYLES_ID = 'tiltcheck-default-bet-styles';

export interface DefaultBetBreakerOptions {
  enabled: boolean;
  baseStakeThreshold: number;
}

export function clampBaseStakeThreshold(val: unknown): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BASE_STAKE_THRESHOLD;
  return Math.min(MAX_BASE_STAKE_THRESHOLD, Math.max(MIN_BASE_STAKE_THRESHOLD, Math.round(n * 100) / 100));
}

export function parseBetValue(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/[$€£]?\s*(\d+(?:\.\d{1,4})?)\s*(?:SC|GC|USD)?/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function detectCurrentBetAmount(doc: Document): number | null {
  const fromExtractor = readBetAmount(doc);
  if (fromExtractor !== null && Number.isFinite(fromExtractor) && fromExtractor > 0) {
    return fromExtractor;
  }

  // Expanded heuristics for modern sweepstakes & arcade slot interfaces
  const selectors = [
    '[data-test*="bet-amount" i]',
    '[data-test*="bet" i]',
    '[data-testid*="bet" i]',
    'input[name="bet" i]',
    'input[id*="bet" i]',
    'input[data-test*="bet" i]',
    '[class*="betValue" i]',
    '[class*="bet-value" i]',
    '[class*="betAmount" i]',
    '[class*="bet-amount" i]',
    '[class*="currentBet" i]',
    '[class*="current-bet" i]',
    '[class*="totalBet" i]',
    '[class*="total-bet" i]',
    '[class*="stake" i]',
    '[aria-label*="bet" i]',
    '[aria-label*="stake" i]',
  ];

  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    if (!el) continue;

    const raw =
      (el instanceof HTMLInputElement ? el.value : null) ||
      (el instanceof HTMLSelectElement ? el.value : null) ||
      el.getAttribute('value') ||
      el.getAttribute('data-value') ||
      el.textContent;

    const parsed = parseBetValue(raw) ?? parseMoney(raw);
    if (parsed !== null && Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export function findBetDecreaseControl(doc: Document): HTMLElement | null {
  const selectors = [
    'button[data-test*="minus" i]',
    'button[data-test*="decrease" i]',
    'button[data-test*="bet-minus" i]',
    'button[data-testid*="minus" i]',
    'button[data-testid*="decrease" i]',
    'button[aria-label*="minus" i]',
    'button[aria-label*="decrease" i]',
    'button[aria-label*="down" i]',
    'button[class*="minus" i]',
    'button[class*="decrease" i]',
    'button[class*="bet-down" i]',
    'button[class*="bet-minus" i]',
    '[data-action="bet-minus"]',
    '[data-action="decrease-bet"]',
  ];

  for (const sel of selectors) {
    const btn = doc.querySelector<HTMLElement>(sel);
    if (btn && btn.offsetParent !== null) {
      return btn;
    }
  }

  // Text-based fallback: button with "-" inside a bet container
  const allButtons = Array.from(doc.querySelectorAll<HTMLElement>('button, [role="button"]'));
  for (const btn of allButtons) {
    const text = (btn.textContent || '').trim();
    if (text === '-' || text === '−') {
      return btn;
    }
  }

  return null;
}

export interface DefaultBetBreakerHandle {
  stop: () => void;
  isArmed: () => boolean;
  reset: () => void;
  updateOptions: (newOpts: Partial<DefaultBetBreakerOptions>) => void;
  getAcknowledgedStake: () => number | null;
}

export function installDefaultBetBreaker(
  doc: Document = document,
  initialOptions?: Partial<DefaultBetBreakerOptions>,
): DefaultBetBreakerHandle {
  const opts: DefaultBetBreakerOptions = {
    enabled: initialOptions?.enabled ?? DEFAULT_DEFAULT_BET_BREAKER_ENABLED,
    baseStakeThreshold: clampBaseStakeThreshold(initialOptions?.baseStakeThreshold),
  };

  let armed = true;
  let acknowledgedStake: number | null = null;
  let stopped = false;

  function ensureStyles(): void {
    if (doc.getElementById(DEFAULT_BET_STYLES_ID)) return;
    const style = doc.createElement('style');
    style.id = DEFAULT_BET_STYLES_ID;
    style.textContent = `
      #${DEFAULT_BET_MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(8, 10, 14, 0.88);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .tiltcheck-default-bet-card {
        background: #0f1319;
        border: 1px solid rgba(251, 191, 36, 0.4);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), 0 0 20px rgba(251, 191, 36, 0.15);
        border-radius: 12px;
        width: 100%;
        max-width: 440px;
        padding: 24px;
        color: #f8fafc;
        box-sizing: border-box;
      }
      .tiltcheck-default-bet-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }
      .tiltcheck-default-bet-badge {
        background: rgba(251, 191, 36, 0.15);
        border: 1px solid rgba(251, 191, 36, 0.35);
        color: #fbbf24;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .tiltcheck-default-bet-title {
        font-size: 16px;
        font-weight: 700;
        color: #ffffff;
        margin: 0;
      }
      .tiltcheck-default-bet-amount-box {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 14px;
        margin: 14px 0;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
      }
      .tiltcheck-default-bet-amount-label {
        font-size: 12px;
        color: rgba(160, 175, 190, 0.8);
      }
      .tiltcheck-default-bet-amount-val {
        font-size: 22px;
        font-weight: 800;
        color: #fbbf24;
        font-family: ui-monospace, monospace;
      }
      .tiltcheck-default-bet-desc {
        font-size: 12.5px;
        line-height: 1.5;
        color: rgba(248, 250, 252, 0.82);
        margin-bottom: 20px;
      }
      .tiltcheck-default-bet-actions {
        display: flex;
        gap: 10px;
      }
      .tiltcheck-action-primary {
        flex: 1;
        background: #17c3b2;
        color: #000000;
        border: none;
        padding: 10px 14px;
        font-size: 12.5px;
        font-weight: 700;
        border-radius: 6px;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .tiltcheck-action-primary:hover {
        opacity: 0.9;
      }
      .tiltcheck-action-ghost {
        background: rgba(255, 255, 255, 0.06);
        color: #f8fafc;
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 10px 14px;
        font-size: 12.5px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .tiltcheck-action-ghost:hover {
        background: rgba(255, 255, 255, 0.12);
      }
    `;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function hideModal(): void {
    doc.getElementById(DEFAULT_BET_MODAL_ID)?.remove();
  }

  function showModal(currentBet: number): void {
    hideModal();
    ensureStyles();

    const overlay = doc.createElement('div');
    overlay.id = DEFAULT_BET_MODAL_ID;

    const minusBtn = findBetDecreaseControl(doc);
    const dropToMinLabel = minusBtn ? 'Drop to Minimum' : 'Adjust Bet Manually';

    overlay.innerHTML = `
      <div class="tiltcheck-default-bet-card">
        <div class="tiltcheck-default-bet-header">
          <span class="tiltcheck-default-bet-badge">Default Stake Trap</span>
          <h2 class="tiltcheck-default-bet-title">Fresh Load Bet Grounding</h2>
        </div>
        <div class="tiltcheck-default-bet-amount-box">
          <span class="tiltcheck-default-bet-amount-label">Detected Reload Stake</span>
          <span class="tiltcheck-default-bet-amount-val">$${currentBet.toFixed(2)}</span>
        </div>
        <p class="tiltcheck-default-bet-desc">
          This game loaded with a default stake of <strong>$${currentBet.toFixed(2)}</strong>, which exceeds your safe threshold of <strong>$${opts.baseStakeThreshold.toFixed(2)}</strong>.
          Casinos often quietly reset bet size on page reload. Did you mean to fire at $${currentBet.toFixed(2)}?
        </p>
        <div class="tiltcheck-default-bet-actions">
          <button type="button" class="tiltcheck-action-primary" id="tiltcheck-btn-drop">${dropToMinLabel}</button>
          <button type="button" class="tiltcheck-action-ghost" id="tiltcheck-btn-confirm">Confirm $${currentBet.toFixed(2)}</button>
        </div>
      </div>
    `;

    (doc.body || doc.documentElement).appendChild(overlay);

    const btnDrop = overlay.querySelector<HTMLButtonElement>('#tiltcheck-btn-drop');
    const btnConfirm = overlay.querySelector<HTMLButtonElement>('#tiltcheck-btn-confirm');

    btnConfirm?.addEventListener('click', (e) => {
      e.stopPropagation();
      acknowledgedStake = currentBet;
      armed = false;
      hideModal();
      void recordActivityFeedEvent(`Default stake confirmed: player authorized $${currentBet.toFixed(2)} spin`, 'info');
    });

    btnDrop?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideModal();

      const decBtn = findBetDecreaseControl(doc);
      if (decBtn) {
        // Step down towards floor
        let clicks = 0;
        const maxClicks = 25;
        const intervalId = setInterval(() => {
          clicks++;
          decBtn.click();
          const updated = detectCurrentBetAmount(doc);
          if (clicks >= maxClicks || (updated !== null && updated <= opts.baseStakeThreshold)) {
            clearInterval(intervalId);
            if (updated !== null && updated <= opts.baseStakeThreshold) {
              armed = false;
              void recordActivityFeedEvent(`Default bet reduced to $${updated.toFixed(2)} (within base threshold)`, 'info');
            }
          }
        }, 60);
      } else {
        void recordActivityFeedEvent('Default bet alert acknowledged: adjusting stake manually', 'info');
      }
    });
  }

  function onDocumentClick(event: Event): void {
    if (stopped || !opts.enabled) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(`#${DEFAULT_BET_MODAL_ID}`)) return;

    // Check if clicked element is a spin or bet trigger
    const spin = findSpinControl(target);
    if (!spin) {
      // If user clicked something else (e.g. game's own minus button), check if bet dropped below threshold
      setTimeout(() => {
        if (!stopped && armed) {
          const liveBet = detectCurrentBetAmount(doc);
          if (liveBet !== null && liveBet <= opts.baseStakeThreshold) {
            armed = false;
          }
        }
      }, 150);
      return;
    }

    if (!armed) return;

    const bet = detectCurrentBetAmount(doc);
    if (bet !== null && bet > opts.baseStakeThreshold) {
      if (acknowledgedStake === bet) {
        // Player explicitly confirmed this exact bet for this session
        armed = false;
        return;
      }

      // Hard intercept the spin click!
      event.preventDefault();
      event.stopPropagation();
      playAudioCue('loss_chase');
      showModal(bet);
      void recordActivityFeedEvent(
        `Default bet alert: game loaded at $${bet.toFixed(2)} (base threshold: $${opts.baseStakeThreshold.toFixed(2)})`,
        'warn',
      );
    } else if (bet !== null && bet <= opts.baseStakeThreshold) {
      // The bet is already at or below safe base threshold: allow spin and disarm
      armed = false;
    }
  }

  doc.addEventListener('click', onDocumentClick, true);

  const onNavigation = () => {
    armed = true;
    acknowledgedStake = null;
    hideModal();
  };

  window.addEventListener('popstate', onNavigation);
  window.addEventListener('hashchange', onNavigation);

  return {
    stop: () => {
      stopped = true;
      doc.removeEventListener('click', onDocumentClick, true);
      window.removeEventListener('popstate', onNavigation);
      window.removeEventListener('hashchange', onNavigation);
      hideModal();
      doc.getElementById(DEFAULT_BET_STYLES_ID)?.remove();
    },
    isArmed: () => armed,
    reset: () => {
      armed = true;
      acknowledgedStake = null;
      hideModal();
    },
    updateOptions: (newOpts: Partial<DefaultBetBreakerOptions>) => {
      if (newOpts.enabled !== undefined) opts.enabled = newOpts.enabled;
      if (newOpts.baseStakeThreshold !== undefined) {
        opts.baseStakeThreshold = clampBaseStakeThreshold(newOpts.baseStakeThreshold);
      }
    },
    getAcknowledgedStake: () => acknowledgedStake,
  };
}
