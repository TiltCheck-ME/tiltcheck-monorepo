/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */
/**
 * bonus-tracker.ts
 * Bonus Playthrough & Wager Traps Tracker.
 *
 * Tracks promotional bonus wagering requirements in real time directly on casino frontends:
 * 1. Rollover Progress Bar: Tracks cumulative wagering towards the playthrough target.
 * 2. Max-Bet Trap Alarm: Detects when a stake exceeds the promotional terms (e.g. $5.00 limit)
 *    and optionally intercepts the bet button before bonus winnings are confiscated by the operator.
 * 3. 100% Completion Alert: Alerts the player the moment rollover hits 100% so they can cash out
 *    withdrawable real cash before losing it back to the house.
 *
 * Non-custodial: client-side DOM observation with zero custody of player funds.
 */

import { CASINO_SELECTORS } from './extractor.js';
import { SPIN_CONTROL_SELECTOR } from './spin-pace-lock.js';
import { readBalance } from './reality-hud.js';
import { triggerTouchGrassTimeout } from './touch-grass-timeout.js';
import { BELOW_MINIMUM_BREAK_MS, evaluateCashoutGate, getCashoutGateCopy } from './cashout-minimums.js';

export const TILTCHECK_BONUS_TRACKER_CONFIG_KEY = 'tiltcheck_bonus_tracker_config';

export const BONUS_HUD_ID = 'tiltcheck-bonus-hud';
export const BONUS_TRAP_ALARM_ID = 'tiltcheck-bonus-trap-alarm';
export const BONUS_COMPLETE_MODAL_ID = 'tiltcheck-bonus-complete-modal';
export const BONUS_STYLES_ID = 'tiltcheck-bonus-tracker-styles';

export interface BonusTrackerConfig {
  active: boolean;
  bonusName: string;
  targetWager: number;
  currentWagered: number;
  maxBetLimit: number;
  blockExceededBets: boolean;
}

export const DEFAULT_BONUS_TRACKER_CONFIG: BonusTrackerConfig = {
  active: false,
  bonusName: 'Deposit Bonus',
  targetWager: 1000,
  currentWagered: 0,
  maxBetLimit: 5,
  blockExceededBets: true,
};

export interface BonusProgress {
  percent: number;
  remaining: number;
  isComplete: boolean;
}

export function parseMoney(text: string | null): number | null {
  if (text == null) return null;
  const tokens = text.split(/\s+/).map((token) => token.replace(/,/g, '').replace(/[^\d.-]/g, ''));
  const matches = tokens.filter((token) => /^-?\d+(\.\d+)?$/.test(token));
  if (matches.length !== 1) return null;
  const n = Number(matches[0]);
  return Number.isFinite(n) ? n : null;
}

export function calculateBonusProgress(currentWagered: number, targetWager: number): BonusProgress {
  if (targetWager <= 0) {
    return { percent: 100, remaining: 0, isComplete: true };
  }
  const safeWagered = Math.max(0, currentWagered);
  const percent = Math.min(100, Math.round((safeWagered / targetWager) * 1000) / 10);
  const remaining = Math.max(0, Math.round((targetWager - safeWagered) * 100) / 100);
  const isComplete = safeWagered >= targetWager;
  return { percent, remaining, isComplete };
}

export function calculateTargetWager(deposit: number, bonus: number, rolloverMultiplier: number): number {
  const safeDeposit = Math.max(0, deposit);
  const safeBonus = Math.max(0, bonus);
  const safeMult = Math.max(1, rolloverMultiplier);
  return Math.round((safeDeposit + safeBonus) * safeMult * 100) / 100;
}

export function isBetExceedingMax(bet: number, maxBet: number): boolean {
  if (maxBet <= 0 || bet <= 0) return false;
  return bet > maxBet;
}

