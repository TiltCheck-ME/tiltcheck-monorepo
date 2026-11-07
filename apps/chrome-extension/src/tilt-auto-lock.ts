/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-06 */
/**
 * tilt-auto-lock.ts
 * Automated on-chain voluntary lock trigger on high tilt (Level 3+ / score >= 75).
 * Non-custodial: enforces local session freeze, activates deposit barrier HUD,
 * and routes user to non-custodial Anchor Cooldown program on tiltcheck.me/cooldown.
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

export interface AutoLockEvaluationParams {
  tiltRisk: number;
  threshold?: number;
  autoLockEnabled?: boolean;
  cooldownActiveUntil?: number;
  now?: number;
}

export function shouldTriggerAutoLock(params: AutoLockEvaluationParams): boolean {
  const enabled = params.autoLockEnabled ?? DEFAULT_AUTO_LOCK_ON_TILT;
  if (!enabled) {
    return false;
  }
  const threshold = params.threshold ?? DEFAULT_AUTO_LOCK_THRESHOLD;
  if (params.tiltRisk < threshold) {
    return false;
  }
  const now = params.now ?? Date.now();
  const cooldownUntil = params.cooldownActiveUntil ?? 0;
  if (cooldownUntil > now) {
    return false;
  }
  return true;
}

export interface TriggerAutoLockOptions {
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

export async function executeTiltAutoLock(
  options: TriggerAutoLockOptions
): Promise<TriggerAutoLockResult> {
  const now = options.now ?? Date.now();
  const duration = options.duration ?? DEFAULT_AUTO_LOCK_DURATION;
  const activeUntil = now + duration * 1000;
  const source = options.source ?? 'auto_tilt';
  const wallet = options.wallet ?? null;
  const targetUrl = buildAutoLockVaultUrl({
    wallet,
    duration,
    source,
    scope: 'all',
  });

  // 1. Persist local exclusion state into chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const updates: Record<string, unknown> = {
        [TILTCHECK_COOLDOWN_ACTIVE_UNTIL_KEY]: activeUntil,
        [TILTCHECK_COOLDOWN_SOURCE_KEY]: source,
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

export async function checkAndTriggerAutoLock(params: {
  tiltRisk: number;
  indicators?: string[];
  openPrompt?: boolean;
  now?: number;
}): Promise<TriggerAutoLockResult | null> {
  const opts = await loadCoreCircuitBreakerOptions();
  const shouldTrigger = shouldTriggerAutoLock({
    tiltRisk: params.tiltRisk,
    threshold: opts.autoLockThreshold,
    autoLockEnabled: opts.autoLockOnTilt,
    cooldownActiveUntil: opts.cooldownActiveUntil,
    now: params.now,
  });

  if (!shouldTrigger) {
    return null;
  }

  return executeTiltAutoLock({
    tiltRisk: params.tiltRisk,
    wallet: opts.cooldownWallet,
    indicators: params.indicators,
    duration: opts.autoLockDuration,
    openPrompt: params.openPrompt ?? Boolean(opts.cooldownWallet),
    now: params.now,
  });
}
