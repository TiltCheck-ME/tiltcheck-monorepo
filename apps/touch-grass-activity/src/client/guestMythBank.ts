// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Guest-mode Myth or Math deck: a small practice subset. The browser build swaps this in for
// src/shared/mythBank.ts (see vite.config.ts) so the full bank and its answers never ship in public
// code. Inside Discord every card comes from the worker, one at a time, answer only after you call it.
// Money-words guard: the same scoped exception as the full bank's gambling cards (tests/no-money.test.ts).
// The general practice cards live in guestMythGeneral.ts, which gets no exception.

import type { MythCard } from '../shared/mythBank.js';
import { GUEST_GENERAL_ROWS } from './guestMythGeneral.js';

type Row = [id: string, text: string, truth: boolean, why: string];

const ROWS: Row[] = [
  ['g01', "A slot that hasn't hit in a while is due.", false, "Each spin is independent. The machine doesn't remember the last thousand spins and doesn't owe you one."],
  ['g02', 'The house edge means the house comes out ahead over the long run.', true, 'The edge is built into the odds. Over many bets, results drift toward it.'],
  ['g03', 'After five reds in a row at roulette, black is more likely on the next spin.', false, 'The wheel has no memory. Every spin has the same odds as the first one.'],
  ['g10', 'Streaks are normal in random results.', true, 'Random runs clump. Long streaks show up more often than people expect.'],
  ['g20', 'Modern electronic slots use a random number generator to pick each result.', true, 'An RNG decides the outcome. The spinning reels are a display of a result already chosen.'],
  ['g27', 'RTP and house edge are two ways of saying the same thing.', true, '96% RTP means a 4% house edge. Same number, flipped.'],
  ['g38', 'Doubling your bet after every loss (the martingale) guarantees a profit.', false, 'Losing streaks happen. Table limits or your bankroll run out before the system pays off.'],
];

export const MYTH_BANK: readonly MythCard[] = [
  ...ROWS.map(([id, text, truth, why]): MythCard => ({ id, text, truth, why, kind: 'gambling' })),
  ...GUEST_GENERAL_ROWS.map(([id, text, truth, why]): MythCard => ({ id, text, truth, why, kind: 'general' })),
];

const BY_ID = new Map(MYTH_BANK.map((c) => [c.id, c]));

export function mythById(id: string): MythCard | undefined {
  return BY_ID.get(id);
}