export function sanitizeBonusConfig(raw: unknown): BonusTrackerConfig {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_BONUS_TRACKER_CONFIG };
  }
  const obj = raw as Record<string, unknown>;
  const active = typeof obj['active'] === 'boolean' ? obj['active'] : DEFAULT_BONUS_TRACKER_CONFIG.active;
  const bonusName = typeof obj['bonusName'] === 'string' && obj['bonusName'].trim() ? obj['bonusName'].trim() : DEFAULT_BONUS_TRACKER_CONFIG.bonusName;
  const targetWager = typeof obj['targetWager'] === 'number' && Number.isFinite(obj['targetWager']) ? Math.max(0, obj['targetWager']) : DEFAULT_BONUS_TRACKER_CONFIG.targetWager;
  const currentWagered = typeof obj['currentWagered'] === 'number' && Number.isFinite(obj['currentWagered']) ? Math.max(0, obj['currentWagered']) : 0;
  const maxBetLimit = typeof obj['maxBetLimit'] === 'number' && Number.isFinite(obj['maxBetLimit']) ? Math.max(0, obj['maxBetLimit']) : DEFAULT_BONUS_TRACKER_CONFIG.maxBetLimit;
  const blockExceededBets = typeof obj['blockExceededBets'] === 'boolean' ? obj['blockExceededBets'] : true;

  return { active, bonusName, targetWager, currentWagered, maxBetLimit, blockExceededBets };
}

export async function loadBonusTrackerConfig(): Promise<BonusTrackerConfig> {
  try {
    const stored = await chrome.storage.local.get([TILTCHECK_BONUS_TRACKER_CONFIG_KEY]);
    return sanitizeBonusConfig(stored[TILTCHECK_BONUS_TRACKER_CONFIG_KEY]);
  } catch {
    return { ...DEFAULT_BONUS_TRACKER_CONFIG };
  }
}

export async function saveBonusTrackerConfig(config: BonusTrackerConfig): Promise<void> {
  try {
    await chrome.storage.local.set({
      [TILTCHECK_BONUS_TRACKER_CONFIG_KEY]: sanitizeBonusConfig(config),
    });
  } catch {
    // Storage unavailable in test harnesses without mock
  }
}

export function readBetAmount(doc: Document): number | null {
  const hostname = doc.location?.hostname ?? '';
  const entry = CASINO_SELECTORS.find(
    (item) => (hostname && hostname.includes(item.domain)) || item.domain === '*'
  );
  const selector = entry?.selectors?.betAmount;
  if (selector) {
    const el = doc.querySelector(selector);
    if (el) {
      const val = (el as HTMLInputElement).value || el.getAttribute('data-value') || el.textContent;
      const parsed = parseMoney(val);
      if (parsed !== null && parsed > 0) return parsed;
    }
  }

  const genericSelectors = [
    '[data-test*="bet-amount"]',
    '[data-testid*="bet-amount"]',
    'input[name*="bet"]',
    'input[class*="bet"]',
    '.bet-amount',
    '.stake-amount',
    '[class*="betAmount"]',
    '[class*="stakeAmount"]',
  ];

  for (const sel of genericSelectors) {
    const el = doc.querySelector(sel);
    if (el) {
      const val = (el as HTMLInputElement).value || el.getAttribute('data-value') || el.textContent;
      const parsed = parseMoney(val);
      if (parsed !== null && parsed > 0) return parsed;
    }
  }

  return null;
}

