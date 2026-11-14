// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Hot Takes (anonymous agree/disagree polls) and Story Chain (one running story per server).
// Not games: no rounds, no scores. Pure and storage-agnostic, like scores.ts: the SCORES Durable
// Object (worker, the server's 'guild:<id>' instance) and guest mode in the browser both run this.
//
// Hot Takes
// - Anyone submits a take (200 characters, 3 a day per player, Chicago day). It joins a queue.
// - One featured take per time slot. Slots are fixed windows of `rotateMs` (default 8 hours) counted
//   from the Unix epoch, so they turn at 00:00, 08:00 and 16:00 UTC. The rotation happens lazily on
//   the first read or write after a slot turns: the featured take is archived with its final split,
//   the next visible queued take is featured, and an empty queue falls back to a house take.
// - One vote per player per take (agree / disagree), no changing it. The split only comes back to a
//   player who has voted. Archived takes show their final split.
// - Anonymity: the author is stored only as a salted hash (the salt is made once per server, kept in
//   storage and never sent anywhere). No author field, hash or Discord id is in any view, mods included.
// - Mods hide / unhide / remove. A hidden take never features; hiding the featured one rotates now.
//
// Story Chain
// - One story per server. Anyone adds one line (140 characters). Nobody adds two lines in a row.
// - At `storyMax` visible lines (default 20), or when a mod ends it, the story is archived for the
//   read-back view and a new one starts on a random opening line.
// - Lines show the writer's display name (not anonymous). Mods hide lines; hidden lines don't count.
//
// Free text goes through the same cleaner and slur list as Bluff (textGuard.ts), plus a small
// filter for links, @mentions and phone-number-length digit runs, which have no place in either.

import { charCount, cleanText, hasSlur } from './textGuard.js';
import { sha256Hex } from './daily.js';
import { dayKeyFor, type BookStorage } from './scores.js';

export const TAKE_MAX = 200;
export const LINE_MAX = 140;
export const TAKES_PER_DAY = 3;
export const DEFAULT_ROTATE_HOURS = 8;
export const DEFAULT_STORY_LINES = 20;
export const QUEUE_MAX = 100;
export const TAKE_ARCHIVE_MAX = 30;
export const STORY_ARCHIVE_MAX = 10;
export const HOUR_MS = 3_600_000;

/** Clamp the rotation interval (hours) from config. 1 to 24, default 8. */
export function rotateMsFrom(raw: string | number | undefined | null): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  const h = Number.isFinite(n) && n > 0 ? Math.min(24, Math.max(1, n)) : DEFAULT_ROTATE_HOURS;
  return Math.round(h * HOUR_MS);
}

/** Clamp the story length from config. 5 to 100 lines, default 20. */
export function storyMaxFrom(raw: string | number | undefined | null): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(100, Math.max(5, Math.floor(n))) : DEFAULT_STORY_LINES;
}

/** House takes for an empty queue. Millennial voice, party-safe, no money words (tests/no-money.test.ts). */
export const HOUSE_TAKES: readonly string[] = [
  'Cereal is a soup. Fight me.',
  'AIM away messages were the peak of the internet. No notes.',
  'Calling someone without texting first is rude.',
  'Voicemail should have been retired with the flip phone.',
  'The original 151 Pokemon are the only ones that count.',
  'Breakfast for dinner beats dinner for dinner.',
  'Leaving a party without saying bye is the polite move.',
  'Every song sounded better on a burned CD.',
  'Napping is a skill and belongs on a resume.',
  'The side part is coming back and that is fine.',
  'Waking up at 5am to be productive is a cult.',
  'Friends was never that funny.',
  'The Sims was the best game of the 2000s.',
  'Pineapple on pizza is fine. Everyone needs to move on.',
  'Your Hogwarts house says more about you than your star sign.',
  'Group projects taught us nothing except who to avoid.',
];

