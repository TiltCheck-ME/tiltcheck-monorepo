/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */
import { describe, expect, it } from 'vitest';
import { loungeTriviaCard } from '../src/lounge/trivia-bridge.js';

describe('lounge trivia bridge', () => {
  it('reuses arena trivia instead of inventing a second game', () => {
    expect(loungeTriviaCard(null).active).toBe(false);
    expect(loungeTriviaCard(null).note).toMatch(/No entry fees/);
    expect(loungeTriviaCard({ gameId: 'g1', playerCount: 4 })).toEqual({
      active: true,
      gameId: 'g1',
      playerCount: 4,
      note: 'Live trivia is the arena game. Prizes, if any, come from the host. No entry fees.',
    });
  });
});