function ensureStyles(doc: Document): void {
  if (doc.getElementById(BONUS_STYLES_ID)) return;
  const style = doc.createElement('style');
  style.id = BONUS_STYLES_ID;
  style.textContent = `
    #${BONUS_HUD_ID} {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 2147483644;
      background: #080a0e;
      border: 1px solid #17c3b2;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
      padding: 10px 14px;
      color: #ffffff;
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-width: 250px;
      user-select: none;
    }
    .tiltcheck-bonus-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .tiltcheck-bonus-name {
      color: #17c3b2;
    }
    .tiltcheck-bonus-pct {
      font-family: 'JetBrains Mono', monospace;
      color: #ffffff;
    }
    .tiltcheck-bonus-bar-bg {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      height: 6px;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .tiltcheck-bonus-bar-fill {
      background: #17c3b2;
      height: 100%;
      transition: width 0.3s ease;
    }
    .tiltcheck-bonus-footer {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: rgba(160, 175, 190, 0.85);
      font-family: 'JetBrains Mono', monospace;
    }
    .tiltcheck-bonus-maxbet {
      color: #fbbf24;
      font-weight: 700;
    }
    #${BONUS_TRAP_ALARM_ID} {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: #140507;
      border: 2px solid #ff003c;
      border-radius: 8px;
      box-shadow: 0 12px 40px rgba(255, 0, 60, 0.4);
      padding: 14px 20px;
      color: #ffffff;
      font-family: 'Space Grotesk', sans-serif;
      max-width: 440px;
      text-align: center;
      animation: tiltcheck-trap-shake 0.3s ease-in-out;
    }
    @keyframes tiltcheck-trap-shake {
      0%, 100% { transform: translateX(-50%); }
      20%, 60% { transform: translateX(calc(-50% - 6px)); }
      40%, 80% { transform: translateX(calc(-50% + 6px)); }
    }
    .tiltcheck-trap-tag {
      color: #ff003c;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .tiltcheck-trap-title {
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .tiltcheck-trap-body {
      font-size: 12px;
      color: rgba(230, 230, 230, 0.9);
      line-height: 1.4;
      margin-bottom: 10px;
    }
    .tiltcheck-trap-btn {
      background: #ff003c;
      color: #ffffff;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
    }
    #${BONUS_COMPLETE_MODAL_ID} {
      position: fixed;
      inset: 0;
      background: rgba(8, 10, 14, 0.9);
      backdrop-filter: blur(8px);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Space Grotesk', sans-serif;
    }
    .tiltcheck-complete-card {
      background: #0d1117;
      border: 2px solid #17c3b2;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(23, 195, 178, 0.3);
      padding: 28px;
      width: 90%;
      max-width: 440px;
      text-align: center;
      color: #ffffff;
    }
  `;
  (doc.head || doc.documentElement).appendChild(style);
}

function showMaxBetTrapAlarm(doc: Document, bet: number, maxBet: number, intercepted: boolean): void {
  ensureStyles(doc);
  doc.getElementById(BONUS_TRAP_ALARM_ID)?.remove();

  const alarm = doc.createElement('div');
  alarm.id = BONUS_TRAP_ALARM_ID;

  const interceptMsg = intercepted
    ? 'Bet intercepted and blocked before firing.'
    : 'Warning: Exceeding max bet voids all bonus winnings.';

  alarm.innerHTML = `
    <div class="tiltcheck-trap-tag">Bonus Trap Alert</div>
    <div class="tiltcheck-trap-title">Stake Exceeds Max Bet Limit</div>
    <div class="tiltcheck-trap-body">
      Current bet: <strong>$${bet.toFixed(2)}</strong>. Promotional terms cap bets at <strong>$${maxBet.toFixed(2)}</strong>.<br/>
      ${interceptMsg}
    </div>
    <button type="button" class="tiltcheck-trap-btn" id="tiltcheck-trap-dismiss">Lower My Bet</button>
  `;

  alarm.querySelector('#tiltcheck-trap-dismiss')?.addEventListener('click', () => {
    alarm.remove();
  });

  (doc.body || doc.documentElement).appendChild(alarm);

  setTimeout(() => {
    alarm.remove();
  }, 6000);
}

