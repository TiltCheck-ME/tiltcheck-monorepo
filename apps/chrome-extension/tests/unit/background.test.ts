import { beforeEach, describe, expect, it, vi } from 'vitest';

type RuntimeListener = (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void;
type ActionListener = (tab: { id?: number }) => void;

function setupChromeMock() {
  const runtimeListeners: RuntimeListener[] = [];
  const actionListeners: ActionListener[] = [];
  const installListeners: Array<() => void> = [];

  const chromeMock = {
    runtime: {
      lastError: null as { message: string } | null,
      getURL: vi.fn((path: string) => `chrome-extension://test-ext-id/${path}`),
      onInstalled: {
        addListener: vi.fn((listener: () => void) => installListeners.push(listener)),
      },
      onMessage: {
        addListener: vi.fn((listener: RuntimeListener) => runtimeListeners.push(listener)),
      },
    },
    action: {
      onClicked: {
        addListener: vi.fn((listener: ActionListener) => actionListeners.push(listener)),
      },
    },
    tabs: {
      sendMessage: vi.fn((_tabId: number, _message: any, callback?: () => void) => callback?.()),
      create: vi.fn((_opts: any, callback?: () => void) => callback?.()),
    },
  };

  (globalThis as any).chrome = chromeMock;
  return { chromeMock, runtimeListeners, actionListeners, installListeners };
}

describe('background service worker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('registers listeners and toggles sidebar from action click', async () => {
    const { chromeMock, actionListeners, installListeners, runtimeListeners } = setupChromeMock();
    await import('../../src/background.js');

    expect(installListeners).toHaveLength(1);
    expect(actionListeners).toHaveLength(1);
    expect(runtimeListeners).toHaveLength(1);

    actionListeners[0]({ id: 42 });
    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(
      42,
      { type: 'toggle_sidebar' },
      expect.any(Function),
    );
  });

  it('handles open_auth bridge/tab and open_vault messages', async () => {
    const { chromeMock, runtimeListeners } = setupChromeMock();
    await import('../../src/background.js');

    const listener = runtimeListeners[0];
    const bridgeResponse = vi.fn();
    const bridgeKeepChannel = listener(
      { type: 'open_auth_bridge', url: 'https://api.tiltcheck.me/auth/discord/login' },
      { tab: { windowId: 7, index: 2 } },
      bridgeResponse,
    );
    expect(bridgeKeepChannel).toBe(true);
    expect(chromeMock.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('chrome-extension://test-ext-id/auth-bridge.html?authUrl='),
        active: true,
        windowId: 7,
        index: 3,
      }),
      expect.any(Function),
    );
    expect(bridgeResponse).toHaveBeenCalledWith({ success: true });

    const invalidBridgeResponse = vi.fn();
    const invalidBridgeImmediate = listener(
      { type: 'open_auth_bridge', url: 'https://evil.example/auth/discord/login' },
      { tab: { windowId: 7, index: 2 } },
      invalidBridgeResponse,
    );
    expect(invalidBridgeImmediate).toBe(false);
    expect(invalidBridgeResponse).toHaveBeenCalledWith({ success: false, error: 'Invalid auth URL' });

    const authResponse = vi.fn();
    const keepChannel = listener(
      { type: 'open_auth_tab', url: 'https://discord.com/oauth2/authorize' },
      { tab: { windowId: 7, index: 2 } },
      authResponse,
    );
    expect(keepChannel).toBe(true);
    expect(chromeMock.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://discord.com/oauth2/authorize',
        active: true,
        windowId: 7,
        index: 3,
      }),
      expect.any(Function),
    );
    expect(authResponse).toHaveBeenCalledWith({ success: true });

    const vaultResponse = vi.fn();
    const immediate = listener(
      { type: 'open_vault', data: { suggestedAmount: 25 } },
      {},
      vaultResponse,
    );
    expect(immediate).toBe(false);
    expect(chromeMock.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://tiltcheck.me/vault?amount=25',
      }),
    );
    expect(vaultResponse).toHaveBeenCalledWith({ success: true });
  });
});
