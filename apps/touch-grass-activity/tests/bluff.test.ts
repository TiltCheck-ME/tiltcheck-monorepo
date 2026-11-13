// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Bluff state machine (two truths and a lie), the room view (lie hidden), and the free-text guard.
import { describe, expect, it } from 'vitest';
import * as bluff from '../src/shared/bluff.js';
import { BLUFF_PROMPTS } from '../src/shared/bluffPrompts.js';
import { cleanText, hasSlur } from '../src/shared/textGuard.js';
import { Room, createRoomState, AWAY_GRACE_MS } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { parseClientMessage } from '../src/shared/protocol.js';

const T3: [string, string, string] = ['I have a pet snail.', 'I was born on a ferry.', 'I can juggle.'];

function table(ids: string[], rngStart = 1) {
  const s = bluff.createBluff();
  const rng = makeRng(rngStart);
  for (const id of ids) expect(bluff.sit(s, id).ok).toBe(true);
  return { s, rng };
}

/** Teller tells; returns the display index of the lie. */
function tellNow(s: bluff.BluffState, rng: () => number, now: number, lie = 2): number {
  const r = bluff.tell(s, s.tellerId as string, T3, lie, now, rng);
  expect(r).toEqual({ ok: true });
  return s.lie as number;
}

describe('Bluff state machine', () => {
  it('needs 3 seated players to start; 8 max; mid-game sitters wait for the next game', () => {
    const { s, rng } = table(['a', 'b']);
    expect(bluff.start(s, 'a', 0, rng)).toMatchObject({ ok: false, code: 'not-enough-players' });
    bluff.sit(s, 'c');
    expect(bluff.start(s, 'z', 0, rng)).toMatchObject({ ok: false, code: 'not-seated' });
    expect(bluff.start(s, 'a', 0, rng).ok).toBe(true);
    expect(s.phase).toBe('writing');
    expect(s.order.slice().sort()).toEqual(['a', 'b', 'c']);
    expect(bluff.sit(s, 'd').ok).toBe(true);
    expect(s.waiting).toEqual(['d']);
    expect(s.seats).not.toContain('d');
    const full = table(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(bluff.sit(full.s, '9')).toMatchObject({ ok: false, code: 'table-full' });
  });

  it('teller writes 3 statements, server shuffles, lie index tracks the marked statement', () => {
    for (let n = 1; n < 20; n += 1) {
      const { s, rng } = table(['a', 'b', 'c'], n);
      bluff.start(s, 'a', 0, rng);
      for (const lie of [0, 1, 2]) {
        const copy = structuredClone(s);
        expect(bluff.tell(copy, copy.tellerId as string, T3, lie, 0, rng).ok).toBe(true);
        expect(copy.statements!.slice().sort()).toEqual([...T3].sort());
        expect(copy.statements![copy.lie as number]).toBe(T3[lie]);
        expect(copy.phase).toBe('guessing');
      }
    }
  });

  it('only the teller tells; statements are validated (count, empty, 120 cap, duplicates, slurs)', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    bluff.start(s, 'a', 0, rng);
    const other = s.seats.find((x) => x !== s.tellerId) as string;
    expect(bluff.tell(s, other, T3, 0, 0, rng)).toMatchObject({ ok: false, code: 'not-teller' });
    const t = s.tellerId as string;
    expect(bluff.tell(s, t, ['a', 'b'] as unknown as string[], 0, 0, rng)).toMatchObject({ ok: false, code: 'bad-statements' });
    expect(bluff.tell(s, t, ['one', '   ', 'three'], 0, 0, rng)).toMatchObject({ ok: false, code: 'empty-statement' });
    expect(bluff.tell(s, t, ['x'.repeat(121), 'b', 'c'], 0, 0, rng)).toMatchObject({ ok: false, code: 'too-long' });
    expect(bluff.tell(s, t, ['x'.repeat(120), 'b', 'c'], 3, 0, rng)).toMatchObject({ ok: false, code: 'bad-lie' });
    expect(bluff.tell(s, t, ['Same thing', 'same   thing', 'c'], 0, 0, rng)).toMatchObject({ ok: false, code: 'duplicate-statement' });
    expect(bluff.tell(s, t, ['you f4gg0t', 'b', 'c'], 0, 0, rng)).toMatchObject({ ok: false, code: 'blocked-words' });
    expect(s.phase).toBe('writing');
    // Astral characters (two UTF-16 units) count as one character each; swearing is allowed.
    expect(bluff.tell(s, t, ['\u{1D49C}'.repeat(120), 'I said damn at a wedding', 'c'], 0, 0, rng).ok).toBe(true);
  });

  it("Jamie's scoring: +10 per correct guess, +5 to the teller per player fooled, no guess fools nobody", () => {
    const { s, rng } = table(['a', 'b', 'c', 'd']);
    bluff.start(s, 'a', 0, rng);
    const teller = s.tellerId as string;
    const lie = tellNow(s, rng, 1_000);
    const [g1, g2, g3] = bluff.guessers(s) as [string, string, string];
    expect(bluff.guess(s, g1, s.rid as string, lie, 2_000).ok).toBe(true);
    expect(bluff.guess(s, g2, s.rid as string, (lie + 1) % 3, 2_000).ok).toBe(true);
    // g3 never guesses: the window runs out.
    expect(bluff.tick(s, 1_000 + bluff.GUESS_MS, rng, ['a', 'b', 'c', 'd'])).toBe(true);
    expect(s.phase).toBe('reveal');
    expect(s.scores[g1]).toBe(10);
    expect(s.scores[g2]).toBe(0);
    expect(s.scores[g3]).toBe(0);
    expect(s.scores[teller]).toBe(5);
    expect(s.lastRound).toMatchObject({ tellerId: teller, lie, tellerPoints: 5, skipped: null });
    expect(s.lastRound!.picks.find((p) => p.id === g3)).toEqual({ id: g3, pick: null, correct: false, points: 0 });
  });

  it('one guess per player per round, teller cannot guess, stale round and late guesses refused', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    bluff.start(s, 'a', 0, rng);
    const teller = s.tellerId as string;
    tellNow(s, rng, 0);
    const [g1] = bluff.guessers(s) as [string];
    expect(bluff.guess(s, teller, s.rid as string, 0, 1)).toMatchObject({ ok: false, code: 'teller-cannot-guess' });
    expect(bluff.guess(s, g1, 'rstale', 0, 1)).toMatchObject({ ok: false, code: 'stale-round' });
    expect(bluff.guess(s, g1, s.rid as string, 3, 1)).toMatchObject({ ok: false, code: 'bad-pick' });
    expect(bluff.guess(s, 'stranger', s.rid as string, 0, 1)).toMatchObject({ ok: false, code: 'spectating' });
    expect(bluff.guess(s, g1, s.rid as string, 0, 1).ok).toBe(true);
    expect(bluff.guess(s, g1, s.rid as string, 1, 2)).toMatchObject({ ok: false, code: 'already-guessed' });
    const g2 = bluff.guessers(s)[1] as string;
    expect(bluff.guess(s, g2, s.rid as string, 0, bluff.GUESS_MS)).toMatchObject({ ok: false, code: 'too-late' });
  });

  it('guessing closes early once every connected guesser has picked; an away guesser simply misses', () => {
    const { s, rng } = table(['a', 'b', 'c', 'd']);
    bluff.start(s, 'a', 0, rng);
    tellNow(s, rng, 0);
    const [g1, g2, g3] = bluff.guessers(s) as [string, string, string];
    const active = s.seats.filter((x) => x !== g3);
    bluff.guess(s, g1, s.rid as string, 0, 1);
    expect(bluff.tick(s, 2, rng, active)).toBe(false);
    bluff.guess(s, g2, s.rid as string, 1, 3);
    expect(bluff.tick(s, 4, rng, active)).toBe(true);
    expect(s.phase).toBe('reveal');
    expect(s.lastRound!.picks.find((p) => p.id === g3)!.pick).toBeNull();
  });

  it('everyone tells once, in turn, then the game ends with winners; run it back seats the line', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    bluff.start(s, 'a', 0, rng);
    const tellers: string[] = [];
    let now = 0;
    bluff.sit(s, 'late');
    for (let i = 0; i < 3; i += 1) {
      expect(s.phase).toBe('writing');
      expect(s.round).toBe(i + 1);
      tellers.push(s.tellerId as string);
      const lie = tellNow(s, rng, now);
      for (const g of bluff.guessers(s)) bluff.guess(s, g, s.rid as string, lie, now + 1);
      bluff.tick(s, now + 2, rng, s.seats);
      expect(s.phase).toBe('reveal');
      expect(bluff.next(s, 'late', now + 3, rng)).toMatchObject({ ok: false, code: 'not-seated' });
      now += bluff.REVEAL_MS + 10;
      bluff.tick(s, now, rng, s.seats);
    }
    expect(new Set(tellers).size).toBe(3);
    expect(s.phase).toBe('over');
    // Everyone guessed right every time: 20 each, nobody fooled.
    expect(Object.values(s.scores)).toEqual([20, 20, 20]);
    expect(s.winnerIds.slice().sort()).toEqual(['a', 'b', 'c']);
    expect(bluff.start(s, 'late', now, rng).ok).toBe(true);
    expect(s.seats).toContain('late');
    expect(s.game).toBe(2);
    expect(s.order).toHaveLength(4);
  });

  it('Next skips the rest of the reveal', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    bluff.start(s, 'a', 0, rng);
    const lie = tellNow(s, rng, 0);
    for (const g of bluff.guessers(s)) bluff.guess(s, g, s.rid as string, lie, 1);
    bluff.tick(s, 2, rng, s.seats);
    expect(bluff.next(s, 'b', 3, rng).ok).toBe(true);
    expect(s.phase).toBe('writing');
    expect(s.round).toBe(2);
  });

  it('a present teller who runs out the 3-minute write clock is skipped', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    bluff.start(s, 'a', 0, rng);
    const t = s.tellerId as string;
    expect(bluff.nextWake(s)).toBe(bluff.WRITE_MS);
    bluff.tick(s, bluff.WRITE_MS, rng, s.seats);
    expect(s.lastRound).toMatchObject({ tellerId: t, skipped: 'teller-timeout' });
    expect(s.told).toContain(t);
    expect(s.tellerId).not.toBe(t);
    expect(s.round).toBe(2);
  });

  it('an away teller holds the round past the write clock (no wake loop); back in time gets a short clock', () => {
    const { s, rng } = table(['a', 'b', 'c']);
    bluff.start(s, 'a', 0, rng);
    const t = s.tellerId as string;
    const others = s.seats.filter((x) => x !== t);
    bluff.tick(s, bluff.WRITE_MS, rng, others);
    expect(s.phase).toBe('writing');
    expect(s.tellerId).toBe(t);
    expect(bluff.nextWake(s)).toBeNull();
    bluff.tick(s, bluff.WRITE_MS + 5_000, rng, s.seats);
    expect(s.writeEndsAt).toBe(bluff.WRITE_MS + 5_000 + bluff.RETURN_WRITE_MS);
  });

  it('teller removed mid-round: round void, next teller; under 3 pauses with scores kept, resume continues', () => {
    const { s, rng } = table(['a', 'b', 'c', 'd']);
    bluff.start(s, 'a', 0, rng);
    const t1 = s.tellerId as string;
    tellNow(s, rng, 0);
    bluff.removePlayer(s, t1, rng, 1);
    expect(s.lastRound).toMatchObject({ tellerId: t1, skipped: 'teller-left', statements: null });
    expect(s.phase).toBe('writing');
    expect(s.tellerId).not.toBe(t1);
    const t2 = s.tellerId as string;
    const g = bluff.guessers(s)[0] as string;
    bluff.removePlayer(s, g, rng, 2);
    expect(s.phase).toBe('paused');
    expect(s.told).not.toContain(t2); // didn't get a fair round
    bluff.sit(s, 'e');
    expect(bluff.start(s, 'e', 3, rng).ok).toBe(true);
    expect(s.phase).toBe('writing');
    expect(s.order).toContain('e');
  });
});

