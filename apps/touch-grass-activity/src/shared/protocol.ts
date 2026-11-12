// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Wire format between the Activity client and the room (worker Durable Object or guest room).

import type { Card } from './deck.js';
import type { DadPhase, DadRoundResult } from './dad.js';
import type { BreakMinutes, BreakPhase } from './breakTimer.js';

export interface RoomUser {
  id: string;
  name: string;
  avatar: string | null;
}

export type ClientAction =
  | { t: 'dad.sit' }
  | { t: 'dad.stand' }
  | { t: 'dad.start'; target?: number }
  | { t: 'dad.submit'; cardId: string }
  | { t: 'dad.pick'; entryId: string }
  | { t: 'dad.next' }
  | { t: 'dad.reset' }
  | { t: 'break.start'; minutes: BreakMinutes }
  | { t: 'break.bail' }
  | { t: 'break.reset' }
  | { t: 'ping' };

/** First WebSocket message. Polling sends the token as a Bearer header instead. */
export interface AuthMessage {
  t: 'auth';
  token: string;
}

export type ClientMessage = ClientAction | AuthMessage;

export type ServerMessage =
  | { t: 'state'; view: RoomView }
  | { t: 'error'; code: string; message: string }
  | { t: 'hello'; you: RoomUser };

export interface DadSeatView {
  id: string;
  score: number;
  isJudge: boolean;
  submitted: boolean;
}

export interface DadView {
  phase: DadPhase;
  targetScore: number;
  round: number;
  seats: DadSeatView[];
  waiting: string[];
  judgeId: string | null;
  prompt: string | null;
  submittedCount: number;
  neededCount: number;
  /** Only ever the viewer's own hand. */
  hand: Card[];
  mySubmission: Card | null;
  /** Anonymised, shuffled answers. Present while judging. No player ids. */
  entries: Array<{ entryId: string; text: string }>;
  lastRound: DadRoundResult | null;
  winnerId: string | null;
  me: { seated: boolean; waiting: boolean; isJudge: boolean };
}

export interface BreakView {
  phase: BreakPhase;
  minutes: BreakMinutes | null;
  startedBy: string | null;
  startedAt: number | null;
  endsAt: number | null;
  endedAt: number | null;
  crew: Array<{ id: string; bailedAt: number | null; left: boolean }>;
  me: { inBreak: boolean; bailedAt: number | null };
}

export interface RoomView {
  instanceId: string;
  serverNow: number;
  version: number;
  you: string;
  members: RoomUser[];
  dad: DadView;
  brk: BreakView;
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Validate anything that came off the wire. Returns null for junk. */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.length > 4096) return null;
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;
  const m = data as Record<string, unknown>;
  switch (m.t) {
    case 'auth':
      return typeof m.token === 'string' && m.token.length > 0 && m.token.length <= 512 ? { t: 'auth', token: m.token } : null;
    case 'dad.sit':
    case 'dad.stand':
    case 'dad.next':
    case 'dad.reset':
    case 'break.bail':
    case 'break.reset':
    case 'ping':
      return { t: m.t };
    case 'dad.start':
      if (m.target === undefined) return { t: 'dad.start' };
      return typeof m.target === 'number' && Number.isFinite(m.target) ? { t: 'dad.start', target: m.target } : null;
    case 'dad.submit':
      return typeof m.cardId === 'string' && ID_RE.test(m.cardId) ? { t: 'dad.submit', cardId: m.cardId } : null;
    case 'dad.pick':
      return typeof m.entryId === 'string' && ID_RE.test(m.entryId) ? { t: 'dad.pick', entryId: m.entryId } : null;
    case 'break.start':
      return m.minutes === 5 || m.minutes === 10 || m.minutes === 15 ? { t: 'break.start', minutes: m.minutes } : null;
    default:
      return null;
  }
}

/** Discord instance ids look like i-123-gc-456-789. Keep the key boring. */
export function isValidInstanceId(id: string): boolean {
  return /^[A-Za-z0-9:._-]{1,128}$/.test(id);
}
