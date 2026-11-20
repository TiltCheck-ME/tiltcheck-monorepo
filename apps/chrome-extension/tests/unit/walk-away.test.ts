/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
/**
 * @vitest-environment jsdom
 * Walk-away number: sanitizing, evaluation, watcher lifecycle, choices hand-off.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TILTCHECK_WALKAWAY_DOWN_KEY,
  TILTCHECK_WALKAWAY_UP_KEY,
  evaluateWalkAway,
  installWalkAwayWatcher,
  loadWalkAwayTargets,
  sanitizeWalkAwayAmount,
  sanitizeWalkAwayTargets,
  saveWalkAwayTargets,
  type WalkAwayHit,
} from '../../src/walk-away.js';
import { CHOICES_ROOT_ID, resetChoicesScreenForTests } from '../../src/choices-screen.js';
import { resetTouchGrassTimeoutForTests } from '../../src/touch-grass-timeout.js';

describe('sanitizeWalkAwayAmount', () => {
  it('accepts positive amounts and rounds to cents', () => {
    expect(sanitizeWalkAwayAmount(200)).toBe(200);
    expect(sanitizeWalkAwayAmount('150.555')).toBe(150.56);
  });

  it('turns blank, zero, negative, and junk into off', () => {
    for (const v of [undefined, null, '', 0, -10, 'abc', Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(sanitizeWalkAwayAmount(v)).toBeNull();
    }
  });

  it('caps absurd amounts', () => {
    expect(sanitizeWalkAwayAmount(5e9)).toBe(1_000_000);
  });
});

describe('evaluateWalkAway', () => {
  const targets = sanitizeWalkAwayTargets(100, 50);

  it('fires up when profit reaches the up line', () => {
    expect(evaluateWalkAway(200, 299.99, targets)).toBeNull();
    expect(evaluateWalkAway(200, 300, targets)).toBe('up');
  });

  it('fires down when loss reaches the down line', () => {
    expect(evaluateWalkAway(200, 151, targets)).toBeNull();
    expect(evaluateWalkAway(200, 150, targets)).toBe('down');
  });

  it('ignores a side that is off', () => {
    expect(evaluateWalkAway(200, 1000, { up: null, down: 50 })).toBeNull();
    expect(evaluateWalkAway(200, 0, { up: 100, down: null })).toBeNull();
  });

  it('needs a baseline and a balance', () => {
    expect(evaluateWalkAway(null, 300, targets)).toBeNull();
    expect(evaluateWalkAway(200, null, targets)).toBeNull();
  });
});

describe('walk-away storage', () => {
  let storage: Record<string, unknown>;
  beforeEach(() => {
    storage = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (keys: string[]) => {
            const out: Record<string, unknown> = {};
            for (const k of keys) if (k in storage) out[k] = storage[k];
            return out;
          }),
          set: vi.fn(async (data: Record<string, unknown>) => {
            Object.assign(storage, data);
          }),
        },
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('round-trips sanitized targets through chrome.storage.local only', async () => {
    const saved = await saveWalkAwayTargets('250', '');
    expect(saved).toEqual({ up: 250, down: null });
    expect(storage[TILTCHECK_WALKAWAY_UP_KEY]).toBe(250);
    expect(storage[TILTCHECK_WALKAWAY_DOWN_KEY]).toBeNull();
    expect(await loadWalkAwayTargets()).toEqual({ up: 250, down: null });
  });
});

describe('installWalkAwayWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    resetChoicesScreenForTests();
    resetTouchGrassTimeoutForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById(CHOICES_ROOT_ID)?.remove();
  });

  it('takes the first balance as baseline and fires each side once', () => {
    const hits: WalkAwayHit[] = [];
    const watcher = installWalkAwayWatcher(document, { up: 100, down: 50 }, {
      onHit: (hit) => hits.push(hit),
      readBalanceFn: () => null,
    });

    watcher.check(200);
    expect(watcher.getBaseline()).toBe(200);
    expect(watcher.check(310)).toBe('up');
    expect(watcher.check(320)).toBeNull();
    expect(watcher.check(140)).toBe('down');
    expect(hits.map((h) => h.side)).toEqual(['up', 'down']);
    watcher.stop();
  });

  it('re-arms a side when the player changes that target mid-session', () => {
    const onHit = vi.fn();
    const watcher = installWalkAwayWatcher(document, { up: 100, down: null }, { onHit, readBalanceFn: () => null });
    watcher.check(200);
    watcher.check(300);
    expect(onHit).toHaveBeenCalledTimes(1);

    watcher.updateTargets({ up: 200, down: null });
    expect(watcher.hasFired('up')).toBe(false);
    watcher.check(350);
    expect(onHit).toHaveBeenCalledTimes(1);
    watcher.check(400);
    expect(onHit).toHaveBeenCalledTimes(2);
    watcher.stop();
  });

  it('re-baselines on a currency toggle instead of calling it a heater', () => {
    const onHit = vi.fn();
    const watcher = installWalkAwayWatcher(document, { up: 100, down: null }, { onHit, readBalanceFn: () => null });
    watcher.check(20);
    watcher.check(1_000_000);
    expect(onHit).not.toHaveBeenCalled();
    expect(watcher.getBaseline()).toBe(1_000_000);
    watcher.stop();
  });

  it('polls the page balance and opens the private choices screen by default', () => {
    let balance: number | null = 500;
    const watcher = installWalkAwayWatcher(document, { up: 100, down: null }, { readBalanceFn: () => balance });
    vi.advanceTimersByTime(1_000);
    expect(watcher.getBaseline()).toBe(500);

    balance = 620;
    vi.advanceTimersByTime(1_000);
    const root = document.getElementById(CHOICES_ROOT_ID);
    expect(root).not.toBeNull();
    expect(root?.textContent).toContain('walk-away');
    // Amounts never render on the prompt.
    expect(root?.textContent).not.toMatch(/\$\s?\d/);
    watcher.stop();
  });

  it('stays quiet with no targets', () => {
    const onHit = vi.fn();
    const watcher = installWalkAwayWatcher(document, { up: null, down: null }, { onHit, readBalanceFn: () => 100 });
    expect(watcher.check(100000)).toBeNull();
    expect(onHit).not.toHaveBeenCalled();
    watcher.stop();
  });
});
