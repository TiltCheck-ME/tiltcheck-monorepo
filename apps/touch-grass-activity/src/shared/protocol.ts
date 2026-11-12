// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Wire format between the Activity client and the room (worker Durable Object or guest room).

import type { Card } from './deck.js';
import type { DadPhase, DadRoundResult } from './dad.js';
import type { TriviaPhase } from './trivia.js';
import type { BluffPhase, BluffRoundResult } from './bluff.js';
import type { Brag } from './scores.js';

export interface RoomUser {
  id: string;
  name: string;
  avatar: string | null;
}

/** A member as everyone sees them. `away` = connection dropped, seat held for the grace period. */
export interface RoomMemberView extends RoomUser {
  away: boolean;
}

export type ClientAction =
  | { t: 'dad.sit' }
  | { t: 'dad.stand' }
  | { t: 'dad.start'; target?: number }
  | { t: 'dad.submit'; cardId: string }
  | { t: 'dad.pick'; entryId: string }
  | { t: 'dad.next' }
  | { t: 'dad.reset' }
  | { t: 'trivia.start' }
  | { t: 'trivia.answer'; qid: string; choice: number }
  | { t: 'trivia.leave' }
  | { t: 'bluff.sit' }
  | { t: 'bluff.stand' }
  | { t: 'bluff.start' }
  /** Teller only: three statements in the order written, and which one (0-2) is the lie. */
  | { t: 'bluff.tell'; statements: [string, string, string]; lie: number }
  | { t: 'bluff.guess'; rid: string; pick: number }
  | { t: 'bluff.next' }
  | { t: 'leave' }
  | { t: 'ping' }
  /** Which screen this player has open. Only feeds "someone is waiting at Trivia" for table alerts. */
  | { t: 'look'; at: LookAt };

export type LookAt = 'lobby' | 'dad' | 'trivia' | 'bluff';

/** Raw statement text accepted off the wire; the room cleans it and enforces the real 120-char cap. */
export const MAX_RAW_STATEMENT = 600;

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
  away: boolean;
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

export interface TriviaRevealView {
  questionId: string;
  index: number;
  text: string;
  choices: string[];
  correct: number;
  counts: number[];
  results: Array<{ id: string; choice: number | null; correct: boolean; points: number }>;
}

export interface TriviaView {
  phase: TriviaPhase;
  game: number;
  /** 1-based question number, 0 before the first game. */
  number: number;
  total: number;
  /** Question in flight. Never carries the correct choice. */
  question: { id: string; text: string; choices: string[] } | null;
  endsAt: number | null;
  revealEndsAt: number | null;
  answeredCount: number;
  playingCount: number;
  /** Only present in reveal and over, for the question that just closed. */
  reveal: TriviaRevealView | null;
  scores: Array<{ id: string; score: number; away: boolean }>;
  winnerIds: string[];
  /** brag: the viewer's own result on the server board for the game that just ended. */
  me: { playing: boolean; answered: number | null; brag: Brag | null };
  /**
   * Board status for a finished game: 'pending' while it is being written, 'posted' once on the
   * server's board, 'off-record' when the game had no server (DM / group DM). 'none' outside 'over'.
   */
  highScores: 'none' | 'pending' | 'posted' | 'off-record';
}

export interface BluffSeatView {
  id: string;
  score: number;
  isTeller: boolean;
  told: boolean;
  guessed: boolean;
  away: boolean;
}

export interface BluffView {
  phase: BluffPhase;
  game: number;
  round: number;
  /** Rounds in this game (one per teller). */
  total: number;
  seats: BluffSeatView[];
  waiting: string[];
  tellerId: string | null;
  prompt: string | null;
  /** Round id to send with a guess. */
  rid: string | null;
  /** Shuffled statements while guessing. Never carries the lie. */
  statements: string[] | null;
  writeEndsAt: number | null;
  guessEndsAt: number | null;
  revealEndsAt: number | null;
  guessedCount: number;
  neededCount: number;
  /** The round that just closed (reveal, or a skip note). Absent while guessing. */
  lastRound: BluffRoundResult | null;
  scores: Array<{ id: string; score: number; away: boolean }>;
  winnerIds: string[];
  me: {
    seated: boolean;
    waiting: boolean;
    isTeller: boolean;
    /** Viewer's own locked guess this round. */
    guess: number | null;
    /** Teller only, while guessing: their statements in display order with the lie marked. */
    mine: { statements: string[]; lie: number } | null;
  };
}

