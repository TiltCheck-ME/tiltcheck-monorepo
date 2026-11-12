/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */
/**
 * tilt-auto-lock.ts
 * "Offer a break when I'm tilting": rules for when the extension may OFFER a lock on high
 * tilt, and the code that starts the lock once the player has said yes.
 *
 * The extension never starts a lock on its own. A lock from here needs the player to tick
 * the first-person checkbox and press the lock button in the offer (tilt-break-offer.ts);
 * `executeTiltAutoLock` refuses to run without `confirmed: true`, and the background worker
 * refuses `trigger_tilt_auto_lock` without `userConfirmed: true`.
 *
 * After "Not now" the offer stays quiet for TILT_OFFER_DISMISS_COOLDOWN_MS (30 min), unless
 * the tilt score climbs at least TILT_OFFER_REPROMPT_SCORE_JUMP (10) points above the score
 * it was dismissed at.
 */

import {
  TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY,
  TILTCHECK_COOLDOWN_WALLET_KEY,
  TILTCHECK_COOLDOWN_SOURCE_KEY,
  DEFAULT_AUTO_LOCK_ON_TILT,
  DEFAULT_AUTO_LOCK_THRESHOLD,
  DEFAULT_AUTO_LOCK_DURATION,
  loadCoreCircuitBreakerOptions,
} from './core-options.js';
import { playAudioCue } from './audio-alerts.js';

export function buildAutoLockVaultUrl(options: {
  wallet?: string | null;
  duration?: number;
  source?: string;
  scope?: string;
}): string {
  const params = new URLSearchParams();
  if (options.wallet) {
    params.set('wallet', options.wallet);
  }
  params.set('scope', options.scope ?? 'all');
  params.set('duration', String(options.duration ?? DEFAULT_AUTO_LOCK_DURATION));
  params.set('source', options.source ?? 'auto_tilt');
  return `https://tiltcheck.me/cooldown?${params.toString()}`;
}

/** Quiet period after "Not now". */
export const TILT_OFFER_DISMISS_COOLDOWN_MS = 30 * 60 * 1000;
/** Inside the quiet period, a score this many points above the dismissed one re-offers. */
export const TILT_OFFER_REPROMPT_SCORE_JUMP = 10;
/** chrome.storage.local key for the last "Not now" (shared by every casino tab). */
export const TILTCHECK_TILT_OFFER_DISMISSED_KEY = 'tiltcheck_tilt_offer_dismissed';

export interface TiltOfferDismissal {
  /** ms since epoch */
  at: number;
  /** tilt score when it was dismissed */
  score: number;
}

export function readTiltOfferDismissal(value: unknown): TiltOfferDismissal | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const at = Number(v.at);
  const score = Number(v.score);
  if (!Number.isFinite(at) || !Number.isFinite(score)) return null;
  return { at, score };
}

export interface AutoLockEvaluationParams {
  tiltRisk: number;
  threshold?: number;
  /** The dashboard's "Offer a break when I'm tilting" switch. */
  autoLockEnabled?: boolean;
  cooldownActiveUntil?: number;
  lastDismissal?: TiltOfferDismissal | null;
  /** An offer is already on screen. */
  offerOpen?: boolean;
  now?: number;
}

/** True when the extension may SHOW the break offer. It never means "lock now". */
export function shouldOfferTiltBreak(params: AutoLockEvaluationParams): boolean {
  const enabled = params.autoLockEnabled ?? DEFAULT_AUTO_LOCK_ON_TILT;
  if (!enabled || params.offerOpen) {
    return false;
  }
  const threshold = params.threshold ?? DEFAULT_AUTO_LOCK_THRESHOLD;
  if (!Number.isFinite(params.tiltRisk) || params.tiltRisk < threshold) {
    return false;
  }
  const now = params.now ?? Date.now();
  const cooldownUntil = params.cooldownActiveUntil ?? 0;
  if (cooldownUntil > now) {
    return false;
  }
  const d = params.lastDismissal;
  if (d && now - d.at < TILT_OFFER_DISMISS_COOLDOWN_MS) {
    return params.tiltRisk >= d.score + TILT_OFFER_REPROMPT_SCORE_JUMP;
  }
  return true;
}

/** @deprecated Kept as an alias so old imports compile; it only decides whether to OFFER. */
export const shouldTriggerAutoLock = shouldOfferTiltBreak;

export interface TriggerAutoLockOptions {
  /**
   * Must be true: the player ticked the checkbox and pressed the lock button in the offer.
   * Without it nothing is written and nothing is sent.
   */
  confirmed: boolean;
  tiltRisk: number;
  wallet?: string | null;
  indicators?: string[];
  duration?: number;
  source?: string;
  openPrompt?: boolean;
  now?: number;
}

