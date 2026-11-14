// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-14
// One room per Discord Activity instance: who is here, the DA&D table, the trivia game and Bluff.
// Runs inside the Durable Object (authoritative) and inside the guest/dev room in the browser.

import * as dad from './dad.js';
import * as trivia from './trivia.js';
import * as bluff from './bluff.js';
import * as myth from './myth.js';
import * as chess from './chess.js';
import { dayKeyFor, type ScoreRow } from './scores.js';
import type { DailyPublic, SolverRow } from './daily.js';
import type { Rng } from './rng.js';
import type { ClientAction, LookAt, RoomUser, RoomView } from './protocol.js';
import type { Brag, FinishedScore } from './scores.js';

export const PRESENCE_TIMEOUT_MS = 45_000;
/**
 * A dropped connection is not leaving. iOS suspends the Discord webview on an app switch and the
 * socket dies; the player keeps their seat, hand and score, marked away, for this long.
 */
export const AWAY_GRACE_MS = 180_000;
export const RATE_LIMIT_CAPACITY = 10;
export const RATE_LIMIT_REFILL_PER_SEC = 2;

export interface RoomMember extends RoomUser {
  joinedAt: number;
  lastSeen: number;
  /** Set when the last connection dropped (or a poller went quiet). Null = here. */
  awaySince: number | null;
  /** Screen the player has open (client says so with a 'look' action). */
  looking?: LookAt;
}

export interface RoomState {
  instanceId: string;
  /** Discord guild the instance runs in, when the client knew it. Only used for the live-tables count. */
  guildId?: string | null;
  version: number;
  members: Record<string, RoomMember>;
  dad: dad.DadState;
  trivia: trivia.TriviaState;
  bluff: bluff.BluffState;
  /**
   * High-score bookkeeping for the last finished trivia game. `brags` is null when the game was off
   * the record (no server). Absent until a game has been run to the end.
   */
  triviaPosted?: { game: number; brags: Record<string, Brag> | null };
  /**
   * Daily Grass: a mirror of each member's own board and stats (the real ones live in the SCORES
   * DO, one instance per player). Only that member's view ever carries their letters.
   */
  daily?: Record<string, DailyPublic>;
  /** Myth or Math runs, one per player. */
  myth?: myth.MythState;
  /** Chess, 1v1 with the room watching. Absent in rooms stored before chess. */
  chess?: chess.ChessState;
  /** Cached boards for the solo games (this server's). null = not loaded yet. */
  solo?: {
    solvers: { day: string; rows: SolverRow[] } | null;
    ranks: Record<string, { day: string; rank: number }>;
    mythWeek: { weekStart: number; rows: ScoreRow[] } | null;
  };
}

/** A finished Myth or Math run waiting to go on the server's week board. */
export interface PendingMythScore {
  userId: string;
  runId: string;
  result: FinishedScore;
}

/** A finished trivia game's server-computed scores, waiting to go on the server's board. */
export interface PendingHighScores {
  game: number;
  results: FinishedScore[];
}

export type ActionResult = { ok: true } | { ok: false; code: string; message: string };

export function createRoomState(instanceId: string): RoomState {
  return {
    instanceId,
    version: 0,
    members: {},
    dad: dad.createDad(),
    trivia: trivia.createTrivia(),
    bluff: bluff.createBluff(),
    daily: {},
    myth: myth.createMyth(),
    chess: chess.createChess(),
    solo: { solvers: null, ranks: {}, mythWeek: null },
  };
}

/** Older stored rooms (break-timer era, pre-Bluff) get trivia and Bluff slots and an away flag. */
export function upgradeRoomState(saved: RoomState): RoomState {
  const s = saved as RoomState & { brk?: unknown };
  delete s.brk;
  s.trivia ??= trivia.createTrivia();
  s.bluff ??= bluff.createBluff();
  s.daily ??= {};
  s.myth ??= myth.createMyth();
  s.chess ??= chess.createChess();
  s.solo ??= { solvers: null, ranks: {}, mythWeek: null };
  for (const m of Object.values(s.members)) m.awaySince ??= null;
  return s;
}

