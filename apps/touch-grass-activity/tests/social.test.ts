// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Hot Takes and Story Chain logic (src/shared/social.ts): rotation timing, house fallback, one vote
// per player, results hidden until you vote, anonymity, the 3-a-day limit, the text filter, mod
// hide / remove, and the story's line limit and no-two-in-a-row rule.
import { describe, expect, it } from 'vitest';
import {
  HOUSE_TAKES,
  LINE_MAX,
  STORY_OPENERS,
  SocialBook,
  TAKES_PER_DAY,
  TAKE_MAX,
  checkText,
  memorySocialStorage,
  parseSocialOp,
  resultsOf,
  rotateMsFrom,
  slotOf,
  storyMaxFrom,
  type SocialView,
} from '../src/shared/social.js';

const H = 3_600_000;
const ROT = 8 * H;
// 09:00 UTC: inside the 08:00-16:00 UTC slot.
const NOW = Date.UTC(2026, 10, 13, 9);
const SLOT_END = Date.UTC(2026, 10, 13, 16);

const A = { id: '100000000000000001', name: 'Ana' };
const B = { id: '100000000000000002', name: 'Bo' };
const C = { id: '100000000000000003', name: 'Cy' };
const MOD = { id: '100000000000000009', name: 'Mod' };

/** Slurs live in tests as ROT13, like tests/bluff.test.ts, so the repo doesn't carry them in plain text. */
const rot = (w: string) => w.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));

function seq(): () => number {
  let i = 0;
  return () => {
    i += 1;
    return ((i * 7919) % 1000) / 1000;
  };
}

function book(opts: { storyMax?: number; rotateMs?: number } = {}) {
  const storage = memorySocialStorage();
  return { storage, b: new SocialBook(storage, { rotateMs: opts.rotateMs ?? ROT, storyMax: opts.storyMax ?? 20, rand: seq() }) };
}

async function submit(b: SocialBook, user: typeof A, text: string, now = NOW) {
  return b.act(user, false, { op: 'hot.submit', text }, now);
}

describe('config', () => {
  it('rotation defaults to 8 hours and clamps to 1-24', () => {
    expect(rotateMsFrom(undefined)).toBe(8 * H);
    expect(rotateMsFrom('')).toBe(8 * H);
    expect(rotateMsFrom('junk')).toBe(8 * H);
    expect(rotateMsFrom('12')).toBe(12 * H);
    expect(rotateMsFrom('0.25')).toBe(1 * H);
    expect(rotateMsFrom('100')).toBe(24 * H);
  });
  it('story length defaults to 20 and clamps to 5-100', () => {
    expect(storyMaxFrom(undefined)).toBe(20);
    expect(storyMaxFrom('30')).toBe(30);
    expect(storyMaxFrom('2')).toBe(5);
    expect(storyMaxFrom('500')).toBe(100);
  });
  it('the defaults give 3 rotations a day', () => {
    expect(24 / (rotateMsFrom(undefined) / H)).toBe(3);
  });
});

