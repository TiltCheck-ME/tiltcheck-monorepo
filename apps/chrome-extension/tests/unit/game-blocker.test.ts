/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GameBlocker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    window.sessionStorage.clear();

    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          blockedGameIds: ['blocked-game'],
          blockedCategories: [],
          blockedProviders: [],
          blockedCasinos: [],
          exclusions: [{ gameId: 'blocked-game', reason: 'Stop punting.' }],
        },
      }),
    }));
  });

  it('keeps a session dismissal sticky across blocker reinitialization', async () => {
    const { GameBlocker } = await import('../../src/game-blocker.ts');

    window.history.pushState({}, '', '/casino/blocked-game');

    const blocker = new GameBlocker('discord-1', 'token-1');
    await blocker.init();
    expect(document.getElementById('tiltcheck-game-block-overlay')).toBeTruthy();

    document.getElementById('tc-block-dismiss')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('tiltcheck-game-block-overlay')).toBeNull();

    const nextBlocker = new GameBlocker('discord-1', 'token-1');
    await nextBlocker.init();
    expect(document.getElementById('tiltcheck-game-block-overlay')).toBeNull();

    blocker.destroy();
    nextBlocker.destroy();
  });

  it('blocks a casino-level exclusion from the current hostname', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          blockedGameIds: [],
          blockedCategories: [],
          blockedProviders: [],
          blockedCasinos: ['localhost'],
          exclusions: [{ casino: 'localhost', reason: 'Whole site is cooked.' }],
        },
      }),
    }));

    const { GameBlocker } = await import('../../src/game-blocker.ts');
    window.history.pushState({}, '', '/casino/lobby');

    const blocker = new GameBlocker('discord-1', 'token-1');
    await blocker.init();

    expect(document.getElementById('tiltcheck-game-block-overlay')).toBeTruthy();
    blocker.destroy();
  });

  it('blocks a provider-level exclusion from provider metadata', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          blockedGameIds: [],
          blockedCategories: [],
          blockedProviders: ['pragmatic-play'],
          blockedCasinos: [],
          exclusions: [{ provider: 'pragmatic-play', reason: 'Provider tilt.' }],
        },
      }),
    }));
    document.body.innerHTML = '<div data-provider="Pragmatic Play"></div>';

    const { GameBlocker } = await import('../../src/game-blocker.ts');
    const blocker = new GameBlocker('discord-1', 'token-1');
    await blocker.init();

    expect(document.getElementById('tiltcheck-game-block-overlay')).toBeTruthy();
    blocker.destroy();
  });

  it('refreshes exclusions when the user returns to the tab', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            blockedGameIds: [],
            blockedCategories: [],
            blockedProviders: [],
            blockedCasinos: [],
            exclusions: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            blockedGameIds: ['blocked-game'],
            blockedCategories: [],
            blockedProviders: [],
            blockedCasinos: [],
            exclusions: [{ gameId: 'blocked-game', reason: 'Back from setup.' }],
          },
        }),
      });

    (globalThis as any).fetch = fetchMock;

    const { GameBlocker } = await import('../../src/game-blocker.ts');
    window.history.pushState({}, '', '/casino/blocked-game');

    const blocker = new GameBlocker('discord-1', 'token-1');
    try {
      await blocker.init();
      expect(document.getElementById('tiltcheck-game-block-overlay')).toBeNull();

      window.dispatchEvent(new Event('focus'));

      expect(fetchMock).toHaveBeenCalledTimes(2);
      await vi.waitFor(() => {
        expect(document.getElementById('tiltcheck-game-block-overlay')).toBeTruthy();
      });
    } finally {
      blocker.destroy();
    }
  });
});
