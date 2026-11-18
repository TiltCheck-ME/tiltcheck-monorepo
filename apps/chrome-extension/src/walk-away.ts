/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
/**
 * walk-away.ts
 * Walk-away number: the player picks "up $X" and/or "down $Y" for the session in
 * the popup. When the balance crosses either line, the player gets the private
 * choices screen (choices-screen.ts). No lockout.
 *
 * Privacy: targets and the session baseline live in chrome.storage.local / memory
 * on this device only. Nothing here is sent to a server, a buddy, or Discord.
 */

import { readBalance } from './reality-hud.js';
import { computeLockHalfAmount, showChoicesScreen } from './choices-screen.js';

export const TILTCHECK_WALKAWAY_UP_KEY = 'tiltcheck_walkaway_up';
export const TILTCHECK_WALKAWAY_DOWN_KEY = 'tiltcheck_walkaway_down';

export const MAX_WALKAWAY_AMOUNT = 1_000_000;
export const WALKAWAY_POLL_MS = 1_000;

export type WalkAwaySide = 'up' | 'down';

export interface WalkAwayTargets {
  /** Walk away once the session is up at least this much. null = off. */
  up: number | null;
  /** Walk away once the session is down at least this much. null = off. */
  down: number | null;
}

export const EMPTY_WALKAWAY_TARGETS: Readonly<WalkAwayTargets> = Object.freeze({ up: null, down: null });

/** Positive, finite, capped, rounded to cents. Anything else turns the target off. */
export function sanitizeWalkAwayAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(Math.min(n, MAX_WALKAWAY_AMOUNT) * 100) / 100;
}

export function sanitizeWalkAwayTargets(up: unknown, down: unknown): WalkAwayTargets {
  return { up: sanitizeWalkAwayAmount(up), down: sanitizeWalkAwayAmount(down) };
}

export function hasWalkAwayTarget(targets: WalkAwayTargets): boolean {
  return targets.up !== null || targets.down !== null;
}

export async function loadWalkAwayTargets(): Promise<WalkAwayTargets> {
  try {
    const stored = await chrome.storage.local.get([TILTCHECK_WALKAWAY_UP_KEY, TILTCHECK_WALKAWAY_DOWN_KEY]);
    return sanitizeWalkAwayTargets(stored[TILTCHECK_WALKAWAY_UP_KEY], stored[TILTCHECK_WALKAWAY_DOWN_KEY]);
  } catch {
    return { ...EMPTY_WALKAWAY_TARGETS };
  }
}

export async function saveWalkAwayTargets(up: unknown, down: unknown): Promise<WalkAwayTargets> {
  const targets = sanitizeWalkAwayTargets(up, down);
  try {
    await chrome.storage.local.set({
      [TILTCHECK_WALKAWAY_UP_KEY]: targets.up,
      [TILTCHECK_WALKAWAY_DOWN_KEY]: targets.down,
    });
  } catch {
    // Storage unavailable in test harnesses without a mock.
  }
  return targets;
}

/**
 * Which line (if any) the session has crossed. Up wins when both somehow hit.
 */
export function evaluateWalkAway(
  baseline: number | null,
  current: number | null,
  targets: WalkAwayTargets
): WalkAwaySide | null {
  if (baseline === null || current === null) return null;
  if (!Number.isFinite(baseline) || !Number.isFinite(current)) return null;
  const delta = current - baseline;
  if (targets.up !== null && delta >= targets.up) return 'up';
  if (targets.down !== null && -delta >= targets.down) return 'down';
  return null;
}

export interface WalkAwayHit {
  side: WalkAwaySide;
  baseline: number;
  current: number;
}

export interface WalkAwayWatcherOptions {
  /** Defaults to the private choices screen. */
  onHit?: (hit: WalkAwayHit) => void;
  readBalanceFn?: (doc: Document) => number | null;
  pollMs?: number;
}

export interface WalkAwayHandle {
  stop: () => void;
  check: (balanceOverride?: number) => WalkAwaySide | null;
  updateTargets: (targets: WalkAwayTargets) => void;
  getTargets: () => WalkAwayTargets;
  getBaseline: () => number | null;
  hasFired: (side: WalkAwaySide) => boolean;
}

export function walkAwayHeadline(side: WalkAwaySide): string {
  return side === 'up' ? 'You hit your walk-away number.' : 'You hit your stop number.';
}

export function walkAwayReason(side: WalkAwaySide): string {
  return side === 'up'
    ? 'You picked this line before the heater talked. The win is yours if you take it. Your call.'
    : 'You picked this line with a clear head. Chasing it back is how the night gets worse. Your call.';
}

function defaultOnHit(doc: Document): (hit: WalkAwayHit) => void {
  return (hit) => {
    showChoicesScreen(doc, {
      trigger: hit.side === 'up' ? 'walk_away_up' : 'walk_away_down',
      headline: walkAwayHeadline(hit.side),
      reason: walkAwayReason(hit.side),
      lockHalfAmount: () => computeLockHalfAmount(hit.baseline, readBalance(doc) ?? hit.current),
    });
  };
}

/**
 * Polls the casino balance. The first readable balance on this page is the
 * session baseline. Each side fires once per session; changing a target re-arms it.
 */
export function installWalkAwayWatcher(
  doc: Document,
  initialTargets: WalkAwayTargets,
  options: WalkAwayWatcherOptions = {}
): WalkAwayHandle {
  const read = options.readBalanceFn ?? readBalance;
  const onHit = options.onHit ?? defaultOnHit(doc);
  let targets: WalkAwayTargets = { ...initialTargets };
  let baseline: number | null = null;
  let stopped = false;
  const fired = new Set<WalkAwaySide>();

  function evaluate(current: number): WalkAwaySide | null {
    if (stopped || current < 0) return null;
    if (baseline === null) {
      baseline = current;
      return null;
    }
    // Currency toggle (e.g. $20 to 1,000,000 GC) is not a heater. Re-baseline.
    if (current > baseline * 20 && current > 5000) {
      baseline = current;
      fired.clear();
      return null;
    }
    const side = evaluateWalkAway(baseline, current, targets);
    if (side && !fired.has(side)) {
      fired.add(side);
      onHit({ side, baseline, current });
      return side;
    }
    return null;
  }

  function check(balanceOverride?: number): WalkAwaySide | null {
    if (stopped || !hasWalkAwayTarget(targets)) return null;
    const balance = balanceOverride !== undefined ? balanceOverride : read(doc);
    return balance === null ? null : evaluate(balance);
  }

  const interval = setInterval(() => {
    check();
  }, options.pollMs ?? WALKAWAY_POLL_MS);

  return {
    stop: () => {
      stopped = true;
      clearInterval(interval);
    },
    check,
    updateTargets: (next) => {
      if (next.up !== targets.up) fired.delete('up');
      if (next.down !== targets.down) fired.delete('down');
      targets = { ...next };
    },
    getTargets: () => ({ ...targets }),
    getBaseline: () => baseline,
    hasFired: (side) => fired.has(side),
  };
}