/** Token bucket per user. In memory only: resets if the room is evicted, which is fine. */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; at: number }>();
  constructor(
    private readonly capacity = RATE_LIMIT_CAPACITY,
    private readonly refillPerSec = RATE_LIMIT_REFILL_PER_SEC,
  ) {}

  take(key: string, now: number): boolean {
    const b = this.buckets.get(key) ?? { tokens: this.capacity, at: now };
    const refill = ((now - b.at) / 1000) * this.refillPerSec;
    b.tokens = Math.min(this.capacity, b.tokens + Math.max(0, refill));
    b.at = now;
    if (b.tokens < 1) {
      this.buckets.set(key, b);
      return false;
    }
    b.tokens -= 1;
    this.buckets.set(key, b);
    return true;
  }
}

export class Room {
  readonly limiter = new RateLimiter();

  constructor(
    public state: RoomState,
    private readonly rng: Rng,
  ) {}

  private bump(): void {
    this.state.version += 1;
  }

  /** Join, or re-attach after a drop: same Discord id gets the same seat, hand and score back. */
  join(user: RoomUser, now: number): void {
    const existing = this.state.members[user.id];
    this.state.members[user.id] = {
      id: user.id,
      name: user.name.slice(0, 64),
      avatar: user.avatar,
      joinedAt: existing?.joinedAt ?? now,
      lastSeen: now,
      awaySince: null,
      looking: existing?.looking,
    };
    // Back from a drop: a paused Myth or Math card picks up where it was.
    myth.resume(this.myth, user.id, now);
    this.bump();
    // A returning Bluff teller restarts a write clock that ran out while they were away.
    this.tick(now);
  }

  touch(userId: string, now: number): void {
    const m = this.state.members[userId];
    if (!m) return;
    m.lastSeen = now;
    if (m.awaySince !== null) {
      m.awaySince = null;
      myth.resume(this.myth, userId, now);
      this.bump();
      this.tick(now);
    }
  }

  isMember(userId: string): boolean {
    return Boolean(this.state.members[userId]);
  }

  isAway(userId: string): boolean {
    return (this.state.members[userId]?.awaySince ?? null) !== null;
  }

  /** Connected members (away players excluded). */
  activeIds(): string[] {
    return Object.values(this.state.members)
      .filter((m) => m.awaySince === null)
      .map((m) => m.id);
  }

  /** Connection dropped. Keep everything, start the grace clock. */
  markAway(userId: string, now: number): boolean {
    const m = this.state.members[userId];
    if (!m || m.awaySince !== null) return false;
    m.awaySince = now;
    // Solo games need no away grace: freeze an open Myth or Math card; Daily Grass lives server side.
    myth.pause(this.myth, userId, now);
    this.bump();
    return true;
  }

  /** Really gone: explicit leave, or the grace period ran out. */
  leave(userId: string, _now: number): void {
    if (!this.state.members[userId]) return;
    delete this.state.members[userId];
    dad.removePlayer(this.state.dad, userId, this.rng);
    trivia.removePlayer(this.state.trivia, userId);
    bluff.removePlayer(this.state.bluff, userId, this.rng, _now);
    // Solo progress is kept: a Myth or Math run stays paused for when they come back (it ages out
    // after a few idle hours), and the Daily Grass board is stored per player outside the room.
    myth.pause(this.myth, userId, _now);
    // Chess: a player who really left mid-game loses it; their seat opens.
    chess.removePlayer(this.chess, userId);
    this.bump();
  }

  /**
   * Members with no live socket: pollers who went quiet are marked away, and anyone away longer
   * than the grace period is removed. Returns true if anything changed.
   */
  sweep(now: number, hasLiveSocket: (userId: string) => boolean): boolean {
    let changed = false;
    for (const m of Object.values(this.state.members)) {
      if (hasLiveSocket(m.id)) continue;
      if (m.awaySince === null) {
        if (now - m.lastSeen > PRESENCE_TIMEOUT_MS) changed = this.markAway(m.id, now) || changed;
      } else if (now - m.awaySince >= AWAY_GRACE_MS) {
        this.leave(m.id, now);
        changed = true;
      }
    }
    return changed;
  }

  get myth(): myth.MythState {
    return (this.state.myth ??= myth.createMyth());
  }

  get chess(): chess.ChessState {
    return (this.state.chess ??= chess.createChess());
  }