describe('Bluff in the room view: the lie stays hidden until the reveal', () => {
  it('only the teller sees which one is the lie; everyone sees it at the reveal', () => {
    const room = new Room(createRoomState('i-b'), makeRng(3));
    room.limiter.take = () => true;
    for (const id of ['a', 'b', 'c']) {
      room.join({ id, name: id.toUpperCase(), avatar: null }, 0);
      room.handle(id, { t: 'bluff.sit' }, 0);
    }
    expect(room.handle('a', { t: 'bluff.start' }, 0).ok).toBe(true);
    const teller = room.state.bluff.tellerId as string;
    const guessersIds = ['a', 'b', 'c'].filter((x) => x !== teller);
    expect(room.handle(teller, { t: 'bluff.tell', statements: T3, lie: 1 }, 1).ok).toBe(true);
    for (const id of guessersIds) {
      const v = room.viewFor(id, 2).bluff;
      expect(v.statements).toHaveLength(3);
      expect(v.me.mine).toBeNull();
      expect(v.lastRound).toBeNull();
      expect(JSON.stringify(v)).not.toContain('"lie"');
    }
    const tv = room.viewFor(teller, 2).bluff;
    expect(tv.me.mine!.statements[tv.me.mine!.lie]).toBe(T3[1]);
    expect(room.handle(teller, { t: 'bluff.guess', rid: tv.rid!, pick: 0 }, 3)).toMatchObject({ ok: false, code: 'teller-cannot-guess' });
    const rid = room.viewFor(guessersIds[0]!, 3).bluff.rid!;
    room.handle(guessersIds[0]!, { t: 'bluff.guess', rid, pick: 0 }, 3);
    expect(room.viewFor(guessersIds[0]!, 3).bluff.me.guess).toBe(0);
    expect(room.viewFor(guessersIds[1]!, 3).bluff.me.guess).toBeNull();
    room.handle(guessersIds[1]!, { t: 'bluff.guess', rid, pick: 1 }, 4);
    const r = room.viewFor(guessersIds[1]!, 5).bluff;
    expect(r.phase).toBe('reveal');
    expect(r.lastRound!.statements![r.lastRound!.lie!]).toBe(T3[1]);
    expect(r.lastRound!.picks.map((p) => p.id).sort()).toEqual(guessersIds.sort());
  });

  it('away teller: the round waits out the room away grace, then is skipped', () => {
    const room = new Room(createRoomState('i-b2'), makeRng(4));
    room.limiter.take = () => true;
    for (const id of ['a', 'b', 'c', 'd']) {
      room.join({ id, name: id, avatar: null }, 0);
      room.handle(id, { t: 'bluff.sit' }, 0);
    }
    room.handle('a', { t: 'bluff.start' }, 0);
    const t = room.state.bluff.tellerId as string;
    room.markAway(t, 10);
    room.tick(bluff.WRITE_MS + 1);
    expect(room.state.bluff.tellerId).toBe(t);
    expect(room.nextWake()).toBe(10 + AWAY_GRACE_MS);
    room.sweep(10 + AWAY_GRACE_MS, () => false);
    expect(room.state.bluff.lastRound).toMatchObject({ tellerId: t, skipped: 'teller-left' });
    expect(room.state.bluff.tellerId).not.toBe(t);
  });

  it('wire format: bluff.tell / bluff.guess are validated before the room sees them', () => {
    expect(parseClientMessage({ t: 'bluff.tell', statements: ['a', 'b', 'c'], lie: 2 })).toEqual({ t: 'bluff.tell', statements: ['a', 'b', 'c'], lie: 2 });
    expect(parseClientMessage({ t: 'bluff.tell', statements: ['a', 'b'], lie: 0 })).toBeNull();
    expect(parseClientMessage({ t: 'bluff.tell', statements: ['a', 'b', 3], lie: 0 })).toBeNull();
    expect(parseClientMessage({ t: 'bluff.tell', statements: ['a', 'b', 'c'], lie: 3 })).toBeNull();
    expect(parseClientMessage({ t: 'bluff.tell', statements: ['x'.repeat(601), 'b', 'c'], lie: 0 })).toBeNull();
    expect(parseClientMessage({ t: 'bluff.guess', rid: 'rabc', pick: 2 })).toEqual({ t: 'bluff.guess', rid: 'rabc', pick: 2 });
    expect(parseClientMessage({ t: 'bluff.guess', rid: 'rabc', pick: 1.5 })).toBeNull();
    expect(parseClientMessage({ t: 'bluff.guess', rid: '<x>', pick: 1 })).toBeNull();
    expect(parseClientMessage({ t: 'look', at: 'bluff' })).toEqual({ t: 'look', at: 'bluff' });
  });
});

