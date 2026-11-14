// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// DA&D millennial mix: the new cards are in the real deck, mixed with the gambling cards, and stay party-safe.
import { describe, expect, it } from 'vitest';
import { MILLENNIAL_PROMPTS, MILLENNIAL_WHITE_CARDS, PROMPTS, WHITE_CARDS, BLANK, promptCards, whiteCards } from '../src/shared/deck.js';

/** Gambling words the millennial cards should not lean on (they are the non-gambling half of the deck). */
const GAMBLING = [/\bspins?\b/i, /\bslots?\b/i, /\bbet/i, /\bdegen/i, /\btilt/i, /\bbankroll/i, /\bRTP\b/, /\bbonus/i, /variance/i, /\bodds\b/i];
/** Party-safe floor: nothing sexual, no slurs, no drugs. A blunt word list, not a filter for everything. */
const UNSAFE = [/\bsex/i, /\bnude/i, /\bnaked/i, /\bporn/i, /\bboob/i, /\bdick\b/i, /\bweed\b/i, /\bcocaine\b/i, /\bdrunk\b/i, /\bkill\b/i, /\bretard/i, /\bfag/i];

describe('DA&D millennial mix', () => {
  it('is a real batch: 30+ prompts and 75+ answers', () => {
    expect(MILLENNIAL_PROMPTS.length).toBeGreaterThanOrEqual(30);
    expect(MILLENNIAL_WHITE_CARDS.length).toBeGreaterThanOrEqual(75);
  });

  it('is shuffled into the same deck as the gambling cards, not a separate mode', () => {
    for (const p of MILLENNIAL_PROMPTS) expect(PROMPTS).toContain(p);
    for (const w of MILLENNIAL_WHITE_CARDS) expect(WHITE_CARDS).toContain(w);
    // The gambling cards are still there and still the bigger half of the answers.
    expect(PROMPTS.length - MILLENNIAL_PROMPTS.length).toBeGreaterThanOrEqual(30);
    expect(WHITE_CARDS.length - MILLENNIAL_WHITE_CARDS.length).toBeGreaterThanOrEqual(80);
    expect(promptCards()).toHaveLength(PROMPTS.length);
    expect(whiteCards()).toHaveLength(WHITE_CARDS.length);
  });

  it('every prompt has exactly one blank; no duplicates anywhere in the deck', () => {
    for (const p of MILLENNIAL_PROMPTS) expect({ p, blanks: p.split(BLANK).length - 1 }).toEqual({ p, blanks: 1 });
    expect(new Set(PROMPTS.map((p) => p.toLowerCase())).size).toBe(PROMPTS.length);
    expect(new Set(WHITE_CARDS.map((w) => w.toLowerCase())).size).toBe(WHITE_CARDS.length);
  });

  it('stays off gambling and stays party-safe', () => {
    for (const c of [...MILLENNIAL_PROMPTS, ...MILLENNIAL_WHITE_CARDS]) {
      for (const re of [...GAMBLING, ...UNSAFE]) expect({ c, hit: re.test(c) ? re.source : null }).toEqual({ c, hit: null });
    }
  });

  it('fits on a card: answers 60 chars max, prompts 80 max', () => {
    for (const w of MILLENNIAL_WHITE_CARDS) expect({ w, n: w.length <= 60 }).toEqual({ w, n: true });
    for (const p of MILLENNIAL_PROMPTS) expect({ p, n: p.length <= 80 }).toEqual({ p, n: true });
  });
});
