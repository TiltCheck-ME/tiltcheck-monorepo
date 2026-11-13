// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Trivia high scores, one book per Discord server. Pure and storage-agnostic: the TriviaScores
// Durable Object (worker) and the guest-mode room in the browser both run this code.
//
// Rules:
// - Two boards: all time, and this week. A week starts Monday 00:00 America/Chicago.
// - Top 10 per board. One row per player per board: their best. A lower score never replaces a higher one.
// - Rows hold only what a row needs: Discord user id, display name, avatar hash, score, date.
// - Personal bests (id, score, date only) are kept for every player so someone off the board still
//   sees their own best.
// - Scores only come from games the room ran to the end (see Room.pendingHighScores). There is no
//   path for a client to hand in a number. Points are bragging rights only.

export const BOARD_SIZE = 10;
export const BOARD_TZ = 'America/Chicago';

export interface ScoreRow {
  id: string;
  name: string;
  avatar: string | null;
  score: number;
  /** ms epoch the score was set */
  at: number;
}

export interface Best {
  score: number;
  at: number;
}

export interface PersonalBest {
  all: Best | null;
  /** Best inside the week that starts at `weekStart`. Stale weeks count as none. */
  week: (Best & { weekStart: number }) | null;
}

export interface BookState {
  allTime: ScoreRow[];
  week: { start: number; rows: ScoreRow[] };
}

/** One player's result from a finished game, computed by the server. */
export interface FinishedScore {
  id: string;
  name: string;
  avatar: string | null;
  score: number;
}

/** What a player gets told on the end screen. Ranks are 1-based, null when off that board. */
export interface Brag {
  personalBest: boolean;
  weekRank: number | null;
  allTimeRank: number | null;
}

export interface BoardMine {
  week: { score: number; rank: number | null } | null;
  allTime: { score: number; rank: number | null } | null;
}

export interface BoardView {
  ok: true;
  guild: string;
  weekStart: number;
  week: ScoreRow[];
  allTime: ScoreRow[];
  me: BoardMine;
}

/** Storage the book needs: a key/value store (DO storage in the worker, a Map in tests and guest mode). */
export interface BookStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

const BOOK_KEY = 'book';
const pbKey = (id: string) => `pb:${id}`;

// ---------- Chicago week boundary ----------

let fmt: Intl.DateTimeFormat | null = null;
function chicagoParts(ms: number): { y: number; m: number; d: number; h: number; min: number; s: number; wd: number } {
  fmt ??= new Intl.DateTimeFormat('en-US', {
    timeZone: BOARD_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
  });
  const p: Record<string, string> = {};
  for (const x of fmt.formatToParts(new Date(ms))) p[x.type] = x.value;
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday ?? '');
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour) % 24, min: Number(p.minute), s: Number(p.second), wd };
}

/** Chicago UTC offset at an instant, in ms (e.g. -6h in CST, -5h in CDT). */
function chicagoOffset(ms: number): number {
  const p = chicagoParts(ms);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Start of the board week containing `ms`: the most recent Monday 00:00 America/Chicago, as ms epoch. */
export function weekStartFor(ms: number): number {
  const p = chicagoParts(ms);
  const back = (p.wd + 6) % 7; // days since Monday
  const mondayLocalAsUtc = Date.UTC(p.y, p.m - 1, p.d - back, 0, 0, 0);
  // Midnight is never inside a US DST gap (changes happen at 02:00), so one correction is exact.
  const guess = mondayLocalAsUtc - chicagoOffset(mondayLocalAsUtc);
  return mondayLocalAsUtc - chicagoOffset(guess);
}

// ---------- pure board helpers ----------

function order(a: ScoreRow, b: ScoreRow): number {
  // Higher score first; on a tie whoever got there first keeps the higher spot.
  return b.score - a.score || a.at - b.at || a.id.localeCompare(b.id);
}

/** Put a row on a board: best only, one row per player, top `size` kept. Returns true if the board changed. */
export function placeRow(rows: ScoreRow[], row: ScoreRow, size = BOARD_SIZE): boolean {
  const i = rows.findIndex((r) => r.id === row.id);
  if (i >= 0) {
    const cur = rows[i] as ScoreRow;
    if (row.score <= cur.score) {
      // Not a better score, but keep the name and avatar fresh.
      if (cur.name !== row.name || cur.avatar !== row.avatar) {
        cur.name = row.name;
        cur.avatar = row.avatar;
        return true;
      }
      return false;
    }
    rows.splice(i, 1);
  }
  rows.push({ ...row });
  rows.sort(order);
  if (rows.length > size) rows.length = size;
  return rows.some((r) => r.id === row.id) || i >= 0;
}

export function rankOf(rows: ScoreRow[], id: string): number | null {
  const i = rows.findIndex((r) => r.id === id);
  return i >= 0 ? i + 1 : null;
}

export function emptyBook(now: number): BookState {
  return { allTime: [], week: { start: weekStartFor(now), rows: [] } };
}

/** Roll the weekly board over if `now` is in a later week. Returns true if it reset. */
export function rollWeek(book: BookState, now: number): boolean {
  const start = weekStartFor(now);
  if (book.week.start === start) return false;
  book.week = { start, rows: [] };
  return true;
}

function cleanName(s: string): string {
  return s.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 64) || 'someone';
}