export interface RoomView {
  instanceId: string;
  serverNow: number;
  version: number;
  you: string;
  members: RoomMemberView[];
  dad: DadView;
  trivia: TriviaView;
  bluff: BluffView;
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
    case 'trivia.start':
    case 'trivia.leave':
    case 'bluff.sit':
    case 'bluff.stand':
    case 'bluff.start':
    case 'bluff.next':
    case 'leave':
    case 'ping':
      return { t: m.t };
    case 'look':
      return m.at === 'lobby' || m.at === 'dad' || m.at === 'trivia' || m.at === 'bluff' ? { t: 'look', at: m.at } : null;
    case 'bluff.tell': {
      const st = m.statements;
      if (!Array.isArray(st) || st.length !== 3 || !st.every((x) => typeof x === 'string' && x.length <= MAX_RAW_STATEMENT)) return null;
      if (!Number.isInteger(m.lie) || (m.lie as number) < 0 || (m.lie as number) > 2) return null;
      return { t: 'bluff.tell', statements: [st[0], st[1], st[2]] as [string, string, string], lie: m.lie as number };
    }
    case 'bluff.guess':
      return typeof m.rid === 'string' && ID_RE.test(m.rid) && Number.isInteger(m.pick) && (m.pick as number) >= 0 && (m.pick as number) <= 2
        ? { t: 'bluff.guess', rid: m.rid, pick: m.pick as number }
        : null;
    case 'dad.start':
      if (m.target === undefined) return { t: 'dad.start' };
      return typeof m.target === 'number' && Number.isFinite(m.target) ? { t: 'dad.start', target: m.target } : null;
    case 'dad.submit':
      return typeof m.cardId === 'string' && ID_RE.test(m.cardId) ? { t: 'dad.submit', cardId: m.cardId } : null;
    case 'dad.pick':
      return typeof m.entryId === 'string' && ID_RE.test(m.entryId) ? { t: 'dad.pick', entryId: m.entryId } : null;
    case 'trivia.answer':
      return typeof m.qid === 'string' && ID_RE.test(m.qid) && Number.isInteger(m.choice) && (m.choice as number) >= 0 && (m.choice as number) <= 3
        ? { t: 'trivia.answer', qid: m.qid, choice: m.choice as number }
        : null;
    default:
      return null;
  }
}

/** Discord guild ids are snowflakes. Anything else is dropped. */
export function isValidGuildId(id: string | null | undefined): id is string {
  return typeof id === 'string' && /^\d{5,25}$/.test(id);
}

/**
 * Which guild a room belongs to. Discord instance ids carry it: i-<id>-gc-<guild>-<channel> in a
 * server channel, i-<id>-pc-<channel> in a DM or group DM. When the id says, it wins over what the
 * client sent; otherwise (unknown id shape) the client's sdk.guildId is used.
 */
export function guildForInstance(instanceId: string, clientGuild: string | null | undefined): string | null {
  const gc = /^i-\d+-gc-(\d{5,25})-\d+$/.exec(instanceId);
  if (gc) return gc[1] as string;
  if (/^i-\d+-pc-\d+$/.test(instanceId)) return null;
  return isValidGuildId(clientGuild) ? clientGuild : null;
}

/** Discord instance ids look like i-123-gc-456-789. Keep the key boring. */
export function isValidInstanceId(id: string): boolean {
  return /^[A-Za-z0-9:._-]{1,128}$/.test(id);
}
