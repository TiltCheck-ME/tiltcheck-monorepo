// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Guard: the Activity has no money mechanics and no crisis copy in the main UI (client, DA&D deck, trivia bank, Bluff prompts).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROMPTS, WHITE_CARDS } from '../src/shared/deck.js';
import { TRIVIA_BANK } from '../src/shared/triviaBank.js';
import { BLUFF_PROMPTS } from '../src/shared/bluffPrompts.js';
import { MYTH_BANK } from '../src/shared/mythBank.js';
import { MYTH_BANK as GUEST_MYTH } from '../src/client/guestMythBank.js';
import { DAILY_ANSWERS } from '../src/shared/dailyWords.js';
import { COPY } from '../src/client/copy.js';

const root = new URL('..', import.meta.url).pathname;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

const BANNED = [/jackpot/i, /\bSOL\b/, /\brain\b/i, /\btips?\b/i, /wallet/i, /casino/i, /purchase/i, /\bprizes?\b/i, /\bbuy\b/i, /\$\d/, /1-800-GAMBLER/i, /\bpayout/i, /\bcash prize/i];

/**
 * The one scoped exception: Myth or Math has to talk about jackpots and payouts to bust myths about
 * them. Only these two patterns, only in these two files (the full bank and the guest practice
 * subset). Everything else in BANNED still applies to them, and nothing else gets the exception.
 */
const MYTH_ALLOWED = new Set([/jackpot/i.source, /\bpayout/i.source]);
const MYTH_FILES = new Set([join(root, 'src/shared/mythBank.ts'), join(root, 'src/client/guestMythBank.ts')]);
/** The general Myth or Math cards live in their own files, which get no exception at all. */
const GENERAL_FILES = [join(root, 'src/shared/mythGeneral.ts'), join(root, 'src/client/guestMythGeneral.ts')];
function bannedFor(file: string | 'myth-card'): RegExp[] {
  return file === 'myth-card' || MYTH_FILES.has(file) ? BANNED.filter((re) => !MYTH_ALLOWED.has(re.source)) : BANNED;
}

describe('no money anywhere', () => {
  it('client source and copy have no money words', () => {
    const src = files(join(root, 'src/client')).filter((f) => /\.(ts|css)$/.test(f));
    src.push(join(root, 'index.html'));
    for (const f of src) {
      const text = readFileSync(f, 'utf8');
      for (const re of bannedFor(f)) expect({ f, hit: re.test(text) ? re.source : null }).toEqual({ f, hit: null });
    }
  });

  it('Myth or Math cards: gambling cards clean except the scoped jackpot/payout exception; general cards get no exception', () => {
    for (const c of [...MYTH_BANK, ...GUEST_MYTH]) {
      const list = c.kind === 'gambling' ? bannedFor('myth-card') : BANNED;
      for (const text of [c.text, c.why]) for (const re of list) expect({ id: c.id, text, hit: re.test(text) ? re.source : null }).toEqual({ id: c.id, text, hit: null });
    }
    // The whole source files too (comments included).
    for (const f of MYTH_FILES) for (const re of bannedFor(f)) expect({ f, hit: re.test(readFileSync(f, 'utf8')) ? re.source : null }).toEqual({ f, hit: null });
    for (const f of GENERAL_FILES) for (const re of BANNED) expect({ f, hit: re.test(readFileSync(f, 'utf8')) ? re.source : null }).toEqual({ f, hit: null });
  });

  it('the exception is scoped: two patterns, two files, nowhere else', () => {
    expect(bannedFor('myth-card')).toHaveLength(BANNED.length - 2);
    expect(bannedFor(join(root, 'src/client/copy.ts'))).toBe(BANNED);
    expect(bannedFor(join(root, 'src/client/views/myth.ts'))).toBe(BANNED);
    expect(bannedFor(join(root, 'src/shared/myth.ts'))).toBe(BANNED);
    for (const f of GENERAL_FILES) expect(bannedFor(f)).toBe(BANNED);
    // The gambling cards really use the lifted words, so the split matters.
    expect(MYTH_BANK.filter((c) => c.kind === 'gambling' && /jackpot|payout/i.test(c.text + c.why)).length).toBeGreaterThan(0);
    // The exception really does lift only jackpot/payout: a wallet or a dollar amount in a card would still fail.
    const scoped = bannedFor('myth-card');
    expect(scoped.some((re) => re.test('a progressive jackpot'))).toBe(false);
    expect(scoped.some((re) => re.test('check your wallet'))).toBe(true);
    expect(scoped.some((re) => re.test('win $5'))).toBe(true);
    expect(scoped.some((re) => re.test('a casino'))).toBe(true);
    // And outside the bank, jackpot is still banned.
    expect(BANNED.some((re) => re.test('jackpot'))).toBe(true);
    // The guest practice deck is a small subset of the real bank, never the whole thing.
    expect(GUEST_MYTH.length).toBeLessThanOrEqual(12);
    for (const g of GUEST_MYTH) expect(MYTH_BANK.some((c) => c.text === g.text && c.truth === g.truth)).toBe(true);
  });

  it('Daily Grass answers and the new solo copy are clean', () => {
    for (const w of DAILY_ANSWERS) for (const re of BANNED) expect({ w, hit: re.test(w) }).toEqual({ w, hit: false });
    const texts = JSON.stringify([COPY.daily, COPY.myth, COPY.tiles.daily, COPY.tiles.myth, COPY.solo(3), COPY.invite]);
    for (const re of BANNED) expect({ hit: re.test(texts) ? re.source : null }).toEqual({ hit: null });
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