/** Opening lines for a new story. */
export const STORY_OPENERS: readonly string[] = [
  'The group chat went silent the night the Tamagotchis came back.',
  'At exactly 11:11, every flip phone in town started ringing.',
  'Nobody at the video store knew why the last tape on the shelf was humming.',
  'The class pet escaped on picture day, and it was not a hamster.',
  'We found a dial-up modem in the attic, and it was still connected.',
  'The road trip was going fine until the GPS started giving life advice.',
  'My roommate swore the fridge was haunted. Then it texted me.',
  'The last person on MySpace finally logged off, and something logged on.',
  'The office printer worked perfectly for once, and everyone panicked.',
  'On the first day of summer, the grass started talking back.',
  "Someone left a mixtape on my doorstep labeled 'play me last'.",
  'The substitute teacher said she had been here before. In 1997.',
];

// ---------- text filter ----------

export type TextError = 'empty' | 'too-long' | 'blocked' | 'no-links';

/** Links, invites, @mentions (and @everyone), and 10+ digits in a run (phone numbers; years like 1999-2005 pass). */
const LINKISH = /(https?:\/\/|www\.|discord\.gg|discord(?:app)?\.com\/invite|\b[a-z0-9-]+\.(?:com|net|org|gg|io|xyz|ly|me|co)\b|@\S|<@|(?:\d[\s().-]{0,2}){10,})/i;

export function checkText(raw: unknown, max: number): { ok: true; text: string } | { ok: false; code: TextError } {
  if (typeof raw !== 'string') return { ok: false, code: 'empty' };
  // Cap the raw input before cleaning so a huge body can't cost much.
  if (raw.length > max * 4) return { ok: false, code: 'too-long' };
  const text = cleanText(raw);
  if (!text) return { ok: false, code: 'empty' };
  if (charCount(text) > max) return { ok: false, code: 'too-long' };
  if (hasSlur(text)) return { ok: false, code: 'blocked' };
  if (LINKISH.test(text)) return { ok: false, code: 'no-links' };
  return { ok: true, text };
}

// ---------- shapes ----------

export type Vote = 'agree' | 'disagree';

interface Take {
  id: string;
  text: string;
  /** Salted hash of the author. Server-side only; never in a view. */
  by: string;
  at: number;
  hidden: boolean;
}

interface Poll {
  id: string;
  text: string;
  house: boolean;
  /** Author hash for player takes (server-side only), null for house takes. */
  by: string | null;
  slot: number;
  startedAt: number;
  endsAt: number;
  endedAt: number | null;
  agree: number;
  disagree: number;
  hidden: boolean;
  removed: boolean;
}

interface HotState {
  current: Poll | null;
  queue: Take[];
  archive: Poll[];
  nextHouse: number;
  subs: { day: string; counts: Record<string, number> };
}

interface Line {
  id: string;
  text: string;
  name: string;
  by: string;
  at: number;
  hidden: boolean;
}

interface Story {
  id: string;
  opener: string;
  startedAt: number;
  lines: Line[];
  endedAt: number | null;
  ended: 'full' | 'mod' | null;
}

interface StoryState {
  current: Story;
  archive: Story[];
}

export interface Results {
  agree: number;
  disagree: number;
  total: number;
  /** 0-100, rounded. */
  agreePct: number;
  /** 0-100: 100 is a dead even split, 0 is unanimous (or no votes). */
  spice: number;
}

export interface FeaturedView {
  id: string;
  text: string;
  house: boolean;
  startedAt: number;
  endsAt: number;
  myVote: Vote | null;
  /** Only once the viewer has voted (mods see it too). */
  results: Results | null;
  hidden?: boolean;
}

export interface ArchivedTakeView {
  id: string;
  text: string;
  house: boolean;
  startedAt: number;
  endedAt: number;
  results: Results;
  hidden?: boolean;
}

export interface QueuedTakeView {
  id: string;
  text: string;
  at: number;
  hidden: boolean;
}

export interface HotView {
  rotateMs: number;
  featured: FeaturedView | null;
  queued: number;
  submitsLeft: number;
  archive: ArchivedTakeView[];
  /** Mods only: the queue with text, no author. */
  modQueue?: QueuedTakeView[];
}

