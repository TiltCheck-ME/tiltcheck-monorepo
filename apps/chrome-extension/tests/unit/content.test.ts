/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */
/**
 * @vitest-environment jsdom
 * Core content script — TiltDetector + Touch Grass path when Pro monolith is off.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type OnMessageHandler = (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void;

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

function createChromeMock(initialStorage: Record<string, unknown> = {}) {
  const listeners: OnMessageHandler[] = [];
  const storageState: Record<string, unknown> = { ...initialStorage };
  const chromeMock = {
    runtime: {
      onMessage: {
        addListener: vi.fn((handler: OnMessageHandler) => listeners.push(handler)),
      },
      sendMessage: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn((keys: string[] | string, callback?: (value: unknown) => void) => {
          const result = Array.isArray(keys)
            ? Object.fromEntries(keys.map((k) => [k, storageState[k] ?? null]))
            : { [keys]: storageState[keys] ?? null };
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
  return { chromeMock, listeners, storageState };
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
});