export interface TriggerAutoLockResult {
  triggered: boolean;
  activeUntil: number;
  duration: number;
  targetUrl: string;
  wallet: string | null;
}

/** Starts the lock the player just accepted in the offer. Refuses without `confirmed: true`. */
export async function executeTiltAutoLock(
  options: TriggerAutoLockOptions
): Promise<TriggerAutoLockResult> {
  const now = options.now ?? Date.now();
  const duration = options.duration ?? DEFAULT_AUTO_LOCK_DURATION;
  const activeUntil = now + duration * 1000;
  // An accepted tilt offer is always recorded as lockSource 'auto_tilt'.
  const source = 'auto_tilt';
  const wallet = options.wallet ?? null;
  const targetUrl = buildAutoLockVaultUrl({
    wallet,
    duration,
    source,
    scope: 'all',
  });

  if (options.confirmed !== true) {
    return { triggered: false, activeUntil: 0, duration, targetUrl, wallet };
  }

  // 1. Persist local exclusion state into chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const existing = await chrome.storage.local.get([TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]);
      const current = Number(existing?.[TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]) || 0;
      // Never shorten a longer lock that is already running.
      const keepCurrent = current > now && current >= activeUntil;
      const updates: Record<string, unknown> = {
        ...(keepCurrent
          ? {}
          : { [TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]: activeUntil, [TILTCHECK_COOLDOWN_SOURCE_KEY]: source }),
        tiltcheck_last_auto_lock: {
          timestamp: now,
          tiltRisk: options.tiltRisk,
          indicators: options.indicators ?? [],
          duration,
        },
      };
      if (wallet) {
        updates[TILTCHECK_COOLDOWN_WALLET_KEY] = wallet;
      }
      await chrome.storage.local.set(updates);
    } catch {
      // Storage unavailable in isolated test environments
    }
  }

  // 2. Play audio cue if enabled
  try {
    playAudioCue('cooldown_chime');
  } catch {
    // Audio context unavailable in background / test environments
  }

  // 3. Dispatch DOM events and window messages for immediate in-session containment
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('TILTCHECK_COOLDOWN_LOCK_UPDATED', {
          detail: {
            wallet,
            endTime: Math.floor(activeUntil / 1000),
            source,
            tiltRisk: options.tiltRisk,
          },
        })
      );
    } catch {
      // Ignore
    }

    try {
      window.postMessage(
        {
          source: 'TILTCHECK_CONTENT_SCRIPT',
          type: 'COOLDOWN_AUTO_LOCK_TRIGGERED',
          wallet,
          endTime: Math.floor(activeUntil / 1000),
          tiltRisk: options.tiltRisk,
        },
        '*'
      );
    } catch {
      // Ignore
    }
  }

  // 4. Send runtime message to background worker for tab routing and SSE synchronization
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      chrome.runtime.sendMessage({
        type: 'trigger_tilt_auto_lock',
        userConfirmed: true,
        wallet,
        duration,
        tiltRisk: options.tiltRisk,
        indicators: options.indicators ?? [],
        openPrompt: options.openPrompt ?? false,
      });
    } catch {
      // Ignore if disconnected
    }
  }

  return {
    triggered: true,
    activeUntil,
    duration,
    targetUrl,
    wallet,
  };
}

export interface TiltOfferContext {
  enabled: boolean;
  threshold: number;
  duration: number;
  wallet: string | null;
  cooldownActiveUntil: number;
  lastDismissal: TiltOfferDismissal | null;
}

/** Reads everything the offer decision needs from chrome.storage. */
export async function loadTiltOfferContext(): Promise<TiltOfferContext> {
  const opts = await loadCoreCircuitBreakerOptions();
  let lastDismissal: TiltOfferDismissal | null = null;
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const got = await chrome.storage.local.get([TILTCHECK_TILT_OFFER_DISMISSED_KEY]);
      lastDismissal = readTiltOfferDismissal(got?.[TILTCHECK_TILT_OFFER_DISMISSED_KEY]);
    } catch {
      // ignore
    }
  }
  return {
    enabled: opts.autoLockOnTilt,
    threshold: opts.autoLockThreshold,
    duration: opts.autoLockDuration,
    wallet: opts.cooldownWallet ?? null,
    cooldownActiveUntil: opts.cooldownActiveUntil,
    lastDismissal,
  };
}

export async function recordTiltOfferDismissal(d: TiltOfferDismissal): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      await chrome.storage.local.set({ [TILTCHECK_TILT_OFFER_DISMISSED_KEY]: d });
    } catch {
      // ignore
    }
  }
}
