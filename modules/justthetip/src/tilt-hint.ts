// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
/**
 * Tilt hint engine for JustTheTip.
 *
 * - If tips sent in the last 60 minutes are >= 3x the wallet's 7-day hourly average,
 *   return a hint string and a prefilled Cooldown lock-page URL.
 * - If the wallet has an active SCOPE_ALL Cooldown lock, block tips with a clear message.
 *   The block is advisory — the actual gate is on-chain.
 */

import { getRecentSentTips } from './tip-log.js';

// ── Cooldown check (HTTP call to the API — no Solana client in this module) ───

const COOLDOWN_API =
  process.env.COOLDOWN_API_URL ??
  (process.env.API_URL ? `${process.env.API_URL}/cooldown/check` : 'http://localhost:8080/cooldown/check');

const LOCK_PAGE =
  process.env.COOLDOWN_LOCK_PAGE_URL ?? 'https://tiltcheck.me/cooldown';

interface LockStatus {
  locked: boolean;
  scope: string | null;
  endTime: number | null;
}

async function fetchLockStatus(wallet: string): Promise<LockStatus> {
  try {
    const res = await fetch(`${COOLDOWN_API}?wallet=${encodeURIComponent(wallet)}`);
    if (!res.ok) return { locked: false, scope: null, endTime: null };
    return (await res.json()) as LockStatus;
  } catch {
    return { locked: false, scope: null, endTime: null };
  }
}

// ── Tilt detection ────────────────────────────────────────────────────────────

const TILT_WINDOW_SECS = 3600;      // 60 minutes
const TILT_BASELINE_SECS = 7 * 24 * 3600; // 7 days
const TILT_MULTIPLIER = 3;

/**
 * Check if a wallet is on tilt based on tip velocity.
 * Returns a hint string + lock URL if tilt is detected, null otherwise.
 */
export function detectTiltHint(
  wallet: string,
  gameContext?: string,
): { hint: string; lockUrl: string } | null {
  const recent = getRecentSentTips(wallet, TILT_WINDOW_SECS);
  const recentTotal = recent.reduce((s, e) => s + e.amountUsdc, 0);

  const baseline = getRecentSentTips(wallet, TILT_BASELINE_SECS);
  const baselineTotal = baseline.reduce((s, e) => s + e.amountUsdc, 0);
  const baselineHours = TILT_BASELINE_SECS / 3600;
  const hourlyAvg = baselineHours > 0 ? baselineTotal / baselineHours : 0;

  if (hourlyAvg === 0 || recentTotal < hourlyAvg * TILT_MULTIPLIER) return null;

  const params = new URLSearchParams();
  if (gameContext) params.set('game', gameContext);

  const lockUrl = `${LOCK_PAGE}${params.toString() ? `?${params}` : ''}`;
  const hint = gameContext
    ? `Want to bench ${gameContext}?`
    : `Your tip rate is ${TILT_MULTIPLIER}x your normal pace. Want to set a Cooldown lock?`;

  return { hint, lockUrl };
}

// ── All-scope lock guard ──────────────────────────────────────────────────────

export interface TipGuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Call before sending or receiving a tip or Rain.
 * If the wallet has an active all-scope Cooldown lock, block the action.
 */
export async function guardTipForWallet(wallet: string): Promise<TipGuardResult> {
  const status = await fetchLockStatus(wallet);
  if (status.locked && status.scope === 'all') {
    const until = status.endTime
      ? new Date(status.endTime * 1000).toLocaleDateString()
      : 'an unknown date';
    return {
      allowed: false,
      reason: `This wallet has an active self-exclusion lock until ${until}. Tips and Rain are blocked while the Cooldown lock is active.`,
    };
  }
  return { allowed: true };
}
