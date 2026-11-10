/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */
/**
 * @vitest-environment jsdom
 * Core content script — pace lock and event-driven Touch Grass timeouts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetTouchGrassTimeoutForTests } from '../../src/touch-grass-timeout.js';

type OnMessageHandler = (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void;

type StorageChange = { oldValue?: unknown; newValue?: unknown };
type OnChangedHandler = (changes: Record<string, StorageChange>, area: string) => void;

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

function readStorage(keys: string[] | string | Record<string, unknown> | null, storageState: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  if (keys == null) {
    return { ...storageState };
  }
  const keyList = Array.isArray(keys)
    ? keys
    : typeof keys === 'string'
      ? [keys]
      : Object.keys(keys);
  for (const key of keyList) {
    if (Object.prototype.hasOwnProperty.call(storageState, key)) {
      result[key] = storageState[key];
    }
  }
  return result;
}

function createChromeMock(initialStorage: Record<string, unknown> = {}) {
  const listeners: OnMessageHandler[] = [];
  const storageListeners: OnChangedHandler[] = [];
  const storageState: Record<string, unknown> = { ...initialStorage };
  const chromeMock = {
    runtime: {
      onMessage: {
        addListener: vi.fn((handler: OnMessageHandler) => listeners.push(handler)),
      },
      sendMessage: vi.fn(),
    },
    storage: {
      onChanged: {
        addListener: vi.fn((handler: OnChangedHandler) => storageListeners.push(handler)),
      },
      local: {
        get: vi.fn((keys: string[] | string | Record<string, unknown> | null, callback?: (value: unknown) => void) => {
          const result = readStorage(keys, storageState);
          if (callback) callback(result);
          return Promise.resolve(result);
        }),
        set: vi.fn((data: Record<string, unknown>, callback?: () => void) => {
          Object.assign(storageState, data);
          callback?.();
          return Promise.resolve();
        }),
      },
    },
  };
  (globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;
  return { chromeMock, listeners, storageState, storageListeners };
}

describe('core content script contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    resetTouchGrassTimeoutForTests();
  });

  it('registers a runtime message handler', async () => {
    const { listeners } = createChromeMock();
    await import('../../src/content.ts');
    await flush();
    expect(listeners).toHaveLength(1);
  }, 15_000);

  it('returns core-only sidebar state when Pro monolith storage flag is unset', async () => {
    const { listeners } = createChromeMock();
    await import('../../src/content.ts');
    await flush();

    const getState = vi.fn();
    listeners[0]!({ type: 'get_sidebar_state' }, null, getState);
    expect(getState).toHaveBeenCalledWith(
      expect.objectContaining({
        exists: false,
        visible: false,
        coreOnly: true,
      })
    );
  });

  it('toggle_sidebar explains core-only mode', async () => {
    const { listeners } = createChromeMock();
    await import('../../src/content.ts');
    await flush();

    const send = vi.fn();
    listeners[0]!({ type: 'toggle_sidebar' }, null, send);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        coreOnly: true,
        hint: expect.stringContaining('tiltcheck_pro_monolith_enabled'),
      })
    );
  });

  it('does not claim unknown runtime messages (allows other listeners to respond)', async () => {
    const { listeners } = createChromeMock();
    await import('../../src/content.ts');
    await flush();

    const response = vi.fn();
    const handled = listeners[0]!({ type: 'unknown_message' }, null, response);
    expect(handled).toBe(false);
    expect(response).not.toHaveBeenCalled();
  });

  it('wires Touch Grass timeout mechanics into Core for tilt signals', async () => {
    const nodeUrl = await import('node:url');
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new nodeUrl.URL('../../src/content.ts', import.meta.url), 'utf8')
    );
    expect(source).toContain('triggerTouchGrassTimeout');
    expect(source).toContain('installEventDrivenTiltWatcher');
    expect(source).toContain('handleRapidClickTilt');
  });

  it('triggers Touch Grass timeout via runtime message', async () => {
    const { listeners } = createChromeMock();
    await import('../../src/content.ts');
    await flush();

    const response = vi.fn();
    listeners[0]!(
      { type: 'trigger_touch_grass', reason: 'You are down 60% in 9 minutes. Close the tab.' },
      null,
      response
    );
    expect(response).toHaveBeenCalledWith(expect.objectContaining({ success: true, active: true }));
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
  });

  it('triggers Touch Grass timeout on rapid clicking bursts', async () => {
    const { handleRapidClickTilt } = await import('../../src/content.ts');
    const btn = document.createElement('button');
    btn.className = 'spin-button';
    document.body.appendChild(btn);

    for (let i = 0; i < 4; i++) {
      expect(handleRapidClickTilt(btn)).toBe(false);
    }
    expect(handleRapidClickTilt(btn)).toBe(true);
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
  });

  it('triggers Touch Grass timeout when clicking rapidly on nested child elements inside a button', async () => {
    const { handleRapidClickTilt } = await import('../../src/content.ts');
    const btn = document.createElement('button');
    btn.className = 'game-action-btn';
    const span = document.createElement('span');
    span.textContent = 'SPIN';
    btn.appendChild(span);
    document.body.appendChild(btn);

    for (let i = 0; i < 4; i++) {
      expect(handleRapidClickTilt(span)).toBe(false);
    }
    expect(handleRapidClickTilt(span)).toBe(true);
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
  });

  it('responds to window-level tilt signal and trigger timeout events', async () => {
    createChromeMock();
    const { TILTCHECK_TILT_SIGNAL_EVENT, TILTCHECK_TRIGGER_TIMEOUT_EVENT } = await import(
      '../../src/content.ts'
    );
    const { resetTouchGrassTimeoutForTests: resetTimeout } = await import(
      '../../src/touch-grass-timeout.js'
    );
    await flush();

    window.dispatchEvent(
      new CustomEvent(TILTCHECK_TILT_SIGNAL_EVENT, {
        detail: { signal: 'loss_chasing' },
      })
    );
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
    expect(document.querySelector('.tiltcheck-lockdown-reason')?.textContent).toContain(
      "You are down on consecutive spins and ramping stake size"
    );

    document.getElementById('tiltcheck-lockdown-root')?.remove();
    resetTimeout();

    window.dispatchEvent(
      new CustomEvent(TILTCHECK_TRIGGER_TIMEOUT_EVENT, {
        detail: { reason: 'Ed Craven doesn\'t need your rent money. Close the browser.' },
      })
    );
    expect(document.getElementById('tiltcheck-lockdown-root')).toBeTruthy();
    expect(document.querySelector('.tiltcheck-lockdown-reason')?.textContent).toContain(
      "Ed Craven doesn't need your rent money"
    );
  });

  it('does not install the pace lock when enforcement is off', async () => {
    createChromeMock({ tiltcheck_touch_grass_opt_in: false });
    await import('../../src/content.ts');
    await flush();
    const button = document.createElement('button');
    button.className = 'spin-button';
    button.textContent = 'Spin';
    document.body.appendChild(button);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    expect(document.getElementById('tiltcheck-pace-host')).toBeNull();
    expect(button.disabled).toBe(false);
  });

  it('installs the pace host when enforcement is on and the opt-in key is absent', async () => {
    createChromeMock();
    await import('../../src/content.ts');
    await flush();
    expect(document.getElementById('tiltcheck-pace-host')).not.toBeNull();
  });

  it('removes the pace host when enforcement turns off and installs it again when enforcement turns on', async () => {
    const { storageListeners, storageState } = createChromeMock();
    await import('../../src/content.ts');
    await flush();
    expect(document.getElementById('tiltcheck-pace-host')).not.toBeNull();

    storageState.tiltcheck_touch_grass_opt_in = false;
    for (const listener of storageListeners) {
      listener({ tiltcheck_touch_grass_opt_in: { newValue: false } }, 'local');
    }
    await flush();
    expect(document.getElementById('tiltcheck-pace-host')).toBeNull();

    storageState.tiltcheck_touch_grass_opt_in = true;
    for (const listener of storageListeners) {
      listener({ tiltcheck_touch_grass_opt_in: { oldValue: false, newValue: true } }, 'local');
    }
    await flush();
    expect(document.getElementById('tiltcheck-pace-host')).not.toBeNull();
  });

  it('handles get_deposit_barrier_state and get_reality_hud_state runtime messages', async () => {
    const { listeners } = createChromeMock();
    await import('../../src/content.ts');
    await flush();

    const depositResponse = vi.fn();
    listeners[0]!({ type: 'get_deposit_barrier_state' }, null, depositResponse);
    expect(depositResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        active: expect.any(Boolean),
        cooldownUntil: expect.any(Number),
      })
    );

    const realityResponse = vi.fn();
    listeners[0]!({ type: 'get_reality_hud_state' }, null, realityResponse);
    expect(realityResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        visible: expect.any(Boolean),
      })
    );

    const reverseResponse = vi.fn();
    listeners[0]!({ type: 'get_reverse_withdrawal_shield_state' }, null, reverseResponse);
    expect(reverseResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        active: expect.any(Boolean),
      })
    );

    const profitResponse = vi.fn();
    listeners[0]!({ type: 'get_profit_lock_state' }, null, profitResponse);
    expect(profitResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        active: expect.any(Boolean),
        peak: expect.any(Number),
      })
    );

    const bonusResponse = vi.fn();
    listeners[0]!({ type: 'get_bonus_tracker_state' }, null, bonusResponse);
    expect(bonusResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        active: expect.any(Boolean),
      })
    );

    const radarResponse = vi.fn();
    listeners[0]!({ type: 'get_session_pnl_state' }, null, radarResponse);
    expect(radarResponse).toHaveBeenCalled();

    const resetResponse = vi.fn();
    listeners[0]!({ type: 'reset_session_pnl' }, null, resetResponse);
    expect(resetResponse).toHaveBeenCalled();

    const streakStateResponse = vi.fn();
    listeners[0]!({ type: 'get_streak_volatility_state' }, null, streakStateResponse);
    expect(streakStateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        consecutiveDeadSpins: expect.any(Number),
        hitRate: expect.any(Number),
      })
    );

    const resetStreakResponse = vi.fn();
    listeners[0]!({ type: 'reset_streak_volatility' }, null, resetStreakResponse);
    expect(resetStreakResponse).toHaveBeenCalled();

    const cashoutStateResponse = vi.fn();
    listeners[0]!({ type: 'get_cashout_router_state' }, null, cashoutStateResponse);
    expect(cashoutStateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        info: expect.objectContaining({
          buttonLabel: expect.any(String),
        }),
      })
    );

    const cashoutNavResponse = vi.fn();
    listeners[0]!({ type: 'trigger_cashout_navigation' }, null, cashoutNavResponse);
    expect(cashoutNavResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        navigated: expect.any(Boolean),
      })
    );

    const vaultResponse = vi.fn();
    const claimed = listeners[0]!({ type: 'trigger_auto_vault', amount: 50 }, null, vaultResponse);
    expect(claimed).toBe(true);

    const cooldownVaultResponse = vi.fn();
    listeners[0]!({ type: 'get_cooldown_vault_state' }, null, cooldownVaultResponse);
    expect(cooldownVaultResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        active: expect.any(Boolean),
        cooldownUntil: expect.any(Number),
      })
    );
  });

  it('bridges cooldown page events into chrome.storage and runtime messages', async () => {
    const { chromeMock } = createChromeMock();
    const { installCooldownPageBridge } = await import('../../src/content.js');
    const cleanup = installCooldownPageBridge();

    const testWallet = '7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2';
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { source: 'TILTCHECK_COOLDOWN_PAGE', type: 'WALLET_CONNECTED', wallet: testWallet },
        source: window,
      })
    );
    await flush();

    expect(chromeMock.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        tiltcheck_cooldown_wallet: testWallet,
      })
    );
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'sync_cooldown_wallet',
      wallet: testWallet,
    });

    const futureTime = Math.floor(Date.now() / 1000) + 7200;
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { source: 'TILTCHECK_COOLDOWN_PAGE', type: 'LOCK_UPDATED', wallet: testWallet, endTime: futureTime },
        source: window,
      })
    );
    await flush();

    expect(chromeMock.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        tiltcheck_cooldown_active_until: futureTime * 1000,
        tiltcheck_cooldown_wallet: testWallet,
      })
    );
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'cooldown_lock_updated',
      wallet: testWallet,
      endTime: futureTime,
    });

    cleanup();
  });
});
