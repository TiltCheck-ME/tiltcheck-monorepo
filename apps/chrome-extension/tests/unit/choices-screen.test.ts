/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
/**
 * @vitest-environment jsdom
 * Private choices screen: rendering, each choice, private log, buddy-ping payload.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/cashout-router.js', () => ({
  triggerCashoutNavigation: vi.fn(() => ({ navigated: true, method: 'href', target: '' })),
  triggerAutoVault: vi.fn(async (amount: number) => ({
    vaulted: false,
    method: 'none',
    amount,
    currency: 'usd',
    casinoName: null,
  })),
}));

import {
  CHOICES_REPEAT_COOLDOWN_MS,
  CHOICES_ROOT_ID,
  CHOICE_LOG_KEY,
  TOUCH_GRASS_CHOICE_MS,
  buildBuddyPingMessage,
  computeLockHalfAmount,
  resetChoicesScreenForTests,
  sanitizeChoiceLog,
  showChoicesScreen,
} from '../../src/choices-screen.js';
import { triggerAutoVault, triggerCashoutNavigation } from '../../src/cashout-router.js';
import { isTouchGrassActive, resetTouchGrassTimeoutForTests } from '../../src/touch-grass-timeout.js';

let storage: Record<string, unknown>;
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function button(choice: string): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`#${CHOICES_ROOT_ID} button[data-choice="${choice}"]`);
}

beforeEach(() => {
  document.body.innerHTML = '';
  resetChoicesScreenForTests();
  resetTouchGrassTimeoutForTests();
  vi.clearAllMocks();
  storage = {};
  vi.stubGlobal('chrome', {
    runtime: { sendMessage: vi.fn() },
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

afterEach(() => {
  document.getElementById(CHOICES_ROOT_ID)?.remove();
  document.getElementById('tiltcheck-lockdown-root')?.remove();
  resetTouchGrassTimeoutForTests();
  vi.unstubAllGlobals();
});

describe('computeLockHalfAmount', () => {
  it('halves the session profit when up', () => {
    expect(computeLockHalfAmount(100, 300)).toBe(100);
  });
  it('halves the balance when not up', () => {
    expect(computeLockHalfAmount(300, 100)).toBe(50);
    expect(computeLockHalfAmount(null, 81)).toBe(40.5);
  });
  it('returns null with nothing to lock', () => {
    expect(computeLockHalfAmount(100, null)).toBeNull();
    expect(computeLockHalfAmount(100, 0)).toBeNull();
    expect(computeLockHalfAmount(null, 0.01)).toBeNull();
  });
});

describe('buildBuddyPingMessage', () => {
  it('carries no amount, game, balance, or site', () => {
    const msg = buildBuddyPingMessage('walk_away_up');
    expect(msg).toEqual({ type: 'buddy_ping', reason: 'walk_away' });
    expect(buildBuddyPingMessage('tilt')).toEqual({ type: 'buddy_ping', reason: 'tilt' });
  });
});

describe('showChoicesScreen', () => {
  it('renders the choices privately with no amounts and no buddy button while the backend is off', () => {
    expect(showChoicesScreen(document, { trigger: 'walk_away_up', reason: 'Line hit.', lockHalfAmount: () => 125 })).toBe(true);
    const root = document.getElementById(CHOICES_ROOT_ID)!;
    expect(root.getAttribute('role')).toBe('dialog');
    const labels = Array.from(root.querySelectorAll('button')).map((b) => b.textContent);
    expect(labels).toEqual(['Cash out', 'Lock half', 'Touch Grass 5 min', 'Keep playing (logged)']);
    expect(root.textContent).toContain('Private');
    expect(root.textContent).not.toMatch(/\$\s?\d|125/);
  });

  it('shows "Ping my buddy" only when buddy pings are available, and sends the bare payload', async () => {
    showChoicesScreen(document, { trigger: 'walk_away_down', reason: 'x', buddyPingAvailable: true });
    button('ping_buddy')!.click();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'buddy_ping', reason: 'walk_away' });
    await flush();
    expect(storage[CHOICE_LOG_KEY]).toEqual([expect.objectContaining({ choice: 'ping_buddy', trigger: 'walk_away_down' })]);
  });

  it('hides "Lock half" with nothing to lock', () => {
    showChoicesScreen(document, { trigger: 'tilt', reason: 'x', lockHalfAmount: () => null });
    expect(button('lock_half')).toBeNull();
  });

  it('Cash out routes to the cashier and closes', () => {
    showChoicesScreen(document, { trigger: 'tilt', reason: 'x' });
    button('cash_out')!.click();
    expect(triggerCashoutNavigation).toHaveBeenCalledTimes(1);
    expect(document.getElementById(CHOICES_ROOT_ID)).toBeNull();
  });

  it('Lock half tries the vault and falls back to the cashier', async () => {
    showChoicesScreen(document, { trigger: 'walk_away_up', reason: 'x', lockHalfAmount: () => 60 });
    button('lock_half')!.click();
    await flush();
    expect(triggerAutoVault).toHaveBeenCalledWith(60, 'usd', document);
    expect(triggerCashoutNavigation).toHaveBeenCalledTimes(1);
  });

  it('Touch Grass 5 min starts the pause only because the player picked it', () => {
    showChoicesScreen(document, { trigger: 'tilt', reason: 'x' });
    expect(isTouchGrassActive()).toBe(false);
    button('touch_grass')!.click();
    expect(isTouchGrassActive()).toBe(true);
    expect(TOUCH_GRASS_CHOICE_MS).toBe(300_000);
  });

  it('Keep playing closes and logs the choice with no amounts', async () => {
    const onChoice = vi.fn();
    showChoicesScreen(document, { trigger: 'walk_away_up', reason: 'x', onChoice });
    button('keep_playing')!.click();
    expect(onChoice).toHaveBeenCalledWith('keep_playing');
    expect(document.getElementById(CHOICES_ROOT_ID)).toBeNull();
    await flush();
    const log = storage[CHOICE_LOG_KEY] as Array<Record<string, unknown>>;
    expect(log).toHaveLength(1);
    expect(Object.keys(log[0]!).sort()).toEqual(['choice', 'host', 'trigger', 'ts']);
  });

  it('Escape dismisses and logs it', async () => {
    showChoicesScreen(document, { trigger: 'tilt', reason: 'x' });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById(CHOICES_ROOT_ID)).toBeNull();
    await flush();
    expect((storage[CHOICE_LOG_KEY] as Array<{ choice: string }>)[0]!.choice).toBe('dismissed');
  });

  it('does not stack or re-open the same trigger inside the cooldown', () => {
    const now = 1_000_000;
    expect(showChoicesScreen(document, { trigger: 'tilt', reason: 'x', now })).toBe(true);
    expect(showChoicesScreen(document, { trigger: 'walk_away_up', reason: 'x', now })).toBe(false);
    button('keep_playing')!.click();
    expect(showChoicesScreen(document, { trigger: 'tilt', reason: 'x', now: now + 1_000 })).toBe(false);
    expect(showChoicesScreen(document, { trigger: 'tilt', reason: 'x', now: now + CHOICES_REPEAT_COOLDOWN_MS })).toBe(true);
  });
});

describe('sanitizeChoiceLog', () => {
  it('drops junk and any extra fields', () => {
    const out = sanitizeChoiceLog([
      { ts: 1, trigger: 'tilt', choice: 'keep_playing', host: 'stake.us', amount: 500 },
      'nope',
      { ts: 'x' },
    ]);
    expect(out).toEqual([{ ts: 1, trigger: 'tilt', choice: 'keep_playing', host: 'stake.us' }]);
  });
});
