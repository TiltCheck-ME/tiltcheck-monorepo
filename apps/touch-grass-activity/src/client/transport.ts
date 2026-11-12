// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// How the client talks to the room.
// - RemoteTransport: WebSocket to the worker Durable Object, polling fallback over HTTP.
// - LocalTransport: guest/dev mode. Runs the same Room logic in the browser with optional bots.

import { Room, createRoomState } from '../shared/room.js';
import { makeRng } from '../shared/rng.js';
import type { ClientAction, RoomUser, RoomView, ServerMessage } from '../shared/protocol.js';

export type LinkStatus = 'connecting' | 'live' | 'polling' | 'offline';

export interface Transport {
  send(action: ClientAction): void;
  onState(cb: (view: RoomView) => void): void;
  onError(cb: (code: string, message: string) => void): void;
  onStatus(cb: (s: LinkStatus) => void): void;
  close(): void;
}

class Emitter {
  stateCbs: Array<(v: RoomView) => void> = [];
  errorCbs: Array<(c: string, m: string) => void> = [];
  statusCbs: Array<(s: LinkStatus) => void> = [];
  onState(cb: (v: RoomView) => void): void {
    this.stateCbs.push(cb);
  }
  onError(cb: (c: string, m: string) => void): void {
    this.errorCbs.push(cb);
  }
  onStatus(cb: (s: LinkStatus) => void): void {
    this.statusCbs.push(cb);
  }
  protected emitState(v: RoomView): void {
    this.stateCbs.forEach((cb) => cb(v));
  }
  protected emitError(c: string, m: string): void {
    this.errorCbs.forEach((cb) => cb(c, m));
  }
  protected emitStatus(s: LinkStatus): void {
    this.statusCbs.forEach((cb) => cb(s));
  }
}

const POLL_MS = 2_500;
const PING_MS = 25_000;

export class RemoteTransport extends Emitter implements Transport {
  private ws: WebSocket | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private retry = 0;
  private closed = false;

  constructor(
    private readonly instanceId: string,
    private readonly token: string,
    private readonly base = '/api',
  ) {
    super();
    queueMicrotask(() => this.connect());
  }

  private roomPath(op: string): string {
    return `${this.base}/room/${encodeURIComponent(this.instanceId)}/${op}`;
  }

  private connect(): void {
    if (this.closed) return;
    this.emitStatus(this.pollTimer ? 'polling' : 'connecting');
    let ws: WebSocket;
    try {
      const url = new URL(this.roomPath('ws'), location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(url.toString());
    } catch {
      this.fallBackToPolling();
      return;
    }
    this.ws = ws;
    let opened = false;
    ws.onopen = () => {
      opened = true;
      this.retry = 0;
      ws.send(JSON.stringify({ t: 'auth', token: this.token }));
      this.stopPolling();
      this.emitStatus('live');
      this.pingTimer = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('{"t":"ping"}'), PING_MS);
    };
    ws.onmessage = (ev) => this.handle(typeof ev.data === 'string' ? ev.data : '');
    ws.onclose = () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.ws = null;
      if (this.closed) return;
      this.fallBackToPolling();
      // Keep trying to get the live link back, with backoff.
      const delay = Math.min(30_000, 1_000 * 2 ** this.retry++);
      setTimeout(() => this.connect(), opened ? 1_000 : delay);
    };
  }

  private handle(raw: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    if (msg.t === 'state') {
      this.emitState(msg.view);
    } else if (msg.t === 'error') this.emitError(msg.code, msg.message);
  }

  private fallBackToPolling(): void {
    if (this.pollTimer || this.closed) return;
    this.emitStatus('polling');
    const poll = async () => {
      try {
        const res = await fetch(this.roomPath('state'), { headers: { Authorization: `Bearer ${this.token}` } });
        this.handle(await res.text());
      } catch {
        this.emitStatus('offline');
      }
    };
    void poll();
    this.pollTimer = setInterval(poll, POLL_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  send(action: ClientAction): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(action));
      return;
    }
    void fetch(this.roomPath('action'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    })
      .then((r) => r.text())
      .then((t) => this.handle(t))
      .catch(() => this.emitStatus('offline'));
  }

  close(): void {
    this.closed = true;
    this.stopPolling();
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
  }
}

const BOT_NAMES = ['Bot Chad', 'Bot Becky', 'Bot Tilted Tim', 'Bot Copium Carl', 'Bot Variance Val', 'Bot Max Bet Mo', 'Bot Snooze'];

/** Guest/dev mode: the full room in the browser. Bots play instantly so DA&D can be tested solo. */
export class LocalTransport extends Emitter implements Transport {
  readonly room: Room;
  private bots: RoomUser[] = [];
  private timer: ReturnType<typeof setInterval>;
  private botTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly me: RoomUser,
    instanceId: string,
  ) {
    super();
    this.room = new Room(createRoomState(instanceId), makeRng());
    this.room.limiter.take = () => true;
    this.room.join(me, Date.now());
    this.timer = setInterval(() => {
      if (this.room.tick(Date.now())) this.push();
    }, 500);
    queueMicrotask(() => {
      this.emitStatus('live');
      this.push();
    });
  }

  private push(): void {
    this.emitState(this.room.viewFor(this.me.id, Date.now()));
    this.scheduleBots();
  }

  send(action: ClientAction): void {
    const r = this.room.handle(this.me.id, action, Date.now());
    if (!r.ok) this.emitError(r.code, r.message);
    this.push();
  }

  addBot(): void {
    const name = BOT_NAMES[this.bots.length % BOT_NAMES.length] ?? 'Bot';
    const bot: RoomUser = { id: `bot-${this.bots.length + 1}`, name, avatar: null };
    this.bots.push(bot);
    this.room.join(bot, Date.now());
    this.room.handle(bot.id, { t: 'dad.sit' }, Date.now());
    this.push();
  }

  removeBot(): void {
    const bot = this.bots.pop();
    if (!bot) return;
    this.room.leave(bot.id, Date.now());
    this.push();
  }

  get botCount(): number {
    return this.bots.length;
  }

  /** Bots submit and judge after a short beat so it feels like a table. */
  private scheduleBots(): void {
    if (this.botTimer) return;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      let acted = false;
      const now = Date.now();
      for (const bot of this.bots) {
        const v = this.room.viewFor(bot.id, now).dad;
        if (v.phase === 'submitting' && v.me.seated && !v.me.isJudge && !v.mySubmission && v.hand[0]) {
          const card = v.hand[Math.floor(Math.random() * v.hand.length)] ?? v.hand[0];
          acted = this.room.handle(bot.id, { t: 'dad.submit', cardId: card.id }, now).ok || acted;
        } else if (v.phase === 'judging' && v.me.isJudge && v.entries[0]) {
          const e = v.entries[Math.floor(Math.random() * v.entries.length)] ?? v.entries[0];
          acted = this.room.handle(bot.id, { t: 'dad.pick', entryId: e.entryId }, now).ok || acted;
        }
      }
      if (acted) this.push();
    }, 900);
  }

  close(): void {
    clearInterval(this.timer);
    if (this.botTimer) clearTimeout(this.botTimer);
  }
}
