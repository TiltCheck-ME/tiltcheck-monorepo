// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-14
// RoomHost: the Durable Object's brain, with storage, sockets and auth injected so it can be
// unit tested with fakes. The DO class in room-do.ts is a thin adapter around this.

import { PRESENCE_TIMEOUT_MS, Room, createRoomState, upgradeRoomState, type RoomState } from '../../src/shared/room.js';
import { makeRng, type Rng } from '../../src/shared/rng.js';
import { isValidGuildId, parseClientMessage, type RoomUser, type ServerMessage } from '../../src/shared/protocol.js';
import { LIVE_HEARTBEAT_MS, reportFor, reportKey, type LiveReport } from '../../src/shared/live.js';
import type { Brag, FinishedScore } from '../../src/shared/scores.js';
import type { SoloService } from '../../src/shared/solo.js';
import { postMyth, refreshMythWeek, runDaily } from '../../src/shared/soloHost.js';
import type { ActionResult } from '../../src/shared/room.js';
import type { ClientMessage } from '../../src/shared/protocol.js';

export interface HostStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
}

/** A connected socket. `user` is null until the first auth message checks out. */
export interface HostSocket {
  user: RoomUser | null;
  send(msg: string): void;
  close(code?: number, reason?: string): void;
  setUser(user: RoomUser): void;
}

export type VerifyToken = (token: string) => Promise<RoomUser | null>;

export interface HostDeps {
  storage: HostStorage;
  sockets: () => HostSocket[];
  verify: VerifyToken;
  now?: () => number;
  rng?: Rng;
  /** Ask the platform to call alarm() at this time (or clear it with null). */
  setWake?: (at: number | null) => Promise<void>;
  /** Send this room's anonymous summary to the live-tables registry. Failures are ignored. */
  report?: (r: LiveReport) => Promise<void>;
  /**
   * Put a finished trivia game on this server's high-score board (TriviaScores DO). Only called by
   * the host itself when the room has run a game to the end; never with anything a client sent.
   */
  postScores?: (guildId: string, results: FinishedScore[]) => Promise<Record<string, Brag>>;
  /** Daily Grass storage and the solo boards (SCORES DO instances). Without it the solo games say so. */
  solo?: SoloService;
}

/** If writing the board fails, try again on the alarm, a few times. Best-only makes a repeat harmless. */
export const SCORE_RETRY_MS = 5_000;
export const SCORE_MAX_TRIES = 5;

const STORAGE_KEY = 'room';
export const MAX_MESSAGE_BYTES = 4096;

export class RoomHost {
  private room: Room | null = null;
  private readonly now: () => number;
  private readonly rng: Rng;
  private lastReportKey = '';
  private lastReportAt = 0;
  private scoreTries = 0;
  private scoreRetryAt: number | null = null;

  constructor(private readonly deps: HostDeps) {
    this.now = deps.now ?? Date.now;
    this.rng = deps.rng ?? makeRng();
  }

  async load(instanceId: string): Promise<Room> {
    if (this.room) return this.room;
    const saved = await this.deps.storage.get<RoomState>(STORAGE_KEY);
    this.room = new Room(saved ? upgradeRoomState(saved) : createRoomState(instanceId), this.rng);
    return this.room;
  }

  /** First valid guild id wins; it never changes for an instance. */
  async setGuild(instanceId: string, guildId: string | null | undefined): Promise<void> {
    if (!isValidGuildId(guildId)) return;
    const room = await this.load(instanceId);
    if (room.state.guildId) return;
    room.state.guildId = guildId;
    await this.save();
  }

  /**
   * A trivia game just ran to the end: put the server's own scores on the guild's board, and keep
   * each player's brag for the end screen. A game with no guild (DM / group DM) is off the record.
   */
  private async postHighScores(): Promise<void> {
    const room = this.room;
    if (!room) return;
    const pending = room.pendingHighScores();
    if (!pending) {
      this.scoreTries = 0;
      this.scoreRetryAt = null;
      return;
    }
    const guild = room.state.guildId;
    if (!isValidGuildId(guild)) {
      room.applyHighScores(pending.game, null);
      return;
    }
    if (!this.deps.postScores) return;
    if (this.scoreRetryAt !== null && this.now() < this.scoreRetryAt) return;
    try {
      const brags = await this.deps.postScores(guild, pending.results);
      room.applyHighScores(pending.game, brags);
      this.scoreTries = 0;
      this.scoreRetryAt = null;
    } catch {
      this.scoreTries += 1;
      if (this.scoreTries >= SCORE_MAX_TRIES) {
        // Give up on this game's board write; the end screen just won't brag.
        room.applyHighScores(pending.game, {});
        this.scoreTries = 0;
        this.scoreRetryAt = null;
      } else {
        this.scoreRetryAt = this.now() + SCORE_RETRY_MS;
      }
    }
  }

