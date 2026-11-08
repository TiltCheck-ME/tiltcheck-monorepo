/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */

/**
 * Core content script — pace-locks spins and provides event-driven Touch Grass timeouts.
 *
 * Non-custodial: operates entirely client-side with zero custody of player funds.
 * Pro monolith (extractor, strategic filters) lazy-loads when
 * `tiltcheck_pro_monolith_enabled === true` and tears down on flag off.
 */

function isDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith('.' + domain);
}

const hostname = window.location.hostname.toLowerCase();
const pathname = window.location.pathname.toLowerCase();
const isDiscordAuthRoute = pathname.startsWith('/auth/discord');

const isExcludedDomain =
  isDomain(hostname, 'discord.com') ||
  (hostname === 'localhost' && window.location.port === '3333') ||
  (hostname === 'localhost' && window.location.port === '3001' && isDiscordAuthRoute) ||
  (isDomain(hostname, 'api.tiltcheck.me') && isDiscordAuthRoute);

if (isExcludedDomain) {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    console.log('[TiltCheck] Skipping - excluded domain:', hostname);
  }
}

import {
  CORE_CIRCUIT_BREAKER_STORAGE_KEYS,
  loadCoreCircuitBreakerOptions,
  type CoreCircuitBreakerOptions,
  TILTCHECK_COOLDOWN_WALLET_KEY,
  TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY,
  TILTCHECK_COOLDOWN_SOURCE_KEY,
} from './core-options.js';

import { installSpinPaceLock, type PaceLockHandle, SPIN_CONTROL_SELECTOR } from './spin-pace-lock.js';
import { installLoungeOverlay } from './lounge-overlay.js';
import { installHeaterNudge, type HeaterHandle } from './heater-nudge.js';
import { installChaseWarning, type ChaseHandle } from './chase-warning.js';
import { triggerTouchGrassTimeout, TOUCH_GRASS_DURATION_MS } from './touch-grass-timeout.js';
import { installLocalGameBlocker } from './pro/local-game-blocker.js';
import { installRealityHud, type RealityHudHandle } from './reality-hud.js';
import { installDepositBarrier, type DepositBarrierHandle } from './deposit-barrier.js';
import { installReverseWithdrawalShield, type ReverseWithdrawalShieldHandle } from './reverse-withdrawal-shield.js';
import { installProfitLock, type ProfitLockHandle } from './profit-lock.js';
import { installBonusTracker, type BonusTrackerHandle } from './bonus-tracker.js';
import { installDefaultBetBreaker, type DefaultBetBreakerHandle } from './default-bet-breaker.js';
import { installSessionVelocityRadar, type SessionVelocityHandle } from './session-velocity.js';
import {
  detectCashoutTarget,
  triggerCashoutNavigation,
  triggerAutoVault,
  triggerCooldownVaultNavigation,
  type CooldownVaultOptions,
} from './cashout-router.js';
import {
  installStreakVolatilityTracker,
  type StreakVolatilityHandle,
  DEFAULT_STREAK_VOLATILITY_STATE,
} from './streak-volatility.js';
import {
  loadAudioAlertsConfig,
  setAudioAlertsConfigSync,
  TILTCHECK_AUDIO_ALERTS_CONFIG_KEY,
} from './audio-alerts.js';
import {
  extensionSeedManager,
  normalizeSiteKey,
} from './seed-manager-extension.js';
import { recordActivityFeedEvent } from './activity-feed.js';

/** When `true`, loads the legacy full extension (`pro-monolith-bootstrap.js`). */
export const TILTCHECK_PRO_MONOLITH_KEY = 'tiltcheck_pro_monolith_enabled';

/** Pro still dispatches this. Core ignores it. */
export const TILTCHECK_CORE_RECORD_BET_EVENT = 'tiltcheck-core-record-bet';

/** Event-driven tilt signals and timeout triggers for Core */
export const TILTCHECK_TILT_SIGNAL_EVENT = 'tiltcheck-tilt-signal';
export const TILTCHECK_TRIGGER_TIMEOUT_EVENT = 'tiltcheck-trigger-timeout';

type ProMonolithModule = {
  startProMonolith: () => Promise<void>;
  deactivateProMonolith: () => void;
};

type TiltCheckWindow = Window & { __tiltcheckCoreShieldActive?: boolean };