  private get solo(): NonNullable<RoomState['solo']> {
    return (this.state.solo ??= { solvers: null, ranks: {}, mythWeek: null });
  }

  /** Time-based transitions. Returns true when state changed. */
  tick(now: number): boolean {
    const active = this.activeIds();
    const t = trivia.tick(this.state.trivia, now, this.rng, active);
    const b = bluff.tick(this.state.bluff, now, this.rng, active);
    const mm = myth.tick(this.myth, now);
    const c = chess.tick(this.chess, now);
    if (t || b || mm || c) {
      this.bump();
      return true;
    }
    return false;
  }

  /**
   * Scores from a trivia game the room ran to the end that have not been put on a board yet.
   * Only phase 'over' qualifies, which is only reached after the last reveal, so an abandoned or
   * restarted game never counts. Every number comes from server state, never from a client.
   */
  pendingHighScores(): PendingHighScores | null {
    const tv = this.state.trivia;
    if (tv.phase !== 'over' || tv.game < 1) return null;
    if (this.state.triviaPosted?.game === tv.game) return null;
    const results: FinishedScore[] = [];
    for (const [id, score] of Object.entries(tv.scores)) {
      const m = this.state.members[id];
      if (!m) continue;
      results.push({ id, name: m.name, avatar: m.avatar, score });
    }
    return { game: tv.game, results };
  }

  /** Mark a finished game as handled. `brags` null = off the record (no server to put it on). */
  applyHighScores(game: number, brags: Record<string, Brag> | null): void {
    this.state.triviaPosted = { game, brags };
    this.bump();
  }

  /**
   * Gate for actions the host runs itself (Daily Grass talks to storage, so it can't run inside
   * handle()): same membership check, rate limit and presence touch as every other action.
   */
  gate(userId: string, now: number): ActionResult {
    if (!this.isMember(userId)) return { ok: false, code: 'not-in-room', message: 'Join the room first.' };
    if (!this.limiter.take(userId, now)) return { ok: false, code: 'rate-limited', message: 'Slow down a little.' };
    this.touch(userId, now);
    this.tick(now);
    return { ok: true };
  }

  /** The player's own Daily Grass board, as the storage side returned it. */
  setDaily(userId: string, pub: DailyPublic): void {
    (this.state.daily ??= {})[userId] = pub;
    this.bump();
  }

  setSolvers(view: { day: string; rows: SolverRow[] }): void {
    this.solo.solvers = { day: view.day, rows: view.rows.map((r) => ({ ...r })) };
    this.bump();
  }

  setDailyRank(userId: string, day: string, rank: number | null): void {
    if (rank === null) delete this.solo.ranks[userId];
    else this.solo.ranks[userId] = { day, rank };
    this.bump();
  }

  setMythWeek(weekStart: number, rows: ScoreRow[]): void {
    this.solo.mythWeek = { weekStart, rows: rows.map((r) => ({ ...r })) };
    this.bump();
  }

  /** Finished Myth or Math runs not yet put on a board. Every number comes from server state. */
  pendingMyth(): PendingMythScore[] {
    const out: PendingMythScore[] = [];
    for (const [userId, run] of Object.entries(this.myth.runs)) {
      if (run.phase !== 'over' || run.board !== 'pending') continue;
      const m = this.state.members[userId];
      out.push({ userId, runId: run.runId, result: { id: userId, name: m?.name ?? 'someone', avatar: m?.avatar ?? null, score: run.score } });
    }
    return out;
  }

  /** Mark a finished run as handled. `brag` null with offRecord = no server to put it on. */
  applyMyth(userId: string, runId: string, brag: Brag | null, offRecord = false): void {
    const run = this.myth.runs[userId];
    if (!run || run.runId !== runId) return;
    run.board = offRecord ? 'off-record' : 'posted';
    run.brag = brag;
    this.bump();
  }

  /** Next time the host should wake up: trivia timers and away-grace expiries. */
  nextWake(): number | null {
    const times: number[] = [];
    const mw = myth.nextWake(this.myth);
    if (mw !== null) times.push(mw);
    const t = trivia.nextWake(this.state.trivia);
    if (t !== null) times.push(t);
    const b = bluff.nextWake(this.state.bluff);
    if (b !== null) times.push(b);
    const c = chess.nextWake(this.chess);
    if (c !== null) times.push(c);
    for (const m of Object.values(this.state.members)) if (m.awaySince !== null) times.push(m.awaySince + AWAY_GRACE_MS);
    return times.length ? Math.min(...times) : null;
  }