  private guild(): string | null {
    const g = this.room?.state.guildId;
    return isValidGuildId(g) ? g : null;
  }

  /**
   * Actions that need more than the room: Daily Grass (storage holds the answer) and a look at
   * Myth or Math (refresh the week board). Returns null when the room handles it alone.
   */
  private async soloAction(room: Room, user: RoomUser, msg: ClientMessage, now: number): Promise<ActionResult | null> {
    if (msg.t === 'daily.open' || msg.t === 'daily.guess' || msg.t === 'daily.hint') {
      const g = room.gate(user.id, now);
      if (!g.ok) return g;
      return runDaily(room, this.deps.solo, user, msg, this.guild(), now);
    }
    if (msg.t === 'look' && msg.at === 'myth' && this.deps.solo) {
      const r = room.handle(user.id, msg, now);
      if (r.ok) await refreshMythWeek(room, this.deps.solo, this.guild(), now);
      return r;
    }
    return null;
  }

  private async save(): Promise<void> {
    if (!this.room) return;
    await this.postHighScores();
    await postMyth(this.room, this.deps.solo, this.guild(), this.now());
    await this.deps.storage.put(STORAGE_KEY, this.room.state);
    await this.maybeReport();
    if (!this.deps.setWake) return;
    // Wake for trivia timers, away-grace expiries, and quiet pollers who should be marked away.
    let wake = this.room.nextWake();
    if (this.scoreRetryAt !== null) wake = wake === null ? this.scoreRetryAt : Math.min(wake, this.scoreRetryAt);
    const live = this.liveUserIds();
    for (const m of Object.values(this.room.state.members)) {
      if (live.has(m.id) || m.awaySince !== null) continue;
      const sweepAt = Math.max(this.now(), m.lastSeen) + PRESENCE_TIMEOUT_MS + 5_000;
      wake = wake === null ? sweepAt : Math.min(wake, sweepAt);
    }
    await this.deps.setWake(wake);
  }

  /** Report on change, plus a heartbeat while anyone is here so the registry TTL keeps us listed. */
  private async maybeReport(force = false): Promise<void> {
    if (!this.room || !this.deps.report) return;
    const r = reportFor(this.room.state, this.room.state.guildId ?? null);
    const key = reportKey(r);
    const now = this.now();
    const stale = r.members > 0 && now - this.lastReportAt >= LIVE_HEARTBEAT_MS;
    if (!force && key === this.lastReportKey && !stale) return;
    this.lastReportKey = key;
    this.lastReportAt = now;
    try {
      await this.deps.report(r);
    } catch {
      /* the live count is best effort */
    }
  }

  private liveUserIds(): Set<string> {
    const ids = new Set<string>();
    for (const s of this.deps.sockets()) if (s.user) ids.add(s.user.id);
    return ids;
  }

  private broadcast(): void {
    if (!this.room) return;
    const now = this.now();
    for (const s of this.deps.sockets()) {
      if (!s.user) continue;
      const msg: ServerMessage = { t: 'state', view: this.room.viewFor(s.user.id, now) };
      try {
        s.send(JSON.stringify(msg));
      } catch {
        /* socket already gone */
      }
    }
  }

  private sendTo(socket: HostSocket, msg: ServerMessage): void {
    try {
      socket.send(JSON.stringify(msg));
    } catch {
      /* ignore */
    }
  }