describe('Hot Takes: rotation timing', () => {
  it('an empty queue features a house take that runs to the end of its slot', async () => {
    const { b } = book();
    const v = await b.view(A.id, false, NOW);
    expect(v.hot.featured).not.toBeNull();
    expect(v.hot.featured!.house).toBe(true);
    expect(HOUSE_TAKES).toContain(v.hot.featured!.text);
    expect(v.hot.featured!.endsAt).toBe(SLOT_END);
    expect(v.hot.rotateMs).toBe(ROT);
  });

  it('the featured take stays put for the whole slot and turns over right at the boundary', async () => {
    const { b } = book();
    const first = (await b.view(A.id, false, NOW)).hot.featured!.id;
    expect((await b.view(A.id, false, SLOT_END - 1)).hot.featured!.id).toBe(first);
    const next = (await b.view(A.id, false, SLOT_END)).hot.featured!;
    expect(next.id).not.toBe(first);
    expect(next.endsAt).toBe(SLOT_END + ROT);
    // The old one is in the archive with its slot end as the end time.
    const v = await b.view(A.id, false, SLOT_END + 1000);
    expect(v.hot.archive[0]!.id).toBe(first);
    expect(v.hot.archive[0]!.endedAt).toBe(SLOT_END);
  });

  it('queued player takes feature before house takes, oldest first', async () => {
    const { b } = book();
    await b.view(A.id, false, NOW);
    await submit(b, A, 'Take one from Ana');
    await submit(b, B, 'Take two from Bo');
    expect((await b.view(A.id, false, NOW)).hot.queued).toBe(2);
    const s1 = (await b.view(A.id, false, SLOT_END)).hot;
    expect(s1.featured!.text).toBe('Take one from Ana');
    expect(s1.featured!.house).toBe(false);
    expect(s1.queued).toBe(1);
    const s2 = (await b.view(A.id, false, SLOT_END + ROT)).hot;
    expect(s2.featured!.text).toBe('Take two from Bo');
    const s3 = (await b.view(A.id, false, SLOT_END + 2 * ROT)).hot;
    expect(s3.featured!.house).toBe(true);
  });

  it('a quiet day only uses one queued take, not one per missed slot', async () => {
    const { b } = book();
    await b.view(A.id, false, NOW);
    await submit(b, A, 'First');
    await submit(b, A, 'Second');
    // Nobody opens it for three days.
    const later = NOW + 72 * H;
    const v = await b.view(A.id, false, later);
    expect(v.hot.featured!.text).toBe('First');
    expect(v.hot.queued).toBe(1);
    expect(v.hot.featured!.endsAt).toBe((slotOf(later, ROT) + 1) * ROT);
  });

  it('a different interval moves the boundary (config value is honoured)', async () => {
    const { b } = book({ rotateMs: 12 * H });
    const v = await b.view(A.id, false, NOW);
    expect(v.hot.featured!.endsAt).toBe(Date.UTC(2026, 10, 13, 12));
  });

  it('house takes rotate through the list without repeating back to back', async () => {
    const { b } = book();
    const seen: string[] = [];
    for (let i = 0; i < HOUSE_TAKES.length; i += 1) seen.push((await b.view(A.id, false, NOW + i * ROT)).hot.featured!.text);
    expect(new Set(seen).size).toBe(HOUSE_TAKES.length);
  });

  it('the archive keeps the final split', async () => {
    const { b } = book();
    const f = (await b.view(A.id, false, NOW)).hot.featured!;
    await b.act(A, false, { op: 'hot.vote', pollId: f.id, vote: 'agree' }, NOW);
    await b.act(B, false, { op: 'hot.vote', pollId: f.id, vote: 'disagree' }, NOW);
    await b.act(C, false, { op: 'hot.vote', pollId: f.id, vote: 'agree' }, NOW);
    const past = (await b.view(A.id, false, SLOT_END)).hot.archive[0]!;
    expect(past.results).toEqual({ agree: 2, disagree: 1, total: 3, agreePct: 67, spice: 67 });
  });
});

