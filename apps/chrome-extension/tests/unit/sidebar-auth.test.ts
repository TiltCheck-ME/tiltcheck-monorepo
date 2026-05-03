/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SidebarUI } from '../../src/sidebar/types.js';

type StorageValue = Record<string, unknown>;

class SidebarUiStub implements SidebarUI {
  public storageReads: StorageValue[] = [];
  public syncAccountUi = vi.fn();
  public showMainContent = vi.fn();
  public addFeedMessage = vi.fn();
  public setStorage = vi.fn(async (_data: Record<string, unknown>) => {});
  public updateStatus = vi.fn();
  public updateRealityCheck = vi.fn();
  public updateLicense = vi.fn();
  public updateTilt = vi.fn();
  public updateStats = vi.fn();
  public notifyBuddy = vi.fn();
  public openPremium = vi.fn(async () => {});

  async getStorage(_keys: string[]): Promise<Record<string, unknown>> {
    return this.storageReads.shift() ?? {};
  }
}

describe('Sidebar AuthManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();

    (globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    }));

    (globalThis as any).chrome = {
      runtime: {
        id: 'test-extension-id',
        sendMessage: vi.fn(),
        lastError: null,
      },
    };
  });

  it('ignores discord auth window messages because the active flow restores auth from storage polling', async () => {
    const { AuthManager } = await import('../../src/sidebar/auth.ts');
    const ui = new SidebarUiStub();
    const manager = new AuthManager(ui);
    const applySpy = vi.spyOn(manager, 'applyDiscordAuthSuccess').mockResolvedValue(undefined);

    manager.handleDiscordAuthMessage({
      origin: 'https://api.tiltcheck.me',
      data: {
        type: 'discord-auth',
        token: 'jwt-token',
        user: {
          id: 'user_123',
          username: 'tilt-user',
          discordId: 'discord_123',
        },
      },
    } as MessageEvent);

    await Promise.resolve();

    expect(applySpy).not.toHaveBeenCalled();
    expect(manager.authToken).toBeNull();
    expect(manager.userData).toBeNull();
  });

  it('starts the API auth bridge flow and restores the stored session', async () => {
    vi.useFakeTimers();

    const sendMessage = vi.fn((_message: unknown, callback: (response: { success: boolean }) => void) => {
      callback({ success: true });
    });
    (globalThis as any).chrome.runtime.sendMessage = sendMessage;

    const { AuthManager } = await import('../../src/sidebar/auth.ts');
    const ui = new SidebarUiStub();
    ui.storageReads = [
      {},
      {
        authToken: 'stored-jwt',
        userData: {
          id: 'user_456',
          username: 'stored-user',
        },
      },
    ];

    const manager = new AuthManager(ui);
    manager.startDiscordLoginFlow();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      {
        type: 'open_auth_bridge',
        url: expect.stringContaining('/auth/discord/login?'),
      },
      expect.any(Function),
    );

    const authUrl = new URL(sendMessage.mock.calls[0][0].url as string);
    expect(authUrl.searchParams.get('source')).toBe('extension');
    expect(authUrl.searchParams.get('opener_origin')).toBe('chrome-extension://test-extension-id');
    expect(authUrl.searchParams.get('ext_id')).toBe('test-extension-id');

    await vi.advanceTimersByTimeAsync(1000);

    expect(manager.authToken).toBe('stored-jwt');
    expect(manager.userData).toEqual(
      expect.objectContaining({
        id: 'user_456',
        username: 'stored-user',
        isDemo: false,
      }),
    );
    expect(manager.isAuthenticated).toBe(true);
    expect(manager.isConnecting).toBe(false);
    expect(ui.showMainContent).toHaveBeenCalled();
    expect(ui.addFeedMessage).toHaveBeenCalledWith('Opened Discord login helper tab.');
    expect(ui.addFeedMessage).toHaveBeenCalledWith('Connected: stored-user');
  });

  it('verifies stored auth against /auth/me before restoring the session', async () => {
    (globalThis as any).fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return {
          ok: true,
          json: async () => ({
            userId: 'user_789',
            email: 'verified@tiltcheck.me',
            discordId: 'discord_789',
            discordUsername: 'verified-user',
          }),
        };
      }

      return {
        ok: false,
        json: async () => ({}),
      };
    });

    const { AuthManager } = await import('../../src/sidebar/auth.ts');
    const ui = new SidebarUiStub();
    ui.storageReads = [
      {
        authToken: 'stored-jwt',
        userData: {
          id: 'stale-user',
          username: 'stale-name',
        },
      },
    ];

    const manager = new AuthManager(ui);
    const restored = await manager.restoreAuth();

    expect(restored).toBe(true);
    expect(manager.authToken).toBe('stored-jwt');
    expect(manager.userData).toEqual(
      expect.objectContaining({
        id: 'user_789',
        username: 'verified-user',
        discordId: 'discord_789',
        email: 'verified@tiltcheck.me',
        isDemo: false,
      }),
    );
    expect(ui.setStorage).toHaveBeenCalledWith({
      authToken: 'stored-jwt',
      userData: {
        id: 'user_789',
        username: 'verified-user',
        email: 'verified@tiltcheck.me',
        discordId: 'discord_789',
        discordUsername: 'verified-user',
        walletAddress: null,
      },
      tiltguard_user_id: 'user_789',
    });
    expect(ui.showMainContent).toHaveBeenCalled();
  });

  it('normalizes legacy snake_case wallet fields into walletAddress', async () => {
    const { AuthManager } = await import('../../src/sidebar/auth.ts');
    const ui = new SidebarUiStub();
    const manager = new AuthManager(ui);

    await manager.applyDiscordAuthSuccess('jwt-token', {
      id: 'user_999',
      username: 'wallet-user',
      wallet_address: 'Wallet111111111111111111111111111111111',
    });

    expect(manager.userData).toEqual(expect.objectContaining({
      walletAddress: 'Wallet111111111111111111111111111111111',
    }));
    expect(ui.setStorage).toHaveBeenCalledWith(expect.objectContaining({
      userData: expect.objectContaining({
        walletAddress: 'Wallet111111111111111111111111111111111',
      }),
    }));
  });

  it('clears stale stored auth when /auth/me no longer accepts the token', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'unauthorized' }),
    }));

    const { AuthManager } = await import('../../src/sidebar/auth.ts');
    const ui = new SidebarUiStub();
    ui.storageReads = [
      {
        authToken: 'expired-jwt',
        userData: {
          id: 'stale-user',
          username: 'stale-name',
        },
      },
    ];

    const manager = new AuthManager(ui);
    const restored = await manager.restoreAuth();

    expect(restored).toBe(false);
    expect(manager.authToken).toBeNull();
    expect(manager.userData).toBeNull();
    expect(manager.demoMode).toBe(true);
    expect(ui.setStorage).toHaveBeenCalledWith({
      authToken: null,
      userData: null,
      tiltguard_user_id: null,
    });
    expect(ui.addFeedMessage).toHaveBeenCalledWith('Saved sign-in could not be verified. Connect Discord again.');
  });

  it('logs out through the API before clearing local auth state', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true }),
    }));
    (globalThis as any).fetch = fetchMock;

    const { AuthManager } = await import('../../src/sidebar/auth.ts');
    const ui = new SidebarUiStub();
    const manager = new AuthManager(ui);
    manager.authToken = 'active-jwt';
    manager.userData = {
      id: 'user_123',
      username: 'tilt-user',
      discordId: 'discord_123',
    };
    manager.isAuthenticated = true;

    await manager.logout();

    expect(fetchMock).toHaveBeenCalledWith('https://api.tiltcheck.me/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: 'Bearer active-jwt' },
    });
    expect(ui.setStorage).toHaveBeenCalledWith({
      authToken: null,
      userData: null,
      tiltguard_user_id: null,
    });
    expect(manager.authToken).toBeNull();
    expect(manager.userData).toBeNull();
    expect(manager.demoMode).toBe(true);
    expect(ui.addFeedMessage).toHaveBeenCalledWith('Logged out successfully.');
  });

  it('resets the connecting state when the auth bridge cannot be opened', async () => {
    const sendMessage = vi.fn((_message: unknown, callback: (response: { success: boolean }) => void) => {
      callback({ success: false });
    });
    (globalThis as any).chrome.runtime.sendMessage = sendMessage;

    const { AuthManager } = await import('../../src/sidebar/auth.ts');
    const ui = new SidebarUiStub();
    const manager = new AuthManager(ui);

    manager.startDiscordLoginFlow();

    expect(manager.isConnecting).toBe(false);
    expect(ui.addFeedMessage).toHaveBeenCalledWith('Discord login tab could not be opened. Double check popup blockers.');
    expect(ui.syncAccountUi).toHaveBeenCalled();
  });
});
