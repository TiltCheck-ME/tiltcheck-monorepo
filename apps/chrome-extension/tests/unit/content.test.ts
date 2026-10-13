/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 */
/**
 * @vitest-environment jsdom
 * Core content script — pace lock when enforcement is on, cover stays out.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  });

  it('registers a runtime message handler', async () => {
    const { listeners } = createChromeMock();
    await import('../../src/content.ts');
    await flush();
    expect(listeners).toHaveLength(1);
  });

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

  it('does not call the full-screen cover from Core', async () => {
    const nodeUrl = await import('node:url');
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new nodeUrl.URL('../../src/content.ts', import.meta.url), 'utf8')
    );
    expect(source).not.toContain('triggerTouchGrassTimeout');
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
});