let paceLock: PaceLockHandle | null = null;
let heaterNudge: HeaterHandle | null = null;
let chaseWarning: ChaseHandle | null = null;
let realityHud: RealityHudHandle | null = null;
let depositBarrier: DepositBarrierHandle | null = null;
let reverseWithdrawalShield: ReverseWithdrawalShieldHandle | null = null;
let profitLock: ProfitLockHandle | null = null;
let bonusTracker: BonusTrackerHandle | null = null;
let sessionRadar: SessionVelocityHandle | null = null;
let streakTracker: StreakVolatilityHandle | null = null;
let defaultBetBreaker: DefaultBetBreakerHandle | null = null;
let coreOptions: CoreCircuitBreakerOptions | null = null;
let proModulePromise: Promise<ProMonolithModule> | null = null;
let proActive = false;

// Rapid click velocity tracking for tilt signals
let clickTimestamps: number[] = [];
export const RAPID_CLICK_BURST_COUNT = 5;
export const RAPID_CLICK_WINDOW_MS = 1500;

export function handleRapidClickTilt(target: Element): boolean {
  const isActionControl =
    target.closest(SPIN_CONTROL_SELECTOR) !== null ||
    target.matches(SPIN_CONTROL_SELECTOR) ||
    target.closest('button, [role="button"]') !== null;

  if (!isActionControl) return false;

  const now = Date.now();
  clickTimestamps = clickTimestamps.filter((t) => now - t <= RAPID_CLICK_WINDOW_MS);
  clickTimestamps.push(now);

  if (clickTimestamps.length >= RAPID_CLICK_BURST_COUNT) {
    clickTimestamps = [];
    void recordActivityFeedEvent('Rapid clicking burst detected: pacing advisory', 'warn');
    const duration = coreOptions?.touchGrassDurationMs ?? TOUCH_GRASS_DURATION_MS;
    triggerTouchGrassTimeout(
      "Rapid clicking detected. Turbo mashing only speeds up the house edge. Step back and breathe.",
      duration
    );
    return true;
  }
  return false;
}

export function installEventDrivenTiltWatcher(): () => void {
  const onSignal = (event: Event) => {
    const custom = event as CustomEvent<{ signal?: string; reason?: string; durationMs?: number }>;
    const reason =
      custom.detail?.reason ||
      (custom.detail?.signal === 'rapid_clicking'
        ? "Rapid clicking detected. Turbo mashing only speeds up the house edge. Step back and breathe."
        : custom.detail?.signal === 'loss_chasing'
        ? "You are down on consecutive spins and ramping stake size. You're chasing, not on a heater. Step back."
        : "Tilt signal detected. Step back and recalibrate.");
    const duration = custom.detail?.durationMs ?? coreOptions?.touchGrassDurationMs ?? TOUCH_GRASS_DURATION_MS;
    triggerTouchGrassTimeout(reason, duration);
  };

  const onTrigger = (event: Event) => {
    const custom = event as CustomEvent<{ reason?: string; durationMs?: number }>;
    const reason = custom.detail?.reason || "Hold up. Recalibrate.";
    const duration = custom.detail?.durationMs ?? coreOptions?.touchGrassDurationMs ?? TOUCH_GRASS_DURATION_MS;
    triggerTouchGrassTimeout(reason, duration);
  };

  const onClickCapture = (event: Event) => {
    if (event.target instanceof Element) {
      handleRapidClickTilt(event.target);
    }
  };

  window.addEventListener(TILTCHECK_TILT_SIGNAL_EVENT, onSignal);
  window.addEventListener(TILTCHECK_TRIGGER_TIMEOUT_EVENT, onTrigger);
  document.addEventListener('click', onClickCapture, true);

  return () => {
    window.removeEventListener(TILTCHECK_TILT_SIGNAL_EVENT, onSignal);
    window.removeEventListener(TILTCHECK_TRIGGER_TIMEOUT_EVENT, onTrigger);
    document.removeEventListener('click', onClickCapture, true);
  };
}



async function waitForDocumentEnd(): Promise<void> {

  if (document.readyState !== 'loading' && document.body) {

    return;

  }



  await new Promise<void>((resolve) => {

    const resolveWhenReady = () => {

      if (document.body) {

        document.removeEventListener('DOMContentLoaded', resolveWhenReady);

        resolve();

      }

    };

    document.addEventListener('DOMContentLoaded', resolveWhenReady, { once: true });

    setTimeout(resolveWhenReady, 0);

  });

}



async function shouldLoadProMonolith(): Promise<boolean> {

  try {

    const stored = await chrome.storage.local.get(TILTCHECK_PRO_MONOLITH_KEY);

    return stored[TILTCHECK_PRO_MONOLITH_KEY] === true;

  } catch {

    return false;

  }

}



