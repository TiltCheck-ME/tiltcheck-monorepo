// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Guard: the Activity has no money mechanics and no crisis copy in the main UI (client, DA&D deck, trivia bank, Bluff prompts).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROMPTS, WHITE_CARDS } from '../src/shared/deck.js';
import { TRIVIA_BANK } from '../src/shared/triviaBank.js';
import { BLUFF_PROMPTS } from '../src/shared/bluffPrompts.js';

const root = new URL('..', import.meta.url).pathname;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

const BANNED = [/jackpot/i, /\bSOL\b/, /\brain\b/i, /\btips?\b/i, /wallet/i, /casino/i, /purchase/i, /\bprizes?\b/i, /\bbuy\b/i, /\$\d/, /1-800-GAMBLER/i, /\bpayout/i, /\bcash prize/i];

describe('no money anywhere', () => {
  it('client source and copy have no money words', () => {
    const src = files(join(root, 'src/client')).filter((f) => /\.(ts|css)$/.test(f));
    src.push(join(root, 'index.html'));
    for (const f of src) {
      const text = readFileSync(f, 'utf8');
      for (const re of BANNED) expect({ f, hit: re.test(text) ? re.source : null }).toEqual({ f, hit: null });
    }
  });

  it('every card is clean', () => {
    for (const c of [...PROMPTS, ...WHITE_CARDS]) for (const re of BANNED) expect({ c, hit: re.test(c) }).toEqual({ c, hit: false });
  });

  it('every trivia question and choice is clean', () => {
    for (const q of TRIVIA_BANK) {
      for (const text of [q.q, ...q.choices]) for (const re of BANNED) expect({ id: q.id, text, hit: re.test(text) ? re.source : null }).toEqual({ id: q.id, text, hit: null });
    }
  });

  it('every Bluff prompt is clean', () => {
    for (const p of BLUFF_PROMPTS) for (const re of BANNED) expect({ id: p.id, text: p.text, hit: re.test(p.text) ? re.source : null }).toEqual({ id: p.id, text: p.text, hit: null });
  });

  it('trivia bank: 80+ questions, 4 distinct choices, a valid answer, no duplicates', () => {
    expect(TRIVIA_BANK.length).toBeGreaterThanOrEqual(80);
    expect(new Set(TRIVIA_BANK.map((q) => q.id)).size).toBe(TRIVIA_BANK.length);
    expect(new Set(TRIVIA_BANK.map((q) => q.q.toLowerCase())).size).toBe(TRIVIA_BANK.length);
    for (const q of TRIVIA_BANK) {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices.map((c) => c.toLowerCase())).size).toBe(4);
      expect([0, 1, 2, 3]).toContain(q.answer);
      expect(q.q.length).toBeLessThanOrEqual(140);
    }
    // Every source the brief named made it in.
    expect(new Set(TRIVIA_BANK.map((q) => q.src))).toEqual(new Set(['arena', 'tlive', 'tg']));
  });

  it('deck is big enough for a full 8-player table', () => {
    expect(WHITE_CARDS.length).toBeGreaterThanOrEqual(8 * 7 + 8);
    expect(new Set(WHITE_CARDS).size).toBe(WHITE_CARDS.length);
    expect(PROMPTS.every((p) => p.includes('_____'))).toBe(true);
  });
});