export interface LineView {
  id: string;
  text: string;
  name: string;
  mine: boolean;
  hidden?: boolean;
}

export interface StoryView {
  id: string;
  opener: string;
  startedAt: number;
  lines: LineView[];
  /** Visible lines (what counts toward the limit). */
  count: number;
  max: number;
  /** False when the viewer wrote the latest line. */
  canAdd: boolean;
}

export interface ArchivedStoryView {
  id: string;
  opener: string;
  startedAt: number;
  endedAt: number;
  ended: 'full' | 'mod';
  lines: LineView[];
}

export interface SocialView {
  ok: true;
  mod: boolean;
  hot: HotView;
  story: StoryView;
  storyArchive: ArchivedStoryView[];
}

export type SocialErrorCode =
  | TextError
  | 'daily-limit'
  | 'queue-full'
  | 'poll-closed'
  | 'already-voted'
  | 'bad-vote'
  | 'story-moved'
  | 'your-line-last'
  | 'not-mod'
  | 'not-found'
  | 'bad-op';

export type SocialResult = { ok: true; view: SocialView } | { ok: false; code: SocialErrorCode; view: SocialView };

export interface SocialUser {
  id: string;
  name: string;
}

export type SocialOp =
  | { op: 'hot.submit'; text: string }
  | { op: 'hot.vote'; pollId: string; vote: Vote }
  | { op: 'story.add'; storyId: string; text: string }
  | { op: 'mod.hide'; kind: 'take' | 'line'; id: string; hidden: boolean }
  | { op: 'mod.remove'; kind: 'take' | 'line'; id: string }
  | { op: 'mod.endStory'; storyId: string };

/** Validate an op from the wire. Anything off-shape is null. */
export function parseSocialOp(raw: unknown): SocialOp | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = (v: unknown) => typeof v === 'string' && /^[a-z0-9]{1,24}$/.test(v);
  const kind = (v: unknown) => v === 'take' || v === 'line';
  switch (o.op) {
    case 'hot.submit':
      return typeof o.text === 'string' ? { op: 'hot.submit', text: o.text } : null;
    case 'hot.vote':
      return id(o.pollId) && (o.vote === 'agree' || o.vote === 'disagree') ? { op: 'hot.vote', pollId: o.pollId as string, vote: o.vote } : null;
    case 'story.add':
      return id(o.storyId) && typeof o.text === 'string' ? { op: 'story.add', storyId: o.storyId as string, text: o.text } : null;
    case 'mod.hide':
      return kind(o.kind) && id(o.id) && typeof o.hidden === 'boolean' ? { op: 'mod.hide', kind: o.kind as 'take' | 'line', id: o.id as string, hidden: o.hidden } : null;
    case 'mod.remove':
      return kind(o.kind) && id(o.id) ? { op: 'mod.remove', kind: o.kind as 'take' | 'line', id: o.id as string } : null;
    case 'mod.endStory':
      return id(o.storyId) ? { op: 'mod.endStory', storyId: o.storyId as string } : null;
    default:
      return null;
  }
}

/** Split and spice for a tally. */
export function resultsOf(agree: number, disagree: number): Results {
  const total = agree + disagree;
  const agreePct = total ? Math.round((agree / total) * 100) : 0;
  const spice = total ? Math.round(100 * (1 - Math.abs(agree - disagree) / total)) : 0;
  return { agree, disagree, total, agreePct, spice };
}

/** Which rotation slot a moment falls in. */
export function slotOf(now: number, rotateMs: number): number {
  return Math.floor(now / rotateMs);
}

// ---------- the book ----------

const K_SALT = 'social:salt';
const K_HOT = 'hot:state';
const K_STORY = 'story:state';
const votesKey = (pollId: string) => `hot:votes:${pollId}`;

export interface SocialOptions {
  rotateMs?: number;
  storyMax?: number;
  /** Random source for ids, house picks and openers. Tests pass a fixed one. */
  rand?: () => number;
}

