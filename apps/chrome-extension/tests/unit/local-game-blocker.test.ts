/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TILTCHECK_BLOCKED_GAMES_KEY,
  TILTCHECK_GAME_BLOCK_OPT_IN_KEY,
} from '../../src/pro/blocked-games-options.js';

function stubChromeStorage(initial: Record<string, unknown> = {}) {
  const storagePayload: Record<string, unknown> = {
    [TILTCHECK_BLOCKED_GAMES_KEY]: ['plinko'],
    [TILTCHECK_GAME_BLOCK_OPT_IN_KEY]: true,
    ...initial,
  };
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (keys?: string | string[]) => {
          if (!keys) return { ...storagePayload };
          const keyList = typeof keys === 'string' ? [keys] : keys;
          return Object.fromEntries(
            keyList.map((k) => [k, storagePayload[k] ?? null])
          );
        }),
        set: vi.fn(async (data: Record<string, unknown>) => {
          Object.assign(storagePayload, data);
        }),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  });
  return storagePayload;
}

describe('LocalGameBlocker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    stubChromeStorage();
  });

  it('matches blocked game in URL path', async () => {
    const { LocalGameBlocker } = await import('../../src/pro/local-game-blocker.ts');
    const blocker = new LocalGameBlocker();
    expect(blocker.matchUrl('https://stake.us/casino/games/plinko', ['plinko'])).toBe('plinko');
    expect(blocker.matchUrl('https://stake.us/casino/lobby', ['plinko'])).toBeNull();
  });

  it('does not block when game-block opt-in is false', async () => {
    stubChromeStorage({
      [TILTCHECK_BLOCKED_GAMES_KEY]: ['plinko'],
      [TILTCHECK_GAME_BLOCK_OPT_IN_KEY]: false,
    });
    const { LocalGameBlocker } = await import('../../src/pro/local-game-blocker.ts');
    window.history.pushState({}, '', '/casino/games/plinko');
    const blocker = new LocalGameBlocker();
    await blocker.init();
    expect(document.getElementById('tiltcheck-local-game-block-overlay')).toBeNull();
    blocker.destroy();
  });

  it('injects URL overlay when navigating to a blocked game', async () => {
    const { LocalGameBlocker } = await import('../../src/pro/local-game-blocker.ts');
    window.history.pushState({}, '', '/casino/games/plinko');

    const blocker = new LocalGameBlocker();
    await blocker.init();

    expect(document.getElementById('tiltcheck-local-game-block-overlay')).toBeTruthy();
    blocker.destroy();
  });

  it('does not scan when mutations only touch the lockdown overlay', async () => {
    const { LocalGameBlocker } = await import('../../src/pro/local-game-blocker.ts');
    window.history.pushState({}, '', '/casino');

    document.body.innerHTML = `
      <a href="/casino/games/plinko" data-testid="game-card-plinko">Plinko</a>
      <div id="tiltcheck-lockdown-root"></div>
    `;

    const blocker = new LocalGameBlocker();
    await blocker.init();

    const plinkoLink = document.querySelector('a[data-testid="game-card-plinko"]') as HTMLAnchorElement;
    expect(plinkoLink?.getAttribute('data-tiltcheck-local-blocked')).toBe('plinko');

    const lockdown = document.getElementById('tiltcheck-lockdown-root')!;
    lockdown.appendChild(document.createElement('span'));

    expect(plinkoLink?.getAttribute('data-tiltcheck-local-blocked')).toBe('plinko');
    blocker.destroy();
  });

  it('redacts game cards in the lobby grid', async () => {
    const { LocalGameBlocker } = await import('../../src/pro/local-game-blocker.ts');
    window.history.pushState({}, '', '/casino');

    document.body.innerHTML = `
      <a href="/casino/games/plinko" data-testid="game-card-plinko">Plinko</a>
      <a href="/casino/games/blackjack">Blackjack</a>
    `;

    const blocker = new LocalGameBlocker();
    await blocker.init();

    const plinkoLink = document.querySelector('a[data-testid="game-card-plinko"]') as HTMLAnchorElement;
    expect(plinkoLink?.getAttribute('data-tiltcheck-local-blocked')).toBe('plinko');
    expect(plinkoLink?.textContent).toContain('[ GAME EXCLUDED ]');
    expect(plinkoLink?.getAttribute('href')).toBeNull();

    const blackjack = document.querySelector('a[href="/casino/games/blackjack"]');
    expect(blackjack?.getAttribute('data-tiltcheck-local-blocked')).toBeNull();

    blocker.destroy();
  });
});
