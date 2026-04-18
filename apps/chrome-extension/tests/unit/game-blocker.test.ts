/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18 */
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
});