describe('Hot Takes: voting', () => {
  it('one vote per player per take; no changing it', async () => {
    const { b } = book();
    const f = (await b.view(A.id, false, NOW)).hot.featured!;
    const r1 = await b.act(A, false, { op: 'hot.vote', pollId: f.id, vote: 'agree' }, NOW);
    expect(r1.ok).toBe(true);
    const r2 = await b.act(A, false, { op: 'hot.vote', pollId: f.id, vote: 'disagree' }, NOW + 1000);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.code).toBe('already-voted');
    const r3 = await b.act(A, false, { op: 'hot.vote', pollId: f.id, vote: 'agree' }, NOW + 2000);
    expect(r3.ok).toBe(false);
    expect(r3.view.hot.featured!.results).toEqual(resultsOf(1, 0));
    expect(r3.view.hot.featured!.myVote).toBe('agree');
  });

  it('the split is hidden until you vote, then shown with the spice meter', async () => {
    const { b } = book();
    const f = (await b.view(A.id, false, NOW)).hot.featured!;
    await b.act(A, false, { op: 'hot.vote', pollId: f.id, vote: 'agree' }, NOW);
    const before = await b.view(B.id, false, NOW);
    expect(before.hot.featured!.results).toBeNull();
    expect(before.hot.featured!.myVote).toBeNull();
    // Nothing in Bo's view gives away the count.
    expect(JSON.stringify(before.hot.featured)).not.toMatch(/agree"?:\s*\d|"total"/);
    const after = await b.act(B, false, { op: 'hot.vote', pollId: f.id, vote: 'disagree' }, NOW);
    expect(after.view.hot.featured!.results).toEqual({ agree: 1, disagree: 1, total: 2, agreePct: 50, spice: 100 });
  });

  it('a vote on a take that rotated out is refused', async () => {
    const { b } = book();
    const f = (await b.view(A.id, false, NOW)).hot.featured!;
    const r = await b.act(A, false, { op: 'hot.vote', pollId: f.id, vote: 'agree' }, SLOT_END + 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('poll-closed');
    expect(r.view.hot.featured!.id).not.toBe(f.id);
  });

  it('spice: even split is 100, unanimous is 0', () => {
    expect(resultsOf(5, 5).spice).toBe(100);
    expect(resultsOf(9, 0).spice).toBe(0);
    expect(resultsOf(0, 0)).toEqual({ agree: 0, disagree: 0, total: 0, agreePct: 0, spice: 0 });
    expect(resultsOf(3, 1).spice).toBe(50);
  });
});

describe('Hot Takes: anonymity', () => {
  it('no author id, name or hash appears in any view, for players or mods', async () => {
    const { b, storage } = book();
    await b.view(A.id, false, NOW);
    await submit(b, A, 'Ana wrote this anonymously');
    await submit(b, A, 'Ana wrote a second one');
    const featuredLater = SLOT_END;
    const views: SocialView[] = [
      await b.view(A.id, false, featuredLater),
      await b.view(B.id, false, featuredLater),
      await b.view(MOD.id, true, featuredLater),
    ];
    const f = views[1]!.hot.featured!;
    expect(f.text).toBe('Ana wrote this anonymously');
    views.push((await b.act(B, false, { op: 'hot.vote', pollId: f.id, vote: 'agree' }, featuredLater)).view);
    views.push(await b.view(MOD.id, true, featuredLater + ROT));
    const anaHash = await b.keyFor(A.id);
    const salt = storage.data.get('social:salt') as string;
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    for (const v of views) {
      const json = JSON.stringify(v.hot);
      expect(json).not.toContain(A.id);
      expect(json).not.toContain(anaHash);
      expect(json).not.toContain(salt);
      expect(json).not.toContain('Ana"');
      expect(json).not.toMatch(/"by"|"author"|"user"/);
    }
  });

  it('storage keeps a salted hash, never the raw Discord id', async () => {
    const { b, storage } = book();
    await submit(b, A, 'Stored safely');
    const all = JSON.stringify([...storage.data.entries()]);
    expect(all).not.toContain(A.id);
    // Same id, different server salt: different hash.
    const other = book();
    expect(await other.b.keyFor(A.id)).not.toBe(await b.keyFor(A.id));
  });
});

describe('Hot Takes: rate limit', () => {
  it(`${TAKES_PER_DAY} submissions per player per Chicago day`, async () => {
    const { b } = book();
    for (let i = 0; i < TAKES_PER_DAY; i += 1) expect((await submit(b, A, `take ${i}`)).ok).toBe(true);
    const r = await submit(b, A, 'one too many');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('daily-limit');
    expect(r.view.hot.submitsLeft).toBe(0);
    // Someone else is unaffected.
    expect((await submit(b, B, 'Bo still can')).ok).toBe(true);
    // Next Chicago day (midnight Central = 06:00 UTC in November): fresh count.
    const nextDay = Date.UTC(2026, 10, 14, 6, 1);
    const ok = await submit(b, A, 'new day', nextDay);
    expect(ok.ok).toBe(true);
    expect(ok.view.hot.submitsLeft).toBe(TAKES_PER_DAY - 1);
  });

  it('a filtered submission does not use up a slot', async () => {
    const { b } = book();
    const bad = await submit(b, A, 'go to https://example.com');
    expect(bad.ok).toBe(false);
    expect(bad.view.hot.submitsLeft).toBe(TAKES_PER_DAY);
  });
});

describe('text filter', () => {
  it('cleans, caps length and refuses empty text', () => {
    expect(checkText('  hello   there  ', TAKE_MAX)).toEqual({ ok: true, text: 'hello there' });
    expect(checkText('   ', TAKE_MAX)).toEqual({ ok: false, code: 'empty' });
    expect(checkText(42, TAKE_MAX)).toEqual({ ok: false, code: 'empty' });
    expect(checkText('x'.repeat(TAKE_MAX), TAKE_MAX).ok).toBe(true);
    expect(checkText('x'.repeat(TAKE_MAX + 1), TAKE_MAX)).toEqual({ ok: false, code: 'too-long' });
    expect(checkText('x'.repeat(LINE_MAX + 1), LINE_MAX)).toEqual({ ok: false, code: 'too-long' });
    expect(checkText('x'.repeat(5000), TAKE_MAX)).toEqual({ ok: false, code: 'too-long' });
  });

  it('blocks slurs (same list as Bluff, including spaced-out spellings) but allows swearing', () => {
    expect(checkText(`you are ${rot('snttbg').split('').join(' ')}`, TAKE_MAX)).toEqual({ ok: false, code: 'blocked' });
    expect(checkText(`${rot('ergneq').replace('e', '3')} take`, TAKE_MAX)).toEqual({ ok: false, code: 'blocked' });
    expect(checkText('this take is damn spicy', TAKE_MAX).ok).toBe(true);
  });

  it('blocks links, invites, @mentions and phone numbers; years are fine', () => {
    for (const t of ['see https://x.co', 'www.thing.com rules', 'join discord.gg/abc', 'ping @everyone', 'yo <@123456>', 'call 850 555 0100 now', 'mysite.com is best']) {
      expect({ t, r: checkText(t, TAKE_MAX) }).toEqual({ t, r: { ok: false, code: 'no-links' } });
    }
    expect(checkText('Music from 1999-2005 was the best', TAKE_MAX).ok).toBe(true);
    expect(checkText('Pluto is a planet. Period.', TAKE_MAX).ok).toBe(true);
  });

  it('story lines go through the same filter', async () => {
    const { b } = book();
    const s = (await b.view(A.id, false, NOW)).story;
    const r = await b.act(A, false, { op: 'story.add', storyId: s.id, text: `a ${rot('ergneq')} walked in` }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('blocked');
    expect(r.view.story.count).toBe(0);
  });
});

describe('mod hide / remove', () => {
  it('players cannot use mod tools', async () => {
    const { b } = book();
    const f = (await b.view(A.id, false, NOW)).hot.featured!;
    const r = await b.act(A, false, { op: 'mod.hide', kind: 'take', id: f.id, hidden: true }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('not-mod');
    expect(r.view.hot.featured!.id).toBe(f.id);
    expect(r.view.hot.modQueue).toBeUndefined();
    const s = r.view.story;
    const e = await b.act(A, false, { op: 'mod.endStory', storyId: s.id }, NOW);
    expect(e.ok).toBe(false);
  });

  it('a hidden queued take never features; unhiding puts it back in line', async () => {
    const { b } = book();
    await b.view(A.id, false, NOW);
    await submit(b, A, 'bad take');
    await submit(b, B, 'good take');
    const q = (await b.view(MOD.id, true, NOW)).hot.modQueue!;
    expect(q.map((t) => t.text)).toEqual(['bad take', 'good take']);
    const bad = q[0]!.id;
    await b.act(MOD, true, { op: 'mod.hide', kind: 'take', id: bad, hidden: true }, NOW);
    expect((await b.view(A.id, false, NOW)).hot.queued).toBe(1);
    const s1 = await b.view(A.id, false, SLOT_END);
    expect(s1.hot.featured!.text).toBe('good take');
    const s2 = await b.view(A.id, false, SLOT_END + ROT);
    expect(s2.hot.featured!.house).toBe(true);
    // Mods still see it, marked hidden.
    expect((await b.view(MOD.id, true, SLOT_END + ROT)).hot.modQueue!.find((t) => t.id === bad)?.hidden).toBe(true);
    await b.act(MOD, true, { op: 'mod.hide', kind: 'take', id: bad, hidden: false }, SLOT_END + ROT);
    expect((await b.view(A.id, false, SLOT_END + 2 * ROT)).hot.featured!.text).toBe('bad take');
  });

  it('hiding the featured take swaps in the next one right away, same slot end', async () => {
    const { b } = book();
    await b.view(A.id, false, NOW);
    await submit(b, A, 'first player take');
    await submit(b, B, 'second player take');
    const f = (await b.view(A.id, false, SLOT_END)).hot.featured!;
    expect(f.text).toBe('first player take');
    const r = await b.act(MOD, true, { op: 'mod.hide', kind: 'take', id: f.id, hidden: true }, SLOT_END + H);
    expect(r.ok).toBe(true);
    const v = await b.view(A.id, false, SLOT_END + H);
    expect(v.hot.featured!.text).toBe('second player take');
    expect(v.hot.featured!.endsAt).toBe(SLOT_END + ROT);
    // Players don't see the hidden one in the archive; mods do.
    expect(v.hot.archive.some((p) => p.id === f.id)).toBe(false);
    expect((await b.view(MOD.id, true, SLOT_END + H)).hot.archive.find((p) => p.id === f.id)?.hidden).toBe(true);
  });

  it('remove deletes a queued take and blanks an archived one', async () => {
    const { b } = book();
    const f = (await b.view(A.id, false, NOW)).hot.featured!;
    await submit(b, A, 'queued to remove');
    const qid = (await b.view(MOD.id, true, NOW)).hot.modQueue![0]!.id;
    await b.act(MOD, true, { op: 'mod.remove', kind: 'take', id: qid }, NOW);
    expect((await b.view(MOD.id, true, NOW)).hot.modQueue).toEqual([]);
    await b.view(A.id, false, SLOT_END);
    await b.act(MOD, true, { op: 'mod.remove', kind: 'take', id: f.id }, SLOT_END);
    const past = (await b.view(MOD.id, true, SLOT_END)).hot.archive.find((p) => p.id === f.id)!;
    expect(past.text).toBe('');
    expect(past.hidden).toBe(true);
    expect((await b.view(A.id, false, SLOT_END)).hot.archive.find((p) => p.id === f.id)).toBeUndefined();
  });

  it('unknown ids come back as not-found', async () => {
    const { b } = book();
    const r = await b.act(MOD, true, { op: 'mod.hide', kind: 'line', id: 'nope', hidden: true }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('not-found');
  });
});

describe('Story Chain', () => {
  async function add(b: SocialBook, user: typeof A, text: string, now = NOW) {
    const s = (await b.view(user.id, false, now)).story;
    return b.act(user, false, { op: 'story.add', storyId: s.id, text }, now);
  }

  it('starts on one of the opening lines with no lines yet', async () => {
    const { b } = book();
    const s = (await b.view(A.id, false, NOW)).story;
    expect(STORY_OPENERS).toContain(s.opener);
    expect(s.lines).toEqual([]);
    expect(s.count).toBe(0);
    expect(s.max).toBe(20);
    expect(s.canAdd).toBe(true);
  });

  it('nobody adds two lines in a row', async () => {
    const { b } = book();
    expect((await add(b, A, 'Ana line one')).ok).toBe(true);
    const again = await add(b, A, 'Ana line two');
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.code).toBe('your-line-last');
    expect(again.view.story.canAdd).toBe(false);
    expect((await b.view(B.id, false, NOW)).story.canAdd).toBe(true);
    expect((await add(b, B, 'Bo line')).ok).toBe(true);
    expect((await add(b, A, 'Ana again')).ok).toBe(true);
    const v = await b.view(C.id, false, NOW);
    expect(v.story.lines.map((l) => [l.text, l.name, l.mine])).toEqual([
      ['Ana line one', 'Ana', false],
      ['Bo line', 'Bo', false],
      ['Ana again', 'Ana', false],
    ]);
    expect((await b.view(A.id, false, NOW)).story.lines[0]!.mine).toBe(true);
  });

  it(`hits the limit, archives the full story and starts a new one with a different opener`, async () => {
    const { b } = book({ storyMax: 5 });
    const first = (await b.view(A.id, false, NOW)).story;
    const people = [A, B, A, B];
    for (const [i, p] of people.entries()) expect((await add(b, p, `line ${i + 1}`)).ok).toBe(true);
    expect((await b.view(A.id, false, NOW)).story.count).toBe(4);
    const last = await add(b, C, 'line 5');
    expect(last.ok).toBe(true);
    const v = last.view;
    expect(v.story.id).not.toBe(first.id);
    expect(v.story.count).toBe(0);
    expect(v.story.opener).not.toBe(first.opener);
    expect(v.storyArchive).toHaveLength(1);
    expect(v.storyArchive[0]!.id).toBe(first.id);
    expect(v.storyArchive[0]!.opener).toBe(first.opener);
    expect(v.storyArchive[0]!.ended).toBe('full');
    expect(v.storyArchive[0]!.lines.map((l) => l.text)).toEqual(['line 1', 'line 2', 'line 3', 'line 4', 'line 5']);
  });

  it('a line aimed at a story that just finished is refused, not added to the new one', async () => {
    const { b } = book({ storyMax: 5 });
    const old = (await b.view(A.id, false, NOW)).story.id;
    for (const [i, p] of [A, B, A, B, A].entries()) await add(b, p, `l${i}`);
    const r = await b.act(C, false, { op: 'story.add', storyId: old, text: 'late line' }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('story-moved');
    expect(r.view.story.count).toBe(0);
  });

  it('hidden lines drop out of the view and the count; mods still see them', async () => {
    const { b } = book({ storyMax: 5 });
    await add(b, A, 'fine');
    await add(b, B, 'rude line');
    const lid = (await b.view(MOD.id, true, NOW)).story.lines[1]!.id;
    await b.act(MOD, true, { op: 'mod.hide', kind: 'line', id: lid, hidden: true }, NOW);
    const pv = await b.view(C.id, false, NOW);
    expect(pv.story.lines.map((l) => l.text)).toEqual(['fine']);
    expect(pv.story.count).toBe(1);
    const mv = await b.view(MOD.id, true, NOW);
    expect(mv.story.lines.find((l) => l.id === lid)?.hidden).toBe(true);
    // The hidden writer still can't go twice in a row.
    const again = await add(b, B, 'trying again');
    expect(again.ok).toBe(false);
  });

  it('a mod can end the story early; an empty story just gets a new opener', async () => {
    const { b } = book();
    const empty = (await b.view(MOD.id, true, NOW)).story;
    const r0 = await b.act(MOD, true, { op: 'mod.endStory', storyId: empty.id }, NOW);
    expect(r0.ok).toBe(true);
    expect(r0.view.storyArchive).toHaveLength(0);
    expect(r0.view.story.id).not.toBe(empty.id);
    await add(b, A, 'only line');
    const cur = (await b.view(MOD.id, true, NOW)).story;
    const r = await b.act(MOD, true, { op: 'mod.endStory', storyId: cur.id }, NOW + 1);
    expect(r.view.storyArchive[0]!.ended).toBe('mod');
    expect(r.view.storyArchive[0]!.lines.map((l) => l.text)).toEqual(['only line']);
  });
});

describe('wire ops', () => {
  it('parseSocialOp accepts the six ops and nothing else', () => {
    expect(parseSocialOp({ op: 'hot.submit', text: 'x' })).toEqual({ op: 'hot.submit', text: 'x' });
    expect(parseSocialOp({ op: 'hot.vote', pollId: 'abc123', vote: 'agree' })).toEqual({ op: 'hot.vote', pollId: 'abc123', vote: 'agree' });
    expect(parseSocialOp({ op: 'hot.vote', pollId: 'abc123', vote: 'maybe' })).toBeNull();
    expect(parseSocialOp({ op: 'story.add', storyId: 'abc', text: 'hi' })).not.toBeNull();
    expect(parseSocialOp({ op: 'mod.hide', kind: 'line', id: 'abc', hidden: true })).not.toBeNull();
    expect(parseSocialOp({ op: 'mod.hide', kind: 'user', id: 'abc', hidden: true })).toBeNull();
    expect(parseSocialOp({ op: 'mod.remove', kind: 'take', id: 'abc' })).not.toBeNull();
    expect(parseSocialOp({ op: 'mod.endStory', storyId: 'abc' })).not.toBeNull();
    expect(parseSocialOp({ op: 'hot.vote', pollId: '../etc', vote: 'agree' })).toBeNull();
    expect(parseSocialOp({ op: 'drop.tables' })).toBeNull();
    expect(parseSocialOp(null)).toBeNull();
  });
});