async function loadProModule(): Promise<ProMonolithModule> {

  if (!proModulePromise) {

    proModulePromise = import(

      chrome.runtime.getURL('pro-monolith-bootstrap.js')

    ) as Promise<ProMonolithModule>;

  }

  return proModulePromise;

}



async function setProMonolithEnabled(enabled: boolean): Promise<void> {

  if (enabled) {

    if (proActive) return;

    const mod = await loadProModule();

    await mod.startProMonolith();

    proActive = true;

    return;

  }



  if (!proActive) return;

  const mod = await loadProModule();

  mod.deactivateProMonolith();

  proActive = false;

}



async function refreshCoreOptions(): Promise<CoreCircuitBreakerOptions> {

  coreOptions = await loadCoreCircuitBreakerOptions();

  return coreOptions;

}



function installCoreOptionsListener(): void {

  try {

    chrome.storage.onChanged.addListener((changes, area) => {

      if (area !== 'local') return;



      if (TILTCHECK_PRO_MONOLITH_KEY in changes) {

        const enabled = changes[TILTCHECK_PRO_MONOLITH_KEY]?.newValue === true;

        void setProMonolithEnabled(enabled);

      }



      const coreKeyTouched = CORE_CIRCUIT_BREAKER_STORAGE_KEYS.some((k) => k in changes);
      const audioKeyTouched = TILTCHECK_AUDIO_ALERTS_CONFIG_KEY in changes;

      if (coreKeyTouched || audioKeyTouched) {

        void refreshCoreOptions().then((opts) => {

          setAudioAlertsConfigSync({
            enabled: opts.audioAlertsEnabled,
            volume: opts.audioAlertsVolume,
          });
          syncPaceLock(opts.enforcementEnabled);
          syncRealityHud(opts);
          syncDepositBarrier(opts);
          syncReverseWithdrawalShield(opts);
          syncProfitLock(opts);
          syncBonusTracker(opts);
          syncDefaultBetBreaker(opts);

        });

      }

    });

  } catch {

    // Storage listener unavailable in some test harnesses.

  }

}



function syncDefaultBetBreaker(opts: CoreCircuitBreakerOptions): void {
  const shouldRun = opts.enforcementEnabled && opts.defaultBetBreakerEnabled;
  if (shouldRun) {
    if (!defaultBetBreaker) {
      try {
        defaultBetBreaker = installDefaultBetBreaker(document, {
          enabled: opts.defaultBetBreakerEnabled,
          baseStakeThreshold: opts.baseStakeThreshold,
        });
      } catch {
        defaultBetBreaker = null;
      }
    } else {
      defaultBetBreaker.updateOptions({
        enabled: opts.defaultBetBreakerEnabled,
        baseStakeThreshold: opts.baseStakeThreshold,
      });
    }
  } else if (defaultBetBreaker) {
    defaultBetBreaker.stop();
    defaultBetBreaker = null;
  }
}

function syncRealityHud(opts: CoreCircuitBreakerOptions): void {
  const shouldRun = opts.enforcementEnabled && opts.realityHudEnabled;
  if (shouldRun) {
    if (!realityHud) {
      try {
        realityHud = installRealityHud(document, {
          hourlyWage: opts.hourlyWage,
          enabled: opts.realityHudEnabled,
          thresholdHours: opts.realityThresholdHours,
        });
      } catch {
        realityHud = null;
      }
    } else {
      realityHud.updateOptions({
        hourlyWage: opts.hourlyWage,
        enabled: opts.realityHudEnabled,
        thresholdHours: opts.realityThresholdHours,
      });
    }
  } else if (realityHud) {
    realityHud.stop();
    realityHud = null;
  }
}

function syncDepositBarrier(opts: CoreCircuitBreakerOptions): void {
  const shouldRun = opts.enforcementEnabled && opts.depositBarrierEnabled;
  if (shouldRun) {
    if (!depositBarrier) {
      try {
        depositBarrier = installDepositBarrier(document);
      } catch {
        depositBarrier = null;
      }
    }
    depositBarrier?.updateCooldown(opts.cooldownActiveUntil, opts.cooldownSource);
    depositBarrier?.updateEnabled(opts.depositBarrierEnabled);
  } else if (depositBarrier) {
    depositBarrier.stop();
    depositBarrier = null;
  }
}