  handle(userId: string, action: ClientAction, now: number): ActionResult {
    if (!this.isMember(userId)) return { ok: false, code: 'not-in-room', message: 'Join the room first.' };
    if (!this.limiter.take(userId, now)) return { ok: false, code: 'rate-limited', message: 'Slow down a little.' };
    this.touch(userId, now);
    this.tick(now);
    const s = this.state;
    let r: ActionResult;
    switch (action.t) {
      case 'ping':
        return { ok: true };
      case 'look': {
        const m = s.members[userId] as RoomMember;
        if (m.looking !== action.at) {
          m.looking = action.at;
          this.bump();
        }
        return { ok: true };
      }
      case 'dad.sit':
        r = dad.sit(s.dad, userId);
        break;
      case 'dad.stand':
        r = dad.stand(s.dad, userId, this.rng);
        break;
      case 'dad.start':
        r = dad.start(s.dad, userId, this.rng, action.target);
        break;
      case 'dad.submit':
        r = dad.submit(s.dad, userId, action.cardId, this.rng);
        break;
      case 'dad.pick':
        r = dad.pick(s.dad, userId, action.entryId, this.rng);
        break;
      case 'dad.next':
        r = dad.next(s.dad, userId, this.rng);
        break;
      case 'dad.reset':
        r = dad.reset(s.dad, userId);
        break;
      case 'trivia.start':
        r = trivia.start(s.trivia, userId, now, this.rng, this.activeIds());
        break;
      case 'trivia.answer':
        r = trivia.answer(s.trivia, userId, action.qid, action.choice, now);
        if (r.ok) this.tick(now); // last answer in closes the window early
        break;
      case 'trivia.leave':
        r = trivia.leave(s.trivia, userId);
        break;
      case 'bluff.sit':
        r = bluff.sit(s.bluff, userId);
        break;
      case 'bluff.stand':
        r = bluff.stand(s.bluff, userId, this.rng, now);
        break;
      case 'bluff.start':
        r = bluff.start(s.bluff, userId, now, this.rng);
        break;
      case 'bluff.tell':
        r = bluff.tell(s.bluff, userId, action.statements, action.lie, now, this.rng);
        break;
      case 'bluff.guess':
        r = bluff.guess(s.bluff, userId, action.rid, action.pick, now);
        if (r.ok) this.tick(now); // last guess in closes the window early
        break;
      case 'bluff.next':
        r = bluff.next(s.bluff, userId, now, this.rng);
        break;
      case 'myth.start':
        r = myth.start(this.myth, userId, now, this.rng);
        break;
      case 'myth.answer':
        r = myth.answer(this.myth, userId, action.rid, action.cid, action.pick, now);
        break;
      case 'myth.next':
        r = myth.next(this.myth, userId, now);
        break;
      case 'chess.claim':
        r = chess.claim(this.chess, userId, action.color);
        break;
      case 'chess.release':
        r = chess.release(this.chess, userId);
        break;
      case 'chess.clock':
        r = chess.setClock(this.chess, userId, action.minutes);
        break;
      case 'chess.start':
        r = chess.start(this.chess, userId, now);
        break;
      case 'chess.move':
        r = chess.move(this.chess, userId, action.ply, action.from, action.to, action.promotion ?? null, now);
        break;
      case 'chess.resign':
        r = chess.resign(this.chess, userId);
        break;
      case 'chess.draw':
        r = chess.offerDraw(this.chess, userId);
        break;
      case 'chess.decline':
        r = chess.declineDraw(this.chess, userId);
        break;
      case 'daily.open':
      case 'daily.guess':
      case 'daily.hint':
        // The host runs these (they need storage); reaching here means no solo service is wired.
        return { ok: false, code: 'not-configured', message: 'Daily Grass is not set up here.' };
      case 'leave':
        this.leave(userId, now);
        return { ok: true };
      default:
        return { ok: false, code: 'unknown-action', message: 'Unknown action.' };
    }
    if (r.ok) this.bump();
    return r;
  }

