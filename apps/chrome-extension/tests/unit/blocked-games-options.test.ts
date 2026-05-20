/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */
import { describe, expect, it, vi } from 'vitest';
import {
  loadBlockedGameSlugs,
  normalizeBlockedGameSlug,
  normalizeBlockedGamesList,
  TILTCHECK_BLOCKED_GAMES_KEY,
} from '../../src/pro/blocked-games-options.js';

describe('blocked-games-options', () => {
  it('normalizes slugs', () => {
    expect(normalizeBlockedGameSlug('  Plinko  ')).toBe('plinko');
    expect(normalizeBlockedGameSlug('')).toBeNull();
  });

  it('dedupes and caps list length', () => {
    const list = normalizeBlockedGamesList(['plinko', 'PLINKO', 'mines', 42, '']);
    expect(list).toEqual(['plinko', 'mines']);
  });

  it('loads from chrome.storage.local', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [TILTCHECK_BLOCKED_GAMES_KEY]: ['plinko', 'slots'],
          }),
        },
      },
    });
    const slugs = await loadBlockedGameSlugs();
    expect(slugs).toEqual(['plinko', 'slots']);
  });
});