function syncReverseWithdrawalShield(opts: CoreCircuitBreakerOptions): void {
  const shouldRun = opts.enforcementEnabled && opts.reverseWithdrawalShieldEnabled;
  if (shouldRun) {
    if (!reverseWithdrawalShield) {
      try {
        reverseWithdrawalShield = installReverseWithdrawalShield(document);
      } catch {
        reverseWithdrawalShield = null;
      }
    }
    reverseWithdrawalShield?.updateEnabled(opts.reverseWithdrawalShieldEnabled);
  } else if (reverseWithdrawalShield) {
    reverseWithdrawalShield.stop();
    reverseWithdrawalShield = null;
  }
}

function syncProfitLock(opts: CoreCircuitBreakerOptions): void {
  const shouldRun = opts.enforcementEnabled && (opts.profitLockEnabled || opts.goalsEnabled);
  if (shouldRun) {
    if (!profitLock) {
      try {
        profitLock = installProfitLock(document, {
          profitLockEnabled: opts.profitLockEnabled,
          trailingPercent: opts.trailingPercent,
          minProfit: opts.minProfit,
          goalsEnabled: opts.goalsEnabled,
          goals: opts.goals,
        });
      } catch {
        profitLock = null;
      }
    } else {
      profitLock.updateOptions({
        profitLockEnabled: opts.profitLockEnabled,
        trailingPercent: opts.trailingPercent,
        minProfit: opts.minProfit,
        goalsEnabled: opts.goalsEnabled,
        goals: opts.goals,
      });
    }
  } else if (profitLock) {
    profitLock.stop();
    profitLock = null;
  }
}

function syncBonusTracker(opts: CoreCircuitBreakerOptions): void {
  const shouldRun = opts.enforcementEnabled && opts.bonusConfig?.active;
  if (shouldRun) {
    if (!bonusTracker) {
      try {
        bonusTracker = installBonusTracker(document, opts.bonusConfig);
      } catch {
        bonusTracker = null;
      }
    } else {
      bonusTracker.updateConfig(opts.bonusConfig);
    }
  } else if (bonusTracker) {
    bonusTracker.stop();
    bonusTracker = null;
  }
}

function syncPaceLock(enabled: boolean): void {
  if (enabled && !paceLock) {
    paceLock = installSpinPaceLock();
    if (!heaterNudge) {
      try {
        heaterNudge = installHeaterNudge();
      } catch {
        heaterNudge = null;
      }
    }
    if (!chaseWarning) {
      try {
        chaseWarning = installChaseWarning(
          document,
          () => (paceLock ? paceLock.lockUntil() : 0),
          (stake, lastLossStake) => {
            if (stake >= lastLossStake * 1.5) {
              void recordActivityFeedEvent('Loss chasing detected: stake ramped after loss', 'danger');
    const duration = coreOptions?.touchGrassDurationMs ?? TOUCH_GRASS_DURATION_MS;
              triggerTouchGrassTimeout(
                "You are down on consecutive spins and ramping stake size. You're chasing, not on a heater. Step back.",
                duration
              );
            }
          }
        );
      } catch {
        chaseWarning = null;
      }
    }
    return;
  }

  if (!enabled && paceLock) {
    chaseWarning?.stop();
    chaseWarning = null;
    heaterNudge?.stop();
    heaterNudge = null;
    paceLock.stop();
    paceLock = null;
  }
}

async function startCoreCircuitBreaker(): Promise<void> {
  await waitForDocumentEnd();
  await loadAudioAlertsConfig();
  const opts = await refreshCoreOptions();
  setAudioAlertsConfigSync({
    enabled: opts.audioAlertsEnabled,
    volume: opts.audioAlertsVolume,
  });
  installCoreOptionsListener();
  (window as TiltCheckWindow).__tiltcheckCoreShieldActive = true;
  syncPaceLock(opts.enforcementEnabled);
  syncRealityHud(opts);
  syncDepositBarrier(opts);
  syncReverseWithdrawalShield(opts);
  syncProfitLock(opts);
  syncBonusTracker(opts);
  syncDefaultBetBreaker(opts);
  if (!sessionRadar) {
    try {
      sessionRadar = installSessionVelocityRadar(document);
    } catch {
      sessionRadar = null;
    }
  }
  if (!streakTracker) {
    try {
      streakTracker = installStreakVolatilityTracker(document);
    } catch {
      streakTracker = null;
    }
  }
}


