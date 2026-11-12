/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */
/**
 * @vitest-environment jsdom
 * "You can't cancel it early": a running Take-a-break lock can only be extended.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_LOCK_MS,
  readLockSource,
  resolveLockUpdate,
} from '../../src/cooldown-lock.js';

const HOUR = 3_600_000;

const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

function createChromeMock(initial: Record<string, unknown> = {}) {
  const state: Record<string, unknown> = { ...initial };
  const chromeMock = {
    runtime: {
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn(),
    },
    storage: {
      onChanged: { addListener: vi.fn() },
      local: {
        get: vi.fn((keys: string[] | string, cb?: (v: unknown) => void) => {
          const list = Array.isArray(keys) ? keys : [keys];
          const out: Record<string, unknown> = {};
          for (const k of list) if (k in state) out[k] = state[k];
          cb?.(out);
          return Promise.resolve(out);
        }),
        set: vi.fn((items: Record<string, unknown>, cb?: () => void) => {
          Object.assign(state, items);
          cb?.();
          return Promise.resolve();
        }),
      },
    },
  };
  (globalThis as unknown as { chrome: unknown }).chrome = chromeMock;
  return { chromeMock, state };
}

function pageSays(data: Record<string, unknown>) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { source: 'TILTCHECK_COOLDOWN_PAGE', ...data },
      source: window,
    }),
  );
}

describe('resolveLockUpdate', () => {
  const now = 1_800_000_000_000;

  it('starts a lock from a known source', () => {
    const d = resolveLockUpdate({ activeUntil: 0, source: null }, { endTimeMs: now + 24 * HOUR, source: 'local_browser_session' }, now);
    expect(d).toEqual({ accept: true, activeUntil: now + 24 * HOUR, source: 'local_browser_session' });
  });

  it('refuses to shorten a running lock', () => {
    const d = resolveLockUpdate(
      { activeUntil: now + 7 * 24 * HOUR, source: 'local_browser_session' },
      { endTimeMs: now + HOUR, source: 'local_browser_session' },
      now,
    );
    expect(d.accept).toBe(false);
    expect(d).toMatchObject({ reason: 'cant_shorten', activeUntil: now + 7 * 24 * HOUR });
  });

  it('allows extending a running lock', () => {
    const d = resolveLockUpdate(
      { activeUntil: now + HOUR, source: 'local_browser_session' },
      { endTimeMs: now + 3 * HOUR, source: 'solana_web_wallet' },
      now,
    );
    expect(d).toMatchObject({ accept: true, activeUntil: now + 3 * HOUR });
  });

  it('refuses an end time in the past (that would be an early cancel)', () => {
    const d = resolveLockUpdate({ activeUntil: now + HOUR, source: 'x' }, { endTimeMs: now - 1, source: 'local_browser_session' }, now);
    expect(d).toMatchObject({ accept: false, reason: 'bad_end_time' });
  });

  it('refuses unknown sources, including the page envelope name', () => {
    expect(resolveLockUpdate({ activeUntil: 0, source: null }, { endTimeMs: now + HOUR, source: 'TILTCHECK_COOLDOWN_PAGE' }, now))
      .toMatchObject({ accept: false, reason: 'bad_source' });
    expect(resolveLockUpdate({ activeUntil: 0, source: null }, { endTimeMs: now + HOUR, source: undefined }, now))
      .toMatchObject({ accept: false, reason: 'bad_source' });
  });

  it('refuses locks longer than the cap', () => {
    expect(resolveLockUpdate({ activeUntil: 0, source: null }, { endTimeMs: now + MAX_LOCK_MS + 1, source: 'dashboard' }, now))
      .toMatchObject({ accept: false, reason: 'too_long' });
  });

  it('reads lockSource, not the envelope source', () => {
    expect(readLockSource({ source: 'TILTCHECK_COOLDOWN_PAGE', lockSource: 'local_browser_session' })).toBe('local_browser_session');
    expect(readLockSource({ source: 'TILTCHECK_COOLDOWN_PAGE' })).toBeNull();
    expect(readLockSource({ source: 'solana_web_wallet' })).toBe('solana_web_wallet');
  });
});

describe('cooldown page bridge (content.ts)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('stores the lockSource the page sends', async () => {
    const { state } = createChromeMock();
    const { installCooldownPageBridge } = await import('../../src/content.js');
    const cleanup = installCooldownPageBridge();
    const end = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    pageSays({ type: 'LOCK_UPDATED', wallet: 'in_browser_lockout', endTime: end, lockSource: 'local_browser_session' });
    await flush();
    expect(state.tiltcheck_cooldown_active_until).toBe(end * 1000);
    expect(state.tiltcheck_cooldown_source).toBe('local_browser_session');
    cleanup();
  });

  it('ignores a page message that tries to end a running lock early', async () => {
    const lockedUntil = Date.now() + 7 * 24 * HOUR;
    const { state, chromeMock } = createChromeMock({
      tiltcheck_cooldown_active_until: lockedUntil,
      tiltcheck_cooldown_source: 'local_browser_session',
    });
    const posted: unknown[] = [];
    window.addEventListener('message', (e) => {
      if ((e.data as { source?: string })?.source === 'TILTCHECK_EXTENSION') posted.push(e.data);
    });
    const { installCooldownPageBridge } = await import('../../src/content.js');
    const cleanup = installCooldownPageBridge();
    await flush();

    // Shorter lock, then an end time of "now + 1s", both from a valid source.
    pageSays({ type: 'LOCK_UPDATED', endTime: Math.floor(Date.now() / 1000) + 60, lockSource: 'local_browser_session' });
    await flush();
    pageSays({ type: 'LOCK_UPDATED', endTime: 1, lockSource: 'local_browser_session' });
    await flush();

    expect(state.tiltcheck_cooldown_active_until).toBe(lockedUntil);
    expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'cooldown_lock_updated' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(posted).toContainEqual(expect.objectContaining({ type: 'LOCK_STATE', activeUntil: lockedUntil, rejected: 'cant_shorten' }));
    cleanup();
  });

  it("clearing the page's localStorage does not end the lock, and the page is told the real end time", async () => {
    const lockedUntil = Date.now() + 3 * 24 * HOUR;
    const { state } = createChromeMock({
      tiltcheck_cooldown_active_until: lockedUntil,
      tiltcheck_cooldown_source: 'local_browser_session',
    });
    localStorage.setItem('tiltcheck_cooldown_active_until', String(lockedUntil));
    localStorage.clear();

    const posted: Array<Record<string, unknown>> = [];
    window.addEventListener('message', (e) => {
      if ((e.data as { source?: string })?.source === 'TILTCHECK_EXTENSION') posted.push(e.data);
    });
    const { installCooldownPageBridge } = await import('../../src/content.js');
    const cleanup = installCooldownPageBridge();
    pageSays({ type: 'GET_LOCK_STATE' });
    await flush();
    await new Promise((r) => setTimeout(r, 0));

    expect(state.tiltcheck_cooldown_active_until).toBe(lockedUntil);
    expect(posted.some((m) => m.type === 'LOCK_STATE' && m.activeUntil === lockedUntil)).toBe(true);
    cleanup();
  });

  it('rejects a LOCK_UPDATED with no lockSource (old envelope-only message)', async () => {
    const { state } = createChromeMock();
    const { installCooldownPageBridge } = await import('../../src/content.js');
    const cleanup = installCooldownPageBridge();
    pageSays({ type: 'LOCK_UPDATED', endTime: Math.floor(Date.now() / 1000) + 3600 });
    await flush();
    expect(state.tiltcheck_cooldown_active_until).toBeUndefined();
    cleanup();
  });
});

describe('deposit block during a running lock', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('stays on even when the deposit-block setting is off', async () => {
    createChromeMock();
    const barrier = await import('../../src/deposit-barrier.js');
    barrier.setInMemoryBarrierEnabled(false);
    barrier.setInMemoryCooldownActiveUntil(Date.now() + HOUR);
    expect(barrier.isDepositBarrierActive()).toBe(true);
    barrier.setInMemoryCooldownActiveUntil(Date.now() - 1);
    expect(barrier.isDepositBarrierActive()).toBe(false);
  });
});

describe('background keeps the later end time', () => {
  it('cooldown_lock_updated cannot shorten a running lock', async () => {
    vi.resetModules();
    const lockedUntil = Date.now() + 5 * 24 * HOUR;
    const state: Record<string, unknown> = { tiltcheck_cooldown_active_until: lockedUntil };
    const listeners: Array<(m: unknown, s: unknown, r: (v: unknown) => void) => unknown> = [];
    (globalThis as unknown as { chrome: unknown }).chrome = {
      runtime: { onInstalled: { addListener: vi.fn() }, onMessage: { addListener: (l: never) => listeners.push(l) }, getURL: (p: string) => p },
      action: { onClicked: { addListener: vi.fn() } },
      tabs: { onUpdated: { addListener: vi.fn() }, create: vi.fn(), sendMessage: vi.fn() },
      webNavigation: { onBeforeNavigate: { addListener: vi.fn() } },
      alarms: { create: vi.fn(), onAlarm: { addListener: vi.fn() } },
      storage: {
        onChanged: { addListener: vi.fn() },
        local: {
          get: (keys: string[], cb?: (v: unknown) => void) => {
            const out: Record<string, unknown> = {};
            for (const k of keys) out[k] = state[k];
            cb?.(out);
            return Promise.resolve(out);
          },
          set: (items: Record<string, unknown>) => { Object.assign(state, items); return Promise.resolve(); },
        },
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await import('../../src/background.js');
    const respond = vi.fn();
    for (const l of listeners) l({ type: 'cooldown_lock_updated', endTime: Math.floor(Date.now() / 1000) + 60 }, {}, respond);
    expect(state.tiltcheck_cooldown_active_until).toBe(lockedUntil);
    expect(respond).toHaveBeenCalledWith({ success: true, activeUntil: lockedUntil });
    vi.unstubAllGlobals();
  });
});
