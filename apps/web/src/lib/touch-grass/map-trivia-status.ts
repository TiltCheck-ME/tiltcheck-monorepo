// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

export type TriviaLiveGame = {
  gameId: string;
  settings: {
    startTime: number;
    theme: string;
    prizePool: number;
  };
};

export type TriviaStatusInput =
  | { ok: false }
  | { ok: true; activeGame: TriviaLiveGame | null };

export type TriviaRoundStatus =
  | {
      kind: 'live';
      drop: {
        gameId: string;
        theme: string;
        startTime: number;
        prizePool: number;
        joinHref: '/touch-grass/trivia';
      };
      label: 'LIVE DROP';
    }
  | { kind: 'idle'; drop: null; label: 'No drop running. Play a practice table or wait.' }
  | { kind: 'unknown'; drop: null; label: 'round status unknown.' };

export function mapTriviaStatus(input: TriviaStatusInput): TriviaRoundStatus {
  if (!input.ok) {
    return { kind: 'unknown', drop: null, label: 'round status unknown.' };
  }

  if (input.activeGame === null) {
    return {
      kind: 'idle',
      drop: null,
      label: 'No drop running. Play a practice table or wait.',
    };
  }

  const { gameId, settings } = input.activeGame;
  return {
    kind: 'live',
    label: 'LIVE DROP',
    drop: {
      gameId,
      theme: settings.theme,
      startTime: settings.startTime,
      prizePool: settings.prizePool,
      joinHref: '/touch-grass/trivia',
    },
  };
}