describe('free-text guard', () => {
  it('cleanText strips invisible characters and collapses whitespace', () => {
    expect(cleanText('  a\u200b b\n\nc\u202e ')).toBe('a b c');
    expect(cleanText('ｆｕｌｌ width')).toBe('full width');
  });

  it('blocks slurs (whole words, leetspeak, stretched, spaced out) and nothing else', () => {
    // Encoded so this test file does not spell them out either.
    const rot = (s: string) => s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));
    for (const w of ['avttre', 'snttbgf', 'ergneqrq', 'xvxr', 'jrgonpx', 'genaavrf']) expect(hasSlur(`you ${rot(w)}`)).toBe(true);
    expect(hasSlur('f 4 g g 0 t')).toBe(true);
    expect(hasSlur('n.i.g.g.e.r')).toBe(true);
    for (const ok of ['I love spicy food', 'spiced rum', 'Niger is a country', 'snigger', 'bigger digger', 'Scunthorpe', 'a chink in the armor', 'my coonhound', 'flame retardant', 'damn it all', 'Pakistan']) {
      expect({ ok, hit: hasSlur(ok) }).toEqual({ ok, hit: false });
    }
  });

  it('prompt bank: the five DA&D fallbacks plus 30+ new, unique, short', () => {
    expect(BLUFF_PROMPTS.filter((p) => p.src === 'dad')).toHaveLength(5);
    expect(BLUFF_PROMPTS.filter((p) => p.src === 'tg').length).toBeGreaterThanOrEqual(30);
    expect(new Set(BLUFF_PROMPTS.map((p) => p.id)).size).toBe(BLUFF_PROMPTS.length);
    expect(new Set(BLUFF_PROMPTS.map((p) => p.text.toLowerCase())).size).toBe(BLUFF_PROMPTS.length);
    for (const p of BLUFF_PROMPTS) expect(p.text.length).toBeLessThanOrEqual(80);
  });
});
