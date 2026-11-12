// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// RoomHost: the Durable Object's brain, with storage, sockets and auth injected so it can be
// unit tested with fakes. The DO class in room-do.ts is a thin adapter around this.

import { PRESENCE_TIMEOUT_MS, Room, createRoomState, type RoomState } from '../../src/shared/room.js';
import { makeRng, type Rng } from '../../src/shared/rng.js';
import { parseClientMessage, type RoomUser, type ServerMessage } from '../../src/shared/protocol.js';

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
}

const STORAGE_KEY = 'room';
export const MAX_MESSAGE_BYTES = 4096;

export class RoomHost {
  private room: Room | null = null;
  private readonly now: () => number;
  private readonly rng: Rng;

  constructor(private readonly deps: HostDeps) {
    this.now = deps.now ?? Date.now;
    this.rng = deps.rng ?? makeRng();
  }

  async load(instanceId: string): Promise<Room> {
    if (this.room) return this.room;
    const saved = await this.deps.storage.get<RoomState>(STORAGE_KEY);
    this.room = new Room(saved ?? createRoomState(instanceId), this.rng);
    return this.room;
  }

  private async save(): Promise<void> {
    if (!this.room) return;
    await this.deps.storage.put(STORAGE_KEY, this.room.state);
    if (!this.deps.setWake) return;
    // Wake for the break ending, and for sweeping polling-only members who went quiet.
    let wake = this.room.nextWake();
    const live = this.liveUserIds();
    if (Object.keys(this.room.state.members).some((id) => !live.has(id))) {
      const sweepAt = this.now() + PRESENCE_TIMEOUT_MS + 5_000;
      wake = wake === null ? sweepAt : Math.min(wake, sweepAt);
    }
    await this.deps.setWake(wake);
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
    if (!room.isMember(socket.user.id)) room.join(socket.user, now);
    const r = room.handle(socket.user.id, msg, now);
    if (!r.ok) {
      this.sendTo(socket, { t: 'error', code: r.code, message: r.message });
      return;
    }
    if (msg.t === 'ping') {
      this.sendTo(socket, { t: 'state', view: room.viewFor(socket.user.id, now) });
      return;
    }
    await this.save();
    this.broadcast();
  }

  /** Socket closed. Only leave the room if this user has no other live socket. */
  async onClose(instanceId: string, socket: HostSocket): Promise<void> {
    if (!socket.user) return;
    const room = await this.load(instanceId);
    const stillHere = this.deps.sockets().some((s) => s !== socket && s.user?.id === socket.user?.id);
    if (stillHere) return;
    room.leave(socket.user.id, this.now());
    await this.save();
    this.broadcast();
  }

  /** Polling fallback: GET state. The worker already verified the user. */
  async pollState(instanceId: string, user: RoomUser): Promise<{ status: number; body: ServerMessage }> {
    const room = await this.load(instanceId);
    const now = this.now();
    let changed = room.tick(now);
    if (!room.isMember(user.id)) {
      room.join(user, now);
      changed = true;
    } else room.touch(user.id, now);
    const live = this.liveUserIds();
    if (room.sweep(now, (id) => live.has(id) || id === user.id)) changed = true;
    await this.save();
    if (changed) this.broadcast();
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
    const r = room.handle(user.id, msg, now);
    if (!r.ok) {
      const status = r.code === 'rate-limited' ? 429 : 409;
      return { status, body: { t: 'error', code: r.code, message: r.message } };
    }
    await this.save();
    this.broadcast();
    return { status: 200, body: { t: 'state', view: room.viewFor(user.id, now) } };
  }

  /** Durable Object alarm: break timer ended, or presence sweep. */
  async onAlarm(instanceId: string): Promise<void> {
    const room = await this.load(instanceId);
    const now = this.now();
    const live = this.liveUserIds();
    const changed = room.tick(now) || room.sweep(now, (id) => live.has(id));
    await this.save();
    if (changed) this.broadcast();
  }
}