/** Server-side sanity check on a finished game's results before they touch a board. */
export function validFinished(x: unknown): FinishedScore | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  if (typeof r.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(r.id)) return null;
  if (typeof r.name !== 'string') return null;
  if (r.avatar !== null && (typeof r.avatar !== 'string' || !/^[A-Za-z0-9_]{1,64}$/.test(r.avatar))) return null;
  if (typeof r.score !== 'number' || !Number.isInteger(r.score) || r.score < 0 || r.score > 10_000) return null;
  return { id: r.id, name: cleanName(r.name), avatar: r.avatar as string | null, score: r.score };
}

// ---------- the book ----------

export class ScoreBook {
  private book: BookState | null = null;

  constructor(private readonly storage: BookStorage) {}

  private async load(now: number): Promise<BookState> {
    if (!this.book) this.book = (await this.storage.get<BookState>(BOOK_KEY)) ?? emptyBook(now);
    if (rollWeek(this.book, now)) await this.storage.put(BOOK_KEY, this.book);
    return this.book;
  }

  /**
   * Record a finished game. Zero scores are not recorded (nothing to brag about).
   * Returns each player's brag, keyed by user id.
   */
  async record(results: FinishedScore[], now: number): Promise<Record<string, Brag>> {
    const book = await this.load(now);
    const out: Record<string, Brag> = {};
    let changed = false;
    for (const raw of results) {
      const r = validFinished(raw);
      if (!r || r.score <= 0) continue;
      const row: ScoreRow = { ...r, at: now };
      const pb = (await this.storage.get<PersonalBest>(pbKey(r.id))) ?? { all: null, week: null };
      const personalBest = !pb.all || r.score > pb.all.score;
      let pbChanged = false;
      if (personalBest) {
        pb.all = { score: r.score, at: now };
        pbChanged = true;
      }
      const weekBest = pb.week && pb.week.weekStart === book.week.start ? pb.week : null;
      if (!weekBest || r.score > weekBest.score) {
        pb.week = { score: r.score, at: now, weekStart: book.week.start };
        pbChanged = true;
      }
      if (pbChanged) await this.storage.put(pbKey(r.id), pb);
      changed = placeRow(book.allTime, row) || changed;
      changed = placeRow(book.week.rows, row) || changed;
      out[r.id] = { personalBest, weekRank: null, allTimeRank: null };
    }
    // Ranks once every player from this game is placed. Only brag about a rank this game earned,
    // not a better one from an earlier game.
    for (const id of Object.keys(out)) {
      const b = out[id] as Brag;
      b.weekRank = book.week.rows.find((x) => x.id === id)?.at === now ? rankOf(book.week.rows, id) : null;
      b.allTimeRank = book.allTime.find((x) => x.id === id)?.at === now ? rankOf(book.allTime, id) : null;
    }
    if (changed) await this.storage.put(BOOK_KEY, book);
    return out;
  }

  async view(guild: string, meId: string | null, now: number): Promise<BoardView> {
    const book = await this.load(now);
    let me: BoardMine = { week: null, allTime: null };
    if (meId) {
      const pb = await this.storage.get<PersonalBest>(pbKey(meId));
      me = {
        allTime: pb?.all ? { score: pb.all.score, rank: rankOf(book.allTime, meId) } : null,
        week: pb?.week && pb.week.weekStart === book.week.start ? { score: pb.week.score, rank: rankOf(book.week.rows, meId) } : null,
      };
    }
    return {
      ok: true,
      guild,
      weekStart: book.week.start,
      week: book.week.rows.map((r) => ({ ...r })),
      allTime: book.allTime.map((r) => ({ ...r })),
      me,
    };
  }
}

/** A Map-backed BookStorage for guest mode and tests. */
export function memoryBookStorage(): BookStorage & { data: Map<string, unknown> } {
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
  };
}
