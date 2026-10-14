// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

import { describe, expect, it } from 'vitest';
import { mapTriviaStatus } from './map-trivia-status';

describe('mapTriviaStatus', () => {
  it('paints LIVE DROP only when activeGame is present', () => {
    const status = mapTriviaStatus({
      ok: true,
      activeGame: {
        gameId: 'g1',
        settings: { startTime: 1_700_000_000_000, theme: 'RTP trivia', prizePool: 2 },
      },
    });
    expect(status).toEqual({
      kind: 'live',
      label: 'LIVE DROP',
      drop: {
        gameId: 'g1',
        theme: 'RTP trivia',
        startTime: 1_700_000_000_000,
        prizePool: 2,
        joinHref: '/touch-grass/trivia',
      },
    });
  });

  it('idles when the feed returns a null activeGame', () => {
    expect(mapTriviaStatus({ ok: true, activeGame: null }).kind).toBe('idle');
    expect(mapTriviaStatus({ ok: true, activeGame: null }).label).toBe(
      'No drop running. Play a practice table or wait.',
    );
  });

  it('does not invent LIVE when the feed is down', () => {
    const status = mapTriviaStatus({ ok: false });
    expect(status.kind).toBe('unknown');
    expect(status.label).toBe('round status unknown.');
    expect(status.drop).toBeNull();
  });
});
