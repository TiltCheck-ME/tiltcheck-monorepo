// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18
/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { DiscordSDKMock } = vi.hoisted(() => ({
  DiscordSDKMock: vi.fn(),
}));

vi.mock('@discord/embedded-app-sdk', () => ({
  DiscordSDK: DiscordSDKMock,
  Events: {
    ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE: 'ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE',
    VOICE_STATE_UPDATE: 'VOICE_STATE_UPDATE',
    ORIENTATION_UPDATE: 'ORIENTATION_UPDATE',
  },
}));

import { DiscordBridge } from '../src/sdk/DiscordBridge.js';

function createSdkMock() {
  return {
    clientId: 'client-id',
    channelId: 'channel-1',
    ready: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    commands: {
      authorize: vi.fn().mockResolvedValue({ code: 'discord-auth-code' }),
      authenticate: vi.fn().mockResolvedValue({
        user: {
          id: 'user-1',
          username: 'TiltCheck',
        },
      }),
      openExternalLink: vi.fn().mockResolvedValue(undefined),
      openInviteDialog: vi.fn().mockResolvedValue(undefined),
      setActivity: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe('DiscordBridge', () => {
  beforeEach(() => {
    DiscordSDKMock.mockReset();
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ access_token: 'activity-token' }),
    }));
  });

  it('does not construct the Discord SDK before initialization', () => {
    const bridge = new DiscordBridge('client-id');

    expect(bridge.getState()).toMatchObject({
      userId: '',
      username: 'Anonymous',
      channelId: null,
    });
    expect(DiscordSDKMock).not.toHaveBeenCalled();
  });

  it('falls back cleanly when the Discord SDK constructor rejects outside Discord', async () => {
    DiscordSDKMock.mockImplementation(function MockDiscordSDK() {
      throw new Error('frame_id query param is not defined');
    });

    const bridge = new DiscordBridge('client-id');
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    await expect(bridge.initialize()).rejects.toThrow(
      'Discord SDK unavailable outside Discord: frame_id query param is not defined'
    );
    await expect(bridge.openExternalLink('https://hub.tiltcheck.me')).resolves.toBeUndefined();
    await expect(bridge.inviteUserToActivity()).resolves.toBeUndefined();
    await expect(bridge.setRichPresence('demo', 'safe mode')).resolves.toBeUndefined();

    expect(openSpy).toHaveBeenCalledWith('https://hub.tiltcheck.me', '_blank', 'noopener,noreferrer');
    expect(bridge.getAccessToken()).toBeNull();
  });

  it('preserves the real Discord initialization path when the SDK is available', async () => {
    const sdk = createSdkMock();
    DiscordSDKMock.mockImplementation(function MockDiscordSDK() {
      return sdk;
    });

    const bridge = new DiscordBridge('client-id');
    const state = await bridge.initialize();

    expect(DiscordSDKMock).toHaveBeenCalledWith('client-id');
    expect(sdk.commands.authorize).toHaveBeenCalledWith({
      client_id: 'client-id',
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify', 'rpc.activities.write'],
    });
    expect(sdk.commands.authenticate).toHaveBeenCalledWith({ access_token: 'activity-token' });
    expect(sdk.subscribe).toHaveBeenCalledTimes(3);
    expect(state).toMatchObject({
      userId: 'user-1',
      username: 'TiltCheck',
      channelId: 'channel-1',
      orientation: 'landscape',
    });
    expect(bridge.getAccessToken()).toBe('activity-token');
  });
});