  /** What one user is allowed to see. Never includes anyone else's hand or who wrote which answer. */
  viewFor(userId: string, now: number): RoomView {
    const s = this.state;
    const d = s.dad;
    const tv = s.trivia;
    const away = (id: string) => (s.members[id]?.awaySince ?? null) !== null;
    const showReveal = tv.phase === 'reveal' || tv.phase === 'over';
    const posted = tv.phase === 'over' && s.triviaPosted?.game === tv.game ? s.triviaPosted : null;
    const seated = d.seats.includes(userId);
    const nonJudge = d.seats.filter((id) => id !== d.judgeId);
    const showEntries = d.phase === 'judging';
    // The judge holds no hand while judging: their cards stay server side until the judge rotates.
    const judgingNow = dad.isInGame(d) && d.judgeId === userId;
    return {
      instanceId: s.instanceId,
      serverNow: now,
      version: s.version,
      you: userId,
      members: Object.values(s.members)
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map(({ id, name, avatar, awaySince }) => ({ id, name, avatar, away: awaySince !== null })),
      dad: {
        phase: d.phase,
        targetScore: d.targetScore,
        round: d.round,
        seats: d.seats.map((id) => ({
          id,
          score: d.scores[id] ?? 0,
          isJudge: id === d.judgeId && dad.isInGame(d),
          submitted: Boolean(d.submissions[id]) || (d.phase === 'judging' && id !== d.judgeId),
          away: away(id),
        })),
        waiting: [...d.waiting],
        judgeId: dad.isInGame(d) ? d.judgeId : null,
        prompt: d.prompt?.text ?? null,
        submittedCount: d.phase === 'judging' ? nonJudge.length : Object.keys(d.submissions).length,
        neededCount: nonJudge.length,
        hand: seated && !judgingNow ? [...(d.hands[userId] ?? [])] : [],
        freshIds: seated && !judgingNow ? (d.fresh?.[userId] ?? []).filter((id) => (d.hands[userId] ?? []).some((c) => c.id === id)) : [],
        mySubmission: d.submissions[userId] ?? null,
        entries: showEntries ? d.entries.map((e) => ({ entryId: e.entryId, text: e.card.text })) : [],
        lastRound: d.lastRound,
        winnerId: d.winnerId,
        me: { seated, waiting: d.waiting.includes(userId), isJudge: dad.isInGame(d) && d.judgeId === userId },
      },
      trivia: {
        phase: tv.phase,
        game: tv.game,
        number: tv.game ? tv.index + 1 : 0,
        total: tv.total,
        // Deliberately built field by field: the correct choice is never copied here.
        question: tv.phase === 'question' && tv.current ? { id: tv.current.id, text: tv.current.text, choices: [...tv.current.choices] } : null,
        endsAt: tv.phase === 'question' && tv.current ? tv.current.endsAt : null,
        revealEndsAt: tv.phase === 'reveal' ? tv.revealEndsAt : null,
        answeredCount: tv.phase === 'question' ? Object.keys(tv.answers).length : 0,
        playingCount: trivia.isRunning(tv) ? Object.keys(tv.scores).length : 0,
        reveal: showReveal && tv.lastReveal ? { ...tv.lastReveal, choices: [...tv.lastReveal.choices], counts: [...tv.lastReveal.counts], results: tv.lastReveal.results.map((r) => ({ ...r })) } : null,
        scores: trivia.standings(tv).map((x) => ({ ...x, away: away(x.id) })),
        winnerIds: tv.phase === 'over' ? trivia.winners(tv) : [],
        me: { playing: tv.scores[userId] !== undefined, answered: tv.phase === 'question' ? (tv.answers[userId]?.choice ?? null) : null, brag: posted?.brags?.[userId] ?? null },
        highScores: tv.phase !== 'over' ? 'none' : !posted ? 'pending' : posted.brags ? 'posted' : 'off-record',
      },
      bluff: this.bluffView(userId, away),
      daily: this.dailyView(userId, now, away),
      myth: this.mythView(userId),
      chess: chess.viewFor(this.chess, userId, now),
    };
  }

  /** Who is on a solo screen right now (connected, looking at it). */
  lookingAt(at: LookAt): number {
    return Object.values(this.state.members).filter((m) => m.awaySince === null && m.looking === at).length;
  }