export function installCooldownPageBridge(): () => void {
  const onMessage = (event: MessageEvent) => {
    if (event.source !== window || !event.data || event.data.source !== 'TILTCHECK_COOLDOWN_PAGE') {
      return;
    }
    if (event.data.type === 'WALLET_CONNECTED' && typeof event.data.wallet === 'string') {
      const wallet = event.data.wallet.trim();
      if (wallet.length >= 32 && wallet.length <= 44) {
        chrome.storage?.local?.set?.({ [TILTCHECK_COOLDOWN_WALLET_KEY]: wallet });
        try {
          chrome.runtime?.sendMessage?.({ type: 'sync_cooldown_wallet', wallet });
        } catch {
          // Extension context disconnected in tests
        }
      }
    } else if (event.data.type === 'LOCK_UPDATED') {
      const { wallet, endTime, source } = event.data;
      if (typeof endTime === 'number' && endTime > 0) {
        const endTimeMs = endTime * 1000;
        const updates: Record<string, unknown> = {
          [TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]: endTimeMs,
        };
        if (typeof source === 'string') {
          updates[TILTCHECK_COOLDOWN_SOURCE_KEY] = source;
        }
        if (typeof wallet === 'string' && wallet.trim().length >= 32) {
          updates[TILTCHECK_COOLDOWN_WALLET_KEY] = wallet.trim();
        }
        chrome.storage?.local?.set?.(updates);
        depositBarrier?.updateCooldown(endTimeMs, typeof source === 'string' ? source : null);
        try {
          chrome.runtime?.sendMessage?.({
            type: 'cooldown_lock_updated',
            wallet,
            endTime,
          });
        } catch {
          // Ignore
        }
      }
    }
  };

  window.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('message', onMessage);
  };
}

async function boot(): Promise<void> {
  if (isExcludedDomain) {
    return;
  }

  await startCoreCircuitBreaker();
  const siteKey = normalizeSiteKey(hostname);
  const friendlySite = siteKey ? siteKey.charAt(0).toUpperCase() + siteKey.slice(1) : hostname;
  if (!hostname.includes('tiltcheck.me') && !hostname.includes('localhost')) {
    void recordActivityFeedEvent(`TiltCheck guardrails active on ${friendlySite}`, 'info');
  }
  installEventDrivenTiltWatcher();
  installCooldownPageBridge();
  installLoungeOverlay();
  installLocalGameBlocker();

  if (await shouldLoadProMonolith()) {
    await setProMonolithEnabled(true);
  }
}

