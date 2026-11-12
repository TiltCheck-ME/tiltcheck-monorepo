// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// One room per Discord Activity instance: who is here, the DA&D table and the trivia game.
// Runs inside the Durable Object (authoritative) and inside the guest/dev room in the browser.

import * as dad from './dad.js';
import * as trivia from './trivia.js';
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
  /**
   * High-score bookkeeping for the last finished trivia game. `brags` is null when the game was off
   * the record (no server). Absent until a game has been run to the end.
   */
  triviaPosted?: { game: number; brags: Record<string, Brag> | null };
}

/** A finished trivia game's server-computed scores, waiting to go on the server's board. */
export interface PendingHighScores {
  game: number;
  results: FinishedScore[];
}

export type ActionResult = { ok: true } | { ok: false; code: string; message: string };

export function createRoomState(instanceId: string): RoomState {
  return { instanceId, version: 0, members: {}, dad: dad.createDad(), trivia: trivia.createTrivia() };
}

/** Older stored rooms (break-timer era) get a trivia slot and an away flag. */
export function upgradeRoomState(saved: RoomState): RoomState {
  const s = saved as RoomState & { brk?: unknown };
  delete s.brk;
  s.trivia ??= trivia.createTrivia();
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
    this.bump();
  }

  touch(userId: string, now: number): void {
    const m = this.state.members[userId];
    if (!m) return;
    m.lastSeen = now;
    if (m.awaySince !== null) {
      m.awaySince = null;
      this.bump();
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
    this.bump();
    return true;
  }

  /** Really gone: explicit leave, or the grace period ran out. */
  leave(userId: string, _now: number): void {
    if (!this.state.members[userId]) return;
    delete this.state.members[userId];
    dad.removePlayer(this.state.dad, userId, this.rng);
    trivia.removePlayer(this.state.trivia, userId);
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

  /** Time-based transitions. Returns true when state changed. */
  tick(now: number): boolean {
    if (trivia.tick(this.state.trivia, now, this.rng, this.activeIds())) {
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

  /** Next time the host should wake up: trivia timers and away-grace expiries. */
  nextWake(): number | null {
    const times: number[] = [];
    const t = trivia.nextWake(this.state.trivia);
    if (t !== null) times.push(t);
    for (const m of Object.values(this.state.members)) if (m.awaySince !== null) times.push(m.awaySince + AWAY_GRACE_MS);
    return times.length ? Math.min(...times) : null;
  }

  handle(userId: string, action: ClientAction, now: number): ActionResult {
    if (!this.isMember(userId)) return { ok: false, code: 'not-in-room', message: 'Join the room first.' };
    if (!this.limiter.take(userId, now)) return { ok: false, code: 'rate-limited', message: 'Easy on the buttons.' };
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
        r = dad.pick(s.dad, userId, action.entryId);
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
        hand: seated ? [...(d.hands[userId] ?? [])] : [],
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
    };
  }
}
