/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RuntimeListener = (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void;
type ActionListener = (tab: { id?: number }) => void;

function setupChromeMock() {
  const runtimeListeners: RuntimeListener[] = [];
  const actionListeners: ActionListener[] = [];
  const tabUpdatedListeners: Array<(tabId: number, changeInfo: any, tab?: any) => void> = [];
  const installListeners: Array<() => void> = [];
  const alarmListeners: Array<(alarm: { name: string }) => void> = [];
  const storageListeners: Array<(changes: any, area: string) => void> = [];
  const storageData: Record<string, any> = {};

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
      remove: vi.fn((_tabId: number) => Promise.resolve()),
      onUpdated: {
        addListener: vi.fn((listener: any) => tabUpdatedListeners.push(listener)),
      },
    },
    webNavigation: {
      onBeforeNavigate: {
        addListener: vi.fn(),
      },
    },
    alarms: {
      create: vi.fn(),
      onAlarm: {
        addListener: vi.fn((listener: (alarm: { name: string }) => void) => alarmListeners.push(listener)),
      },
    },
    storage: {
      local: {
        get: vi.fn((keys: string[], cb?: (res: any) => void) => {
          const res: Record<string, any> = {};
          for (const k of keys) res[k] = storageData[k];
          cb?.(res);
          return Promise.resolve(res);
        }),
        set: vi.fn((items: Record<string, any>, cb?: () => void) => {
          Object.assign(storageData, items);
          cb?.();
          return Promise.resolve();
        }),
      },
      onChanged: {
        addListener: vi.fn((listener: (changes: any, area: string) => void) => storageListeners.push(listener)),
      },
    },
  };

  (globalThis as any).chrome = chromeMock;
  return { chromeMock, runtimeListeners, actionListeners, installListeners, alarmListeners, storageListeners, storageData, tabUpdatedListeners };
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

    actionListeners[0]!({ id: 42 });
    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(
      42,
      { type: 'toggle_sidebar' },
      expect.any(Function),
    );
  });

  it('handles open_auth bridge/tab and open_vault messages', async () => {
    const { chromeMock, runtimeListeners } = setupChromeMock();
    await import('../../src/background.js');

    const listener = runtimeListeners[0]!;
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
        url: 'https://tiltcheck.me/autovault?amount=25',
      }),
    );
    expect(vaultResponse).toHaveBeenCalledWith({ success: true });
  });

  it('allows localhost API discord login URL for open_auth_bridge', async () => {
    const { chromeMock, runtimeListeners } = setupChromeMock();
    await import('../../src/background.js');

    const listener = runtimeListeners[0]!;
    const bridgeResponse = vi.fn();
    const keep = listener(
      { type: 'open_auth_bridge', url: 'http://localhost:8080/auth/discord/login?source=extension' },
      {},
      bridgeResponse,
    );
    expect(keep).toBe(true);
    expect(chromeMock.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('auth-bridge.html?authUrl='),
      }),
      expect.any(Function),
    );
    expect(bridgeResponse).toHaveBeenCalledWith({ success: true });
  });

  it('handles sync_cooldown_wallet and get_cooldown_sync_state messages', async () => {
    const { chromeMock, runtimeListeners, storageData } = setupChromeMock();
    await import('../../src/background.js');

    const listener = runtimeListeners[0]!;
    const testWallet = '7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2';

    // 1. sync_cooldown_wallet
    const syncRes = vi.fn();
    const keepSync = listener(
      { type: 'sync_cooldown_wallet', wallet: testWallet },
      {},
      syncRes,
    );
    expect(keepSync).toBe(true);
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      tiltcheck_cooldown_wallet: testWallet,
    });
    expect(syncRes).toHaveBeenCalledWith({ success: true, wallet: testWallet });

    // 2. Reject bad wallet
    const badRes = vi.fn();
    listener({ type: 'sync_cooldown_wallet', wallet: 'short' }, {}, badRes);
    expect(badRes).toHaveBeenCalledWith({ success: false, error: 'Invalid wallet address' });

    // 3. cooldown_lock_updated
    const updateRes = vi.fn();
    const futureSec = Math.floor(Date.now() / 1000) + 3600;
    listener(
      { type: 'cooldown_lock_updated', wallet: testWallet, endTime: futureSec },
      {},
      updateRes,
    );
    expect(updateRes).toHaveBeenCalledWith({
      success: true,
      activeUntil: futureSec * 1000,
    });
    expect(storageData['tiltcheck_cooldown_active_until']).toBe(futureSec * 1000);

    // 4. get_cooldown_sync_state
    const stateRes = vi.fn();
    listener({ type: 'get_cooldown_sync_state' }, {}, stateRes);
    expect(stateRes).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet: testWallet,
        cooldownActiveUntil: futureSec * 1000,
      }),
    );
  });

  it('creates cooldown sync alarm on startup', async () => {
    const { chromeMock } = setupChromeMock();
    await import('../../src/background.js');

    expect(chromeMock.alarms.create).toHaveBeenCalledWith(
      'tiltcheck_cooldown_sync',
      { periodInMinutes: 5 },
    );
  });

  it('refuses trigger_tilt_auto_lock unless the player confirmed it in the offer', async () => {
    const { chromeMock, runtimeListeners, storageData } = setupChromeMock();
    await import('../../src/background.js');
    const listener = runtimeListeners[0]!;
    const res = vi.fn();
    listener({ type: 'trigger_tilt_auto_lock', duration: 86400, tiltRisk: 95, openPrompt: true }, {}, res);
    expect(res).toHaveBeenCalledWith({ success: false, error: 'not_confirmed' });
    expect(storageData['tiltcheck_cooldown_active_until']).toBeUndefined();
    expect(storageData['tiltcheck_cooldown_source']).toBeUndefined();
    expect(chromeMock.tabs.create).not.toHaveBeenCalled();
  });

  it('a confirmed tilt lock can only extend a running lock, never shorten it', async () => {
    const { runtimeListeners, storageData } = setupChromeMock();
    await import('../../src/background.js');
    const listener = runtimeListeners[0]!;
    const longer = Date.now() + 7 * 86400 * 1000;
    storageData['tiltcheck_cooldown_active_until'] = longer;
    storageData['tiltcheck_cooldown_source'] = 'local_browser_session';
    listener({ type: 'trigger_tilt_auto_lock', userConfirmed: true, duration: 3600, tiltRisk: 90, openPrompt: false }, {}, vi.fn());
    expect(storageData['tiltcheck_cooldown_active_until']).toBe(longer);
    expect(storageData['tiltcheck_cooldown_source']).toBe('local_browser_session');
  });

  it('handles trigger_tilt_auto_lock and creates cooldown prompt tab', async () => {
    const { chromeMock, runtimeListeners, storageData } = setupChromeMock();
    await import('../../src/background.js');

    const listener = runtimeListeners[0]!;
    const testWallet = '7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2';
    const autoLockRes = vi.fn();

    const keep = listener(
      {
        type: 'trigger_tilt_auto_lock',
        userConfirmed: true,
        wallet: testWallet,
        duration: 86400,
        tiltRisk: 82,
        indicators: ['rage_betting', 'chasing_losses'],
        openPrompt: true,
      },
      {},
      autoLockRes,
    );

    expect(keep).toBe(true);
    expect(autoLockRes).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        wallet: testWallet,
      })
    );
    expect(storageData['tiltcheck_cooldown_wallet']).toBe(testWallet);
    expect(storageData['tiltcheck_cooldown_source']).toBe('auto_tilt');
    expect(storageData['tiltcheck_last_auto_lock']).toEqual(
      expect.objectContaining({
        tiltRisk: 82,
        duration: 86400,
        wallet: testWallet,
      })
    );
    expect(chromeMock.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('https://tiltcheck.me/cooldown?'),
      })
    );
  });

  it("intercepts Discord OAuth redirect and stores user session", async () => {
    const { chromeMock, storageData, tabUpdatedListeners } = setupChromeMock();
    const mockDiscordUser = {
      id: "123456789012345678",
      username: "degen_king",
      global_name: "Degen King",
      discriminator: "0",
      avatar: "abcdef123456",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDiscordUser),
    });
    vi.stubGlobal("fetch", fetchMock);

    await import("../../src/background.js");

    expect(tabUpdatedListeners.length).toBeGreaterThan(0);
    const onUpdated = tabUpdatedListeners[0]!;

    const testUrl = "https://collectclock-api.j-chapman7.workers.dev/auth/callback#access_token=mock_access_token_123&token_type=Bearer&state=h.mock-nonce";
    onUpdated(42, { url: testUrl }, { url: testUrl });

    // Allow async execution in the listener to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.com/api/v10/users/@me",
      expect.objectContaining({
        headers: { Authorization: "Bearer mock_access_token_123" },
      })
    );

    expect(storageData["authToken"]).toBe("mock_access_token_123");
    expect(storageData["userData"]).toEqual({
      id: "123456789012345678",
      username: "Degen King",
      discriminator: "0",
      discordId: "123456789012345678",
      avatar: "https://cdn.discordapp.com/avatars/123456789012345678/abcdef123456.png",
    });
    expect(storageData["tiltguard_user_id"]).toBe("123456789012345678");
  });
});
