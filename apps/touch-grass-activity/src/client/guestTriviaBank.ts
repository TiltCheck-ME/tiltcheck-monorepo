// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Guest-mode trivia deck. The browser build swaps this in for src/shared/triviaBank.ts (see
// vite.config.ts) so the real bank and its answers never ship to clients. Inside Discord every
// question and answer comes from the worker, one at a time, answer only at the reveal.
// None of these questions are in the real bank.

import type { TriviaQuestion } from '../shared/triviaBank.js';

type Row = [string, [string, string, string, string], 0 | 1 | 2 | 3];

const ROWS: Row[] = [
  ['Guest demo: how many legs does a spider have?', ['6', '8', '10', '12'], 1],
  ['Guest demo: which color do you get mixing blue and yellow?', ['Purple', 'Orange', 'Green', 'Brown'], 2],
  ['Guest demo: how many days are in a leap year?', ['364', '365', '366', '367'], 2],
  ['Guest demo: what is 7 x 8?', ['54', '56', '58', '64'], 1],
  ['Guest demo: which is the closest star to Earth?', ['Sirius', 'The Sun', 'Polaris', 'Vega'], 1],
  ['Guest demo: how many continents are there?', ['5', '6', '7', '8'], 2],
  ['Guest demo: what do bees make?', ['Honey', 'Silk', 'Wax paper', 'Milk'], 0],
  ['Guest demo: which way does the sun rise?', ['North', 'South', 'East', 'West'], 2],
  ['Guest demo: how many hours are in a day?', ['12', '20', '24', '36'], 2],
  ['Guest demo: what is frozen water called?', ['Steam', 'Ice', 'Fog', 'Dew'], 1],
];

export const TRIVIA_BANK: readonly TriviaQuestion[] = ROWS.map(([q, choices, answer], i) => ({
  id: `g${String(i + 1).padStart(3, '0')}`,
  cat: 'general',
  src: 'tg',
  q,
  choices,
  answer,
}));

const BY_ID = new Map(TRIVIA_BANK.map((x) => [x.id, x]));

export function triviaById(id: string): TriviaQuestion | undefined {
  return BY_ID.get(id);
}
