// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Guest-mode Daily Grass words. The browser build swaps this in for src/shared/dailyWords.ts (see
// vite.config.ts) so the real answer list and dictionary never ship to clients. Guest mode is
// practice only: a short local list, and any five letters count as a guess. Inside Discord the
// worker holds the answer and checks every guess against the full dictionary.

export const DAILY_ANSWERS: readonly string[] = ['grove', 'lemon', 'otter', 'plush', 'quilt', 'crisp', 'maple', 'tulip', 'zebra', 'ember'];

/** Practice mode: any five letters A to Z. */
export function isValidGuess(word: string): boolean {
  return /^[a-z]{5}$/.test(word);
}

export const DAILY_WORDS_KIND: 'server' | 'guest' = 'guest';
