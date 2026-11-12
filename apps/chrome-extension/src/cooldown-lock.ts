/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */

/**
 * Cooldown ("Take a break") lock rules.
 *
 * The site promises "You can't cancel it early." These rules make that true:
 * - A running lock can only be extended, never shortened or cleared, until it ends.
 * - The extension's chrome.storage copy is the one that counts. Clearing the page's
 *   localStorage does nothing to it, and the page is told the real end time back.
 * - Only known lock sources are accepted from the page bridge.
 */

export const LOCK_SOURCES = [
  'local_browser_session',
  'solana_web_wallet',
  'dashboard',
  'auto_tilt',
  'local_emergency',
] as const;

export type LockSource = (typeof LOCK_SOURCES)[number];

/** Longest lock the page can ask for (the site offers 30 days; one day of slack). */
export const MAX_LOCK_MS = 31 * 24 * 60 * 60 * 1000;

/** Envelope name the site's page script uses. Not a lock source. */
export const COOLDOWN_PAGE_ENVELOPE = 'TILTCHECK_COOLDOWN_PAGE';
/** Envelope name the extension uses when it answers the page. */
export const EXTENSION_ENVELOPE = 'TILTCHECK_EXTENSION';

export function isLockSource(value: unknown): value is LockSource {
  return typeof value === 'string' && (LOCK_SOURCES as readonly string[]).includes(value);
}

/**
 * Reads the lock source from a LOCK_UPDATED page message.
 * Current pages send `lockSource`. Older pages put the lock source in `source`,
 * but `source` is normally the envelope name, which is never a lock source.
 */
export function readLockSource(data: Record<string, unknown> | null | undefined): LockSource | null {
  if (!data) return null;
  if (isLockSource(data.lockSource)) return data.lockSource;
  if (isLockSource(data.source)) return data.source;
  return null;
}

export interface LockState {
  activeUntil: number;
  source: string | null;
}

export type LockDecision =
  | { accept: true; activeUntil: number; source: LockSource }
  | { accept: false; reason: 'bad_source' | 'bad_end_time' | 'too_long' | 'cant_shorten'; activeUntil: number; source: string | null };

export function isLockActive(activeUntil: number, now = Date.now()): boolean {
  return Number.isFinite(activeUntil) && activeUntil > now;
}

/**
 * Decide whether a requested lock may replace the current one.
 * `endTimeMs` is the requested end in ms since epoch.
 */
export function resolveLockUpdate(
  current: LockState,
  request: { endTimeMs: number; source: unknown },
  now = Date.now(),
): LockDecision {
  const currentUntil = Number.isFinite(current.activeUntil) ? Math.max(0, current.activeUntil) : 0;
  const keep = { activeUntil: currentUntil, source: current.source };

  if (!isLockSource(request.source)) {
    return { accept: false, reason: 'bad_source', ...keep };
  }
  const end = Number(request.endTimeMs);
  if (!Number.isFinite(end) || end <= now) {
    return { accept: false, reason: 'bad_end_time', ...keep };
  }
  if (end - now > MAX_LOCK_MS) {
    return { accept: false, reason: 'too_long', ...keep };
  }
  if (isLockActive(currentUntil, now) && end < currentUntil) {
    return { accept: false, reason: 'cant_shorten', ...keep };
  }
  return { accept: true, activeUntil: end, source: request.source };
}