export function showBonusCompleteModal(
  doc: Document,
  totalWagered: number,
  onCashout: () => void,
  balanceOverride?: number | null,
  hostnameOverride?: string,
): void {
  ensureStyles(doc);
  if (doc.getElementById(BONUS_COMPLETE_MODAL_ID)) return;

  const modal = doc.createElement('div');
  modal.id = BONUS_COMPLETE_MODAL_ID;

  const balance = balanceOverride !== undefined ? balanceOverride : readBalance(doc);
  const gate = evaluateCashoutGate(hostnameOverride ?? doc.location?.hostname ?? '', balance);
  const gateCopy = getCashoutGateCopy(gate);
  modal.setAttribute('data-cashout-gate', gate.status);
  const bodyText = gateCopy
    ? `You have completed <strong>$${totalWagered.toFixed(2)}</strong> in wagering, so the rollover is done. ${gateCopy.body}`
    : `You have successfully completed <strong>$${totalWagered.toFixed(2)}</strong> in wagering. Your balance is now 100% withdrawable with zero rollover locks. Stop spinning and cash out.`;
  const primaryIsBreak = gateCopy?.action === 'break';
  const primaryLabel = gateCopy
    ? (primaryIsBreak ? gateCopy.actionLabel : `${gateCopy.actionLabel} &rarr;`)
    : 'Go to Cashier &rarr;';
  const dismissLabel = gateCopy ? 'Dismiss' : "Dismiss (I'll cash out later)";

  modal.innerHTML = `
    <div class="tiltcheck-complete-card">
      <div style="font-size:11px; font-weight:800; letter-spacing:0.1em; color:#17c3b2; text-transform:uppercase; margin-bottom:8px;">Rollover 100% Complete</div>
      <div style="font-size:22px; font-weight:800; margin-bottom:12px;">Bonus Cleared to Real Cash</div>
      <div style="font-size:13px; color:rgba(200, 210, 220, 0.9); line-height:1.5; margin-bottom:20px;">
        ${bodyText}
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button type="button" id="tiltcheck-bonus-cashout-btn" style="background:#17c3b2; color:#000; font-weight:800; font-size:14px; padding:12px 20px; border-radius:6px; border:none; cursor:pointer; text-transform:uppercase;">${primaryLabel}</button>
        <button type="button" id="tiltcheck-bonus-dismiss-btn" style="background:transparent; color:rgba(160, 175, 190, 0.7); font-size:12px; border:none; cursor:pointer;">${dismissLabel}</button>
      </div>
    </div>
  `;

  modal.querySelector('#tiltcheck-bonus-cashout-btn')?.addEventListener('click', () => {
    modal.remove();
    onCashout();
    if (primaryIsBreak) {
      triggerTouchGrassTimeout("Five-minute break. Your balance is under this site's cash-out minimum.", BELOW_MINIMUM_BREAK_MS);
      return;
    }
    const cashier = doc.querySelector('a[href*="cashier"], a[href*="wallet"], button[data-test*="cashier"]') as HTMLElement | null;
    cashier?.click();
  });

  modal.querySelector('#tiltcheck-bonus-dismiss-btn')?.addEventListener('click', () => {
    modal.remove();
  });

  (doc.body || doc.documentElement).appendChild(modal);
}

export interface BonusTrackerHandle {
  stop: () => void;
  recordBet: (betAmountOverride?: number) => void;
  getProgress: () => BonusProgress;
  getConfig: () => BonusTrackerConfig;
  updateConfig: (newConfig: Partial<BonusTrackerConfig>) => void;
  resetProgress: () => void;
}