export interface SocialStorage extends BookStorage {
  delete?(key: string): Promise<unknown>;
}

export class SocialBook {
  readonly rotateMs: number;
  readonly storyMax: number;
  private readonly rand: () => number;

  constructor(
    private readonly storage: SocialStorage,
    opts: SocialOptions = {},
  ) {
    this.rotateMs = opts.rotateMs ?? rotateMsFrom(undefined);
    this.storyMax = opts.storyMax ?? DEFAULT_STORY_LINES;
    this.rand = opts.rand ?? Math.random;
  }

  private newId(): string {
    let s = '';
    for (let i = 0; i < 12; i += 1) s += Math.floor(this.rand() * 36).toString(36);
    return s;
  }

  /** Per-server salt: made once, kept in storage, never in a view. */
  private async salt(): Promise<string> {
    const have = await this.storage.get<string>(K_SALT);
    if (have) return have;
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const s = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    await this.storage.put(K_SALT, s);
    return s;
  }

  /** Salted hash of a Discord user id. */
  async keyFor(userId: string): Promise<string> {
    return sha256Hex(`${await this.salt()}:${userId}`).slice(0, 32);
  }

  private async hot(now: number): Promise<{ s: HotState; changed: boolean }> {
    const s = (await this.storage.get<HotState>(K_HOT)) ?? { current: null, queue: [], archive: [], nextHouse: Math.floor(this.rand() * HOUSE_TAKES.length), subs: { day: '', counts: {} } };
    const changed = await this.rotate(s, now);
    return { s, changed };
  }

  /**
   * Move to the slot `now` falls in. Only one take per visited slot: a quiet day does not burn
   * through the queue. A hidden featured take is replaced right away, ending with the same slot.
   */
  private async rotate(s: HotState, now: number): Promise<boolean> {
    const slot = slotOf(now, this.rotateMs);
    const cur = s.current;
    if (cur && cur.slot === slot && !cur.hidden) return false;
    if (cur) {
      cur.endedAt = Math.min(now, cur.endsAt);
      s.archive.unshift(cur);
      if (s.archive.length > TAKE_ARCHIVE_MAX) s.archive.length = TAKE_ARCHIVE_MAX;
      await this.storage.delete?.(votesKey(cur.id));
    }
    const endsAt = (slot + 1) * this.rotateMs;
    const i = s.queue.findIndex((t) => !t.hidden);
    let next: Poll;
    if (i >= 0) {
      const t = s.queue.splice(i, 1)[0] as Take;
      next = { id: t.id, text: t.text, house: false, by: t.by, slot, startedAt: now, endsAt, endedAt: null, agree: 0, disagree: 0, hidden: false, removed: false };
    } else {
      const text = HOUSE_TAKES[s.nextHouse % HOUSE_TAKES.length] as string;
      s.nextHouse = (s.nextHouse + 1) % HOUSE_TAKES.length;
      next = { id: this.newId(), text, house: true, by: null, slot, startedAt: now, endsAt, endedAt: null, agree: 0, disagree: 0, hidden: false, removed: false };
    }
    s.current = next;
    return true;
  }

  private async story(now: number): Promise<StoryState> {
    const have = await this.storage.get<StoryState>(K_STORY);
    if (have) return have;
    const s: StoryState = { current: this.freshStory(now, null), archive: [] };
    await this.storage.put(K_STORY, s);
    return s;
  }

  private freshStory(now: number, lastOpener: string | null): Story {
    const pool = STORY_OPENERS.filter((o) => o !== lastOpener);
    const opener = pool[Math.floor(this.rand() * pool.length)] ?? (STORY_OPENERS[0] as string);
    return { id: this.newId(), opener, startedAt: now, lines: [], endedAt: null, ended: null };
  }