  /** Connected players with a Myth or Math run going. */
  mythPlaying(): number {
    return Object.values(this.state.members).filter((m) => m.awaySince === null && myth.isPlaying(this.myth.runs[m.id])).length;
  }

  /** Daily Grass, as one viewer may see it: their own board in full, everyone else's progress only. */
  private dailyView(userId: string, now: number, away: (id: string) => boolean): RoomView['daily'] {
    const today = dayKeyFor(now);
    const boards = this.state.daily ?? {};
    const mine = boards[userId];
    const solvers = this.solo.solvers;
    const rank = this.solo.ranks[userId];
    return {
      today,
      me: mine
        ? { ...mine, rows: mine.rows.map((r) => ({ word: r.word, colors: [...r.colors] })), hint: mine.hint ? { ...mine.hint } : null, stats: { ...mine.stats, dist: [...mine.stats.dist] } }
        : null,
      friends: Object.entries(boards)
        .filter(([id, b]) => id !== userId && this.state.members[id] && b.day === today)
        .map(([id, b]) => ({ id, rows: b.rows.length, status: b.status, away: away(id) })),
      playingCount: this.lookingAt('daily'),
      solvers: !this.state.guildId ? { kind: 'no-server' } : solvers && solvers.day === today ? { kind: 'board', day: solvers.day, rows: solvers.rows.map((r) => ({ ...r })) } : { kind: 'loading' },
      myRank: rank && rank.day === today ? rank.rank : null,
    };
  }

  private mythView(userId: string): RoomView['myth'] {
    const wk = this.solo.mythWeek;
    return {
      run: myth.runView(this.myth.runs[userId]),
      playingCount: this.mythPlaying(),
      board: !this.state.guildId ? { kind: 'no-server' } : wk ? { kind: 'board', weekStart: wk.weekStart, rows: wk.rows.map((r) => ({ ...r })) } : { kind: 'loading' },
    };
  }

  /** Bluff, as one viewer may see it. The lie is only in the teller's own `mine` until the reveal. */
  private bluffView(userId: string, away: (id: string) => boolean): RoomView['bluff'] {
    const b = this.state.bluff;
    const guessing = b.phase === 'guessing' && b.statements !== null;
    const isTeller = bluff.isInGame(b) && b.tellerId === userId;
    const others = bluff.guessers(b);
    const myGuess = b.guesses[userId];
    return {
      phase: b.phase,
      game: b.game,
      round: b.round,
      total: b.order.length,
      seats: b.seats.map((id) => ({
        id,
        score: b.scores[id] ?? 0,
        isTeller: bluff.isInGame(b) && id === b.tellerId,
        told: b.told.includes(id),
        guessed: guessing && b.guesses[id] !== undefined,
        away: away(id),
      })),
      waiting: [...b.waiting],
      tellerId: bluff.isInGame(b) ? b.tellerId : null,
      prompt: bluff.isInGame(b) ? b.prompt : null,
      rid: guessing ? b.rid : null,
      // Deliberately copied text only: the lie index is never part of this list.
      statements: guessing ? [...(b.statements as string[])] : null,
      writeEndsAt: b.phase === 'writing' ? b.writeEndsAt : null,
      guessEndsAt: guessing ? b.guessEndsAt : null,
      revealEndsAt: b.phase === 'reveal' ? b.revealEndsAt : null,
      guessedCount: guessing ? others.filter((id) => b.guesses[id] !== undefined).length : 0,
      neededCount: guessing ? others.length : 0,
      lastRound: guessing || !b.lastRound ? null : { ...b.lastRound, statements: b.lastRound.statements ? [...b.lastRound.statements] : null, picks: b.lastRound.picks.map((p) => ({ ...p })) },
      scores: bluff.standings(b).map((x) => ({ ...x, away: away(x.id) })),
      winnerIds: b.phase === 'over' ? [...b.winnerIds] : [],
      me: {
        seated: b.seats.includes(userId),
        waiting: b.waiting.includes(userId),
        isTeller,
        guess: guessing && myGuess !== undefined ? myGuess : null,
        mine: guessing && isTeller && b.lie !== null ? { statements: [...(b.statements as string[])], lie: b.lie } : null,
      },
    };
  }
}