export function installBonusTracker(
  doc: Document,
  initialConfig?: Partial<BonusTrackerConfig>,
  onUpdate?: (config: BonusTrackerConfig) => void
): BonusTrackerHandle {
  let config: BonusTrackerConfig = {
    ...DEFAULT_BONUS_TRACKER_CONFIG,
    ...initialConfig,
  };

  let stopped = false;
  let completionModalShown = false;

  function renderHud(): void {
    if (stopped || !config.active) {
      doc.getElementById(BONUS_HUD_ID)?.remove();
      return;
    }

    ensureStyles(doc);
    let hud = doc.getElementById(BONUS_HUD_ID);
    if (!hud) {
      hud = doc.createElement('div');
      hud.id = BONUS_HUD_ID;
      (doc.body || doc.documentElement).appendChild(hud);
    }

    const { percent, remaining, isComplete } = calculateBonusProgress(config.currentWagered, config.targetWager);
    const maxBetTag = config.maxBetLimit > 0 ? `<span class="tiltcheck-bonus-maxbet">Max: $${config.maxBetLimit.toFixed(2)}</span>` : '';

    hud.innerHTML = `
      <div class="tiltcheck-bonus-header">
        <span class="tiltcheck-bonus-name">${config.bonusName}</span>
        <span class="tiltcheck-bonus-pct">${percent.toFixed(1)}%</span>
      </div>
      <div class="tiltcheck-bonus-bar-bg">
        <div class="tiltcheck-bonus-bar-fill" style="width: ${percent}%;"></div>
      </div>
      <div class="tiltcheck-bonus-footer">
        <span>Wagered: $${config.currentWagered.toFixed(2)} / $${config.targetWager.toFixed(2)}</span>
        ${maxBetTag}
      </div>
    `;
  }

  function recordBet(betAmountOverride?: number): void {
    if (stopped || !config.active) return;
    const bet = betAmountOverride !== undefined ? betAmountOverride : readBetAmount(doc);
    if (bet === null || bet <= 0) return;

    // 1. Max bet trap check
    if (isBetExceedingMax(bet, config.maxBetLimit)) {
      showMaxBetTrapAlarm(doc, bet, config.maxBetLimit, false);
      return;
    }

    // 2. Accumulate progress
    const prevWagered = config.currentWagered;
    config.currentWagered = Math.round((config.currentWagered + bet) * 100) / 100;
    renderHud();
    onUpdate?.({ ...config });
    void saveBonusTrackerConfig(config);

    // 3. Completion check
    if (config.currentWagered >= config.targetWager && prevWagered < config.targetWager && !completionModalShown) {
      completionModalShown = true;
      showBonusCompleteModal(doc, config.currentWagered, () => {});
    }
  }

  // Intercept spin clicks to trap max-bet violations before bets execute
  const onSpinClickCapture = (e: MouseEvent) => {
    if (stopped || !config.active) return;
    const target = e.target as Element | null;
    if (!target) return;

    const isSpinControl =
      target.closest(SPIN_CONTROL_SELECTOR) !== null ||
      target.matches(SPIN_CONTROL_SELECTOR) ||
      target.closest('button, [role="button"]') !== null;

    if (!isSpinControl) return;

    const bet = readBetAmount(doc);
    if (bet !== null && isBetExceedingMax(bet, config.maxBetLimit)) {
      if (config.blockExceededBets) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showMaxBetTrapAlarm(doc, bet, config.maxBetLimit, true);
        return;
      }
    }

    // Process valid bet after microtask so casino can update UI
    setTimeout(() => {
      if (bet !== null && bet > 0) {
        recordBet(bet);
      }
    }, 50);
  };

  doc.addEventListener('click', onSpinClickCapture, true);

  if (config.active) {
    renderHud();
  }

  return {
    stop: () => {
      stopped = true;
      doc.removeEventListener('click', onSpinClickCapture, true);
      doc.getElementById(BONUS_HUD_ID)?.remove();
      doc.getElementById(BONUS_TRAP_ALARM_ID)?.remove();
      doc.getElementById(BONUS_COMPLETE_MODAL_ID)?.remove();
      doc.getElementById(BONUS_STYLES_ID)?.remove();
    },
    recordBet,
    getProgress: () => calculateBonusProgress(config.currentWagered, config.targetWager),
    getConfig: () => ({ ...config }),
    updateConfig: (newConfig: Partial<BonusTrackerConfig>) => {
      config = { ...config, ...newConfig };
      renderHud();
      onUpdate?.({ ...config });
      void saveBonusTrackerConfig(config);
    },
    resetProgress: () => {
      config.currentWagered = 0;
      completionModalShown = false;
      renderHud();
      onUpdate?.({ ...config });
      void saveBonusTrackerConfig(config);
    },
  };
}