void boot();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isExcludedDomain && message.type !== 'get_sidebar_state') {
    sendResponse({ error: 'Feature disabled on this domain' });
    return true;
  }

  if (
    proActive &&
    (message.type === 'toggle_sidebar' ||
      message.type === 'open_sidebar' ||
      message.type === 'get_sidebar_state')
  ) {
    return false;
  }

  switch (message.type) {
    case 'trigger_touch_grass': {
      const duration = message.durationMs ?? coreOptions?.touchGrassDurationMs ?? TOUCH_GRASS_DURATION_MS;
      triggerTouchGrassTimeout(
        message.reason || "Tilt signal detected. Step back and recalibrate.",
        duration
      );
      sendResponse({ success: true, active: true });
      return true;
    }

    case 'toggle_sidebar':
    case 'open_sidebar':
      sendResponse({
        success: false,
        coreOnly: true,
        hint: 'Set tiltcheck_pro_monolith_enabled to true in chrome.storage.local to load the full TiltCheck panel.',
      });
      return true;

    case 'get_sidebar_state':
      sendResponse({
        exists: false,
        visible: false,
        injectionDisabled: false,
        coreOnly: true,
      });
      return true;

    case 'get_deposit_barrier_state':
      sendResponse({
        active: depositBarrier ? depositBarrier.isActive() : false,
        cooldownUntil: depositBarrier ? depositBarrier.getCooldownActiveUntil() : 0,
        source: depositBarrier ? depositBarrier.getCooldownSource() : null,
      });
      return true;

    case 'get_cooldown_vault_state':
      sendResponse({
        active: depositBarrier ? depositBarrier.isActive() : false,
        cooldownUntil: depositBarrier ? depositBarrier.getCooldownActiveUntil() : 0,
        source: depositBarrier ? depositBarrier.getCooldownSource() : null,
        wallet: coreOptions?.cooldownWallet ?? null,
      });
      return true;

    case 'get_reality_hud_state':
      sendResponse({
        visible: realityHud ? realityHud.isVisible() : false,
        baseline: realityHud ? realityHud.getBaseline() : null,
      });
      return true;

    case 'get_reverse_withdrawal_shield_state':
      sendResponse({
        active: reverseWithdrawalShield !== null,
      });
      return true;

    case 'get_profit_lock_state':
      sendResponse({
        active: profitLock !== null,
        baseline: profitLock ? profitLock.getBaseline() : null,
        peak: profitLock ? profitLock.getPeak() : 0,
        floor: profitLock ? profitLock.getFloor() : null,
        softWarningActive: profitLock ? profitLock.isSoftWarningActive() : false,
        hardGuardTriggered: profitLock ? profitLock.isHardGuardTriggered() : false,
      });
      return true;

    case 'get_default_bet_breaker_state':
      sendResponse({
        active: defaultBetBreaker !== null,
        armed: defaultBetBreaker ? defaultBetBreaker.isArmed() : false,
        baseStakeThreshold: defaultBetBreaker ? defaultBetBreaker.getOptions().baseStakeThreshold : 0.50,
      });
      return true;

    case 'reset_default_bet_breaker':
      if (defaultBetBreaker) {
        defaultBetBreaker.reset();
      }
      sendResponse({ success: true });
      return true;

    case 'get_bonus_tracker_state':
      sendResponse({
        active: bonusTracker !== null,
        config: bonusTracker ? bonusTracker.getConfig() : null,
        progress: bonusTracker ? bonusTracker.getProgress() : null,
      });
      return true;

    case 'get_session_pnl_state':
      sendResponse(sessionRadar ? sessionRadar.getState() : null);
      return true;

    case 'reset_session_pnl':
      sendResponse(sessionRadar ? sessionRadar.reset() : null);
      return true;

    case 'get_streak_volatility_state':
      sendResponse(streakTracker ? streakTracker.getState() : DEFAULT_STREAK_VOLATILITY_STATE);
      return true;

    case 'reset_streak_volatility':
      sendResponse(streakTracker ? streakTracker.reset() : DEFAULT_STREAK_VOLATILITY_STATE);
      return true;

    case 'get_cashout_router_state': {
      const info = detectCashoutTarget(document);
      sendResponse({
        success: true,
        info: {
          isCasinoTab: Boolean(info.route || info.clickTarget),
          casinoName: info.casinoName,
          cashierUrl: info.cashierUrl,
          buttonLabel: info.buttonLabel,
          isSweepstakes: info.isSweepstakes,
          canClick: Boolean(info.clickTarget),
          cooldownVaultUrl: info.cooldownVaultUrl,
        },
      });
      return true;
    }

    case 'trigger_cashout_navigation': {
      const result = triggerCashoutNavigation(document);
      sendResponse(result);
      return true;
    }

    case 'trigger_cooldown_vault_navigation': {
      const options = message.options as CooldownVaultOptions | undefined;
      const result = triggerCooldownVaultNavigation(document, options);
      sendResponse(result);
      return true;
    }

    case 'trigger_auto_vault': {
      const amount = typeof message.amount === 'number' && Number.isFinite(message.amount) ? message.amount : 0;
      const currency = typeof message.currency === 'string' ? message.currency : 'usd';
      triggerAutoVault(amount, currency, document).then((res) => {
        if (res && res.success) {
          void recordActivityFeedEvent(`Auto-vault triggered: locked $${amount.toFixed(2)} to safety`, 'info');
        }
        sendResponse(res);
      });
      return true;
    }

    case 'get_client_seed_state': {
      const site = normalizeSiteKey(window.location.hostname);
      extensionSeedManager.getActiveSeed(site).then((metadata) => {
        const detection = extensionSeedManager.detectPageSeedInput(document, site);
        sendResponse({
          success: true,
          site,
          metadata,
          detection,
        });
      });
      return true;
    }

    case 'rotate_client_seed': {
      const site = normalizeSiteKey(window.location.hostname);
      extensionSeedManager.rotateSeed(site, message.options).then((res) => {
        void recordActivityFeedEvent(`Client seed rotated on-device (${site})`, 'info');
        sendResponse({
          success: true,
          site,
          newSeed: res.newSeed,
          retiredSeed: res.retiredSeed,
        });
      });
      return true;
    }

    case 'apply_client_seed_to_page': {
      const site = normalizeSiteKey(window.location.hostname);
      const seed = typeof message.seed === 'string' ? message.seed : '';
      const confirmed = message.confirmed === true;
      const res = extensionSeedManager.applySeedToPage(document, seed, site, { confirmed });
      sendResponse(res);
      return true;
    }

    default:
      return false;
  }
});



if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {

  console.log('[TiltCheck] Core content script loaded');

}