  private archiveStory(s: StoryState, how: 'full' | 'mod', now: number): void {
    const done = s.current;
    if (done.lines.some((l) => !l.hidden)) {
      done.endedAt = now;
      done.ended = how;
      s.archive.unshift(done);
      if (s.archive.length > STORY_ARCHIVE_MAX) s.archive.length = STORY_ARCHIVE_MAX;
    }
    s.current = this.freshStory(now, done.opener);
  }

  /** The whole picture for one viewer. `userId` null = signed-out read (never happens in the worker). */
  async view(userId: string | null, mod: boolean, now: number): Promise<SocialView> {
    const { s: hot, changed } = await this.hot(now);
    if (changed) await this.storage.put(K_HOT, hot);
    const story = await this.story(now);
    const me = userId ? await this.keyFor(userId) : null;
    return this.render(hot, story, me, mod, now);
  }

  private async render(hot: HotState, story: StoryState, me: string | null, mod: boolean, now: number): Promise<SocialView> {
    const cur = hot.current;
    let featured: FeaturedView | null = null;
    if (cur && (!cur.hidden || mod)) {
      const votes = (await this.storage.get<Record<string, Vote>>(votesKey(cur.id))) ?? {};
      const myVote = me ? (votes[me] ?? null) : null;
      featured = {
        id: cur.id,
        text: cur.text,
        house: cur.house,
        startedAt: cur.startedAt,
        endsAt: cur.endsAt,
        myVote,
        results: myVote || mod ? resultsOf(cur.agree, cur.disagree) : null,
        ...(mod ? { hidden: cur.hidden } : {}),
      };
    }
    const day = dayKeyFor(now);
    const used = me && hot.subs.day === day ? (hot.subs.counts[me] ?? 0) : 0;
    const archive: ArchivedTakeView[] = hot.archive
      .filter((p) => mod || !p.hidden)
      .map((p) => ({
        id: p.id,
        text: p.removed ? '' : p.text,
        house: p.house,
        startedAt: p.startedAt,
        endedAt: p.endedAt ?? p.endsAt,
        results: resultsOf(p.agree, p.disagree),
        ...(mod ? { hidden: p.hidden } : {}),
      }));
    const hotView: HotView = {
      rotateMs: this.rotateMs,
      featured,
      queued: hot.queue.filter((t) => !t.hidden).length,
      submitsLeft: Math.max(0, TAKES_PER_DAY - used),
      archive,
    };
    if (mod) hotView.modQueue = hot.queue.map((t) => ({ id: t.id, text: t.text, at: t.at, hidden: t.hidden }));

    const lineView = (l: Line): LineView => ({ id: l.id, text: l.text, name: l.name, mine: me !== null && l.by === me, ...(mod ? { hidden: l.hidden } : {}) });
    const cs = story.current;
    const visible = cs.lines.filter((l) => !l.hidden);
    const last = cs.lines[cs.lines.length - 1];
    return {
      ok: true,
      mod,
      hot: hotView,
      story: {
        id: cs.id,
        opener: cs.opener,
        startedAt: cs.startedAt,
        lines: (mod ? cs.lines : visible).map(lineView),
        count: visible.length,
        max: this.storyMax,
        canAdd: !(me && last && last.by === me),
      },
      storyArchive: story.archive.map((st) => ({
        id: st.id,
        opener: st.opener,
        startedAt: st.startedAt,
        endedAt: st.endedAt ?? st.startedAt,
        ended: st.ended ?? 'full',
        lines: st.lines.filter((l) => mod || !l.hidden).map(lineView),
      })),
    };
  }