  /** WebSocket frame. */
  async onMessage(instanceId: string, socket: HostSocket, raw: string | ArrayBuffer): Promise<void> {
    const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
    if (text.length > MAX_MESSAGE_BYTES) {
      this.sendTo(socket, { t: 'error', code: 'too-big', message: 'Message too large.' });
      return;
    }
    const msg = parseClientMessage(text);
    if (!msg) {
      this.sendTo(socket, { t: 'error', code: 'bad-message', message: 'Could not read that.' });
      return;
    }
    const room = await this.load(instanceId);
    const now = this.now();

    if (msg.t === 'auth') {
      if (socket.user) return;
      const user = await this.deps.verify(msg.token);
      if (!user) {
        this.sendTo(socket, { t: 'error', code: 'unauthorized', message: 'Discord sign-in did not check out.' });
        socket.close(4001, 'unauthorized');
        return;
      }
      socket.setUser(user);
      room.join(user, now);
      this.sendTo(socket, { t: 'hello', you: user });
      await this.save();
      this.broadcast();
      return;
    }

    if (!socket.user) {
      this.sendTo(socket, { t: 'error', code: 'unauthorized', message: 'Send auth first.' });
      return;
    }
    const before = room.state.version;
    if (!room.isMember(socket.user.id)) room.join(socket.user, now);
    const r = (await this.soloAction(room, socket.user, msg, now)) ?? room.handle(socket.user.id, msg, now);
    if (!r.ok) {
      this.sendTo(socket, { t: 'error', code: r.code, message: r.message });
      if (room.state.version !== before) {
        await this.save();
        this.broadcast();
      }
      return;
    }
    if (msg.t === 'ping' && room.state.version === before) {
      this.sendTo(socket, { t: 'state', view: room.viewFor(socket.user.id, now) });
      await this.maybeReport();
      return;
    }
    if (msg.t === 'leave') {
      // Explicit leave: drop them now and close this socket.
      await this.save();
      this.broadcast();
      socket.close(1000, 'left');
      return;
    }
    await this.save();
    this.broadcast();
  }

  /**
   * Socket closed. A dropped connection is NOT leaving: if this was the user's last socket they are
   * marked away and keep their seat, hand and score for AWAY_GRACE_MS. The alarm removes them after.
   */
  async onClose(instanceId: string, socket: HostSocket): Promise<void> {
    if (!socket.user) return;
    const room = await this.load(instanceId);
    const stillHere = this.deps.sockets().some((s) => s !== socket && s.user?.id === socket.user?.id);
    if (stillHere || !room.isMember(socket.user.id)) return;
    if (!room.markAway(socket.user.id, this.now())) return;
    await this.save();
    this.broadcast();
  }

  /** Polling fallback: GET state. The worker already verified the user. */
  async pollState(instanceId: string, user: RoomUser): Promise<{ status: number; body: ServerMessage }> {
    const room = await this.load(instanceId);
    const now = this.now();
    const before = room.state.version;
    room.tick(now);
    if (!room.isMember(user.id) || room.isAway(user.id)) room.join(user, now);
    else room.touch(user.id, now);
    let changed = room.state.version !== before;
    const live = this.liveUserIds();
    if (room.sweep(now, (id) => live.has(id) || id === user.id)) changed = true;
    await this.save();
    if (changed || room.state.version !== before) this.broadcast();
    return { status: 200, body: { t: 'state', view: room.viewFor(user.id, now) } };
  }

  /** Polling fallback: POST action. */
  async pollAction(instanceId: string, user: RoomUser, raw: string): Promise<{ status: number; body: ServerMessage }> {
    if (raw.length > MAX_MESSAGE_BYTES) return { status: 413, body: { t: 'error', code: 'too-big', message: 'Message too large.' } };
    const msg = parseClientMessage(raw);
    if (!msg || msg.t === 'auth') return { status: 400, body: { t: 'error', code: 'bad-message', message: 'Could not read that.' } };
    const room = await this.load(instanceId);
    const now = this.now();
    if (!room.isMember(user.id)) room.join(user, now);
    const before = room.state.version;
    const r = (await this.soloAction(room, user, msg, now)) ?? room.handle(user.id, msg, now);
    if (!r.ok) {
      if (room.state.version !== before) {
        await this.save();
        this.broadcast();
      }
      const status = r.code === 'rate-limited' ? 429 : 409;
      return { status, body: { t: 'error', code: r.code, message: r.message } };
    }
    await this.save();
    this.broadcast();
    return { status: 200, body: { t: 'state', view: room.viewFor(user.id, now) } };
  }

  /** Durable Object alarm: trivia timer, away-grace expiry, or presence sweep. */
  async onAlarm(instanceId: string): Promise<void> {
    const room = await this.load(instanceId);
    const now = this.now();
    const live = this.liveUserIds();
    const before = room.state.version;
    room.sweep(now, (id) => live.has(id));
    room.tick(now);
    await this.save(); // may also post a finished game's scores
    if (room.state.version !== before) this.broadcast();
  }
}
