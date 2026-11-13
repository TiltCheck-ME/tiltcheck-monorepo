// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
import { createDad, submit, type DadState } from '../src/shared/dad.js';
import { makeRng, type Rng } from '../src/shared/rng.js';

export function table(players: string[], n = 1): { s: DadState; rng: Rng } {
  const s = createDad();
  for (const p of players) s.seats.push(p);
  return { s, rng: makeRng(n) };
}

/** Everyone except the judge plays their first card. */
export function allSubmit(s: DadState, rng: Rng): void {
  for (const id of s.seats) {
    if (id === s.judgeId || s.submissions[id]) continue;
    const card = s.hands[id]?.[0];
    if (!card) throw new Error(`no card for ${id}`);
    const r = submit(s, id, card.id, rng);
    if (!r.ok) throw new Error(`submit failed: ${r.code}`);
  }
}