  /** Apply one op for one player. Always returns the fresh view, with an error code on refusal. */
  async act(user: SocialUser, mod: boolean, op: SocialOp, now: number): Promise<SocialResult> {
    const me = await this.keyFor(user.id);
    const { s: hot, changed: rotated } = await this.hot(now);
    const story = await this.story(now);
    let hotDirty = rotated;
    let storyDirty = false;
    const done = async (code?: SocialErrorCode): Promise<SocialResult> => {
      if (hotDirty) await this.storage.put(K_HOT, hot);
      if (storyDirty) await this.storage.put(K_STORY, story);
      const view = await this.render(hot, story, me, mod, now);
      return code ? { ok: false, code, view } : { ok: true, view };
    };

    if (op.op === 'hot.submit') {
      const day = dayKeyFor(now);
      if (hot.subs.day !== day) {
        hot.subs = { day, counts: {} };
        hotDirty = true;
      }
      const used = hot.subs.counts[me] ?? 0;
      if (used >= TAKES_PER_DAY) return done('daily-limit');
      const t = checkText(op.text, TAKE_MAX);
      if (!t.ok) return done(t.code);
      if (hot.queue.length >= QUEUE_MAX) return done('queue-full');
      hot.queue.push({ id: this.newId(), text: t.text, by: me, at: now, hidden: false });
      hot.subs.counts[me] = used + 1;
      hotDirty = true;
      return done();
    }

    if (op.op === 'hot.vote') {
      const cur = hot.current;
      if (!cur || cur.hidden || cur.id !== op.pollId) return done('poll-closed');
      const key = votesKey(cur.id);
      const votes = (await this.storage.get<Record<string, Vote>>(key)) ?? {};
      if (votes[me]) return done('already-voted');
      votes[me] = op.vote;
      await this.storage.put(key, votes);
      if (op.vote === 'agree') cur.agree += 1;
      else cur.disagree += 1;
      hotDirty = true;
      return done();
    }

    if (op.op === 'story.add') {
      const cs = story.current;
      if (cs.id !== op.storyId) return done('story-moved');
      const last = cs.lines[cs.lines.length - 1];
      if (last && last.by === me) return done('your-line-last');
      const t = checkText(op.text, LINE_MAX);
      if (!t.ok) return done(t.code);
      cs.lines.push({ id: this.newId(), text: t.text, name: user.name.slice(0, 64), by: me, at: now, hidden: false });
      storyDirty = true;
      if (cs.lines.filter((l) => !l.hidden).length >= this.storyMax) this.archiveStory(story, 'full', now);
      return done();
    }

    // Everything below is mods only.
    if (!mod) return done('not-mod');

    if (op.op === 'mod.endStory') {
      if (story.current.id !== op.storyId) return done('story-moved');
      this.archiveStory(story, 'mod', now);
      storyDirty = true;
      return done();
    }

    if (op.op === 'mod.hide' || op.op === 'mod.remove') {
      const hide = op.op === 'mod.remove' ? true : op.hidden;
      if (op.kind === 'take') {
        const qi = hot.queue.findIndex((t) => t.id === op.id);
        if (qi >= 0) {
          if (op.op === 'mod.remove') hot.queue.splice(qi, 1);
          else (hot.queue[qi] as Take).hidden = hide;
          hotDirty = true;
          return done();
        }
        const poll = hot.current?.id === op.id ? hot.current : hot.archive.find((p) => p.id === op.id);
        if (!poll) return done('not-found');
        poll.hidden = hide;
        if (op.op === 'mod.remove') {
          poll.removed = true;
          poll.text = '';
        }
        hotDirty = true;
        // A hidden featured take comes down now; the next one runs out the same slot.
        if (poll === hot.current && poll.hidden) await this.rotate(hot, now);
        return done();
      }
      const all = [story.current, ...story.archive];
      for (const st of all) {
        const line = st.lines.find((l) => l.id === op.id);
        if (!line) continue;
        line.hidden = hide;
        if (op.op === 'mod.remove') line.text = '';
        storyDirty = true;
        return done();
      }
      return done('not-found');
    }

    return done('bad-op');
  }
}

/** A Map-backed store with delete, for guest mode and tests. */
export function memorySocialStorage(): SocialStorage & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    async get<T>(k: string) {
      const v = data.get(k);
      return v === undefined ? undefined : (structuredClone(v) as T);
    },
    async put<T>(k: string, v: T) {
      data.set(k, structuredClone(v));
    },
    async delete(k: string) {
      return data.delete(k);
    },
  };
}
