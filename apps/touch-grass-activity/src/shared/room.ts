// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// One room per Discord Activity instance: who is here, the DA&D table and the group break.
// Runs inside the Durable Object (authoritative) and inside the guest/dev room in the browser.

import * as dad from './dad.js';
import * as brk from './breakTimer.js';
import type { Rng } from './rng.js';
import type { ClientAction, RoomUser, RoomView } from './protocol.js';

export const PRESENCE_TIMEOUT_MS = 45_000;
export const RATE_LIMIT_CAPACITY = 10;
export const RATE_LIMIT_REFILL_PER_SEC = 2;

export interface RoomMember extends RoomUser {
  joinedAt: number;
  lastSeen: number;
}

export interface RoomState {
  instanceId: string;
  version: number;
  members: Record<string, RoomMember>;
  dad: dad.DadState;
  brk: brk.BreakState;
}

export type ActionResult = { ok: true } | { ok: false; code: string; message: string };

export function createRoomState(instanceId: string): RoomState {
  return { instanceId, version: 0, members: {}, dad: dad.createDad(), brk: brk.createBreak() };
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

  join(user: RoomUser, now: number): void {
    const existing = this.state.members[user.id];
    this.state.members[user.id] = {
      id: user.id,
      name: user.name.slice(0, 64),
      avatar: user.avatar,
      joinedAt: existing?.joinedAt ?? now,
      lastSeen: now,
    };
    brk.joinBreak(this.state.brk, user.id, now);
    this.bump();
  }

  touch(userId: string, now: number): void {
    const m = this.state.members[userId];
    if (m) m.lastSeen = now;
  }

  isMember(userId: string): boolean {
    return Boolean(this.state.members[userId]);
  }

  leave(userId: string, now: number): void {
    if (!this.state.members[userId]) return;
    delete this.state.members[userId];
    dad.removePlayer(this.state.dad, userId, this.rng);
    brk.leaveBreak(this.state.brk, userId, now);
    this.bump();
  }

  /** Drop members with no live socket who also stopped polling. Returns true if anything changed. */
  sweep(now: number, hasLiveSocket: (userId: string) => boolean): boolean {
    let changed = false;
    for (const m of Object.values(this.state.members)) {
      if (!hasLiveSocket(m.id) && now - m.lastSeen > PRESENCE_TIMEOUT_MS) {
        this.leave(m.id, now);
        changed = true;
      }
    }
    return changed;
  }

  /** Time-based transitions. Returns true when state changed. */
  tick(now: number): boolean {
    if (brk.tickBreak(this.state.brk, now)) {
      this.bump();
      return true;
    }
    return false;
  }

  /** Next time the host should wake up to call tick(). */
  nextWake(): number | null {
    return this.state.brk.phase === 'running' ? this.state.brk.endsAt : null;
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
      case 'break.start':
        r = brk.startBreak(s.brk, userId, action.minutes, now, Object.keys(s.members));
        break;
      case 'break.bail':
        r = brk.bail(s.brk, userId, now);
        break;
      case 'break.reset':
        r = brk.resetBreak(s.brk);
        break;
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
        .map(({ id, name, avatar }) => ({ id, name, avatar })),
      dad: {
        phase: d.phase,
        targetScore: d.targetScore,
        round: d.round,
        seats: d.seats.map((id) => ({
          id,
          score: d.scores[id] ?? 0,
          isJudge: id === d.judgeId && dad.isInGame(d),
          submitted: Boolean(d.submissions[id]) || (d.phase === 'judging' && id !== d.judgeId),
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
      brk: {
        phase: s.brk.phase,
        minutes: s.brk.minutes,
        startedBy: s.brk.startedBy,
        startedAt: s.brk.startedAt,
        endsAt: s.brk.endsAt,
        endedAt: s.brk.endedAt,
        crew: Object.entries(s.brk.crew).map(([id, m]) => ({ id, bailedAt: m.bailedAt, left: m.left })),
        me: { inBreak: Boolean(s.brk.crew[userId]), bailedAt: s.brk.crew[userId]?.bailedAt ?? null },
      },
    };
  }
}
