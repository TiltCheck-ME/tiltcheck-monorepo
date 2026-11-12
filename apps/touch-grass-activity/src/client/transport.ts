// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// How the client talks to the room.
// - RemoteTransport: WebSocket to the worker Durable Object, polling fallback over HTTP.
// - LocalTransport: guest/dev mode. Runs the same Room logic in the browser with optional bots.

import { Room, createRoomState } from '../shared/room.js';
import { makeRng } from '../shared/rng.js';
import type { ClientAction, RoomUser, RoomView, ServerMessage } from '../shared/protocol.js';
import { ScoreBook, memoryBookStorage, type BoardView } from '../shared/scores.js';
import type { ScoresResult } from './views/highScores.js';

export type LinkStatus = 'connecting' | 'live' | 'polling' | 'offline';

export interface Transport {
  send(action: ClientAction): void;
  onState(cb: (view: RoomView) => void): void;
  onError(cb: (code: string, message: string) => void): void;
  onStatus(cb: (s: LinkStatus) => void): void;
  /** App came back to the foreground (visibilitychange / pageshow / focus): get the live link back now. */
  resume(): void;
  /** This server's trivia high scores (read only). */
  highScores(): Promise<ScoresResult>;
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
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private retry = 0;
  private closed = false;

  constructor(
    private readonly instanceId: string,
    private readonly token: string,
    private readonly base = '/api',
    private readonly guildId: string | null = null,
  ) {
    super();
    queueMicrotask(() => this.connect());
  }

  async highScores(): Promise<ScoresResult> {
    if (!this.guildId) return { kind: 'no-server' };
    try {
      const res = await fetch(`${this.base}/trivia/scores?guild=${encodeURIComponent(this.guildId)}`, { headers: { Authorization: `Bearer ${this.token}` } });
      if (!res.ok) return { kind: 'error' };
      const board = (await res.json()) as BoardView;
      return board && board.ok ? { kind: 'board', board } : { kind: 'error' };
    } catch {
      return { kind: 'error' };
    }
  }

  private roomPath(op: string): string {
    const q = this.guildId ? `?guild=${encodeURIComponent(this.guildId)}` : '';
    return `${this.base}/room/${encodeURIComponent(this.instanceId)}/${op}${q}`;
  }

  private connect(): void {
    if (this.closed) return;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    // Already connected or connecting: nothing to do.
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.emitStatus(this.pollTimer ? 'polling' : 'connecting');
    let ws: WebSocket;
    try {
      const url = new URL(this.roomPath('ws'), location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(url.toString());
    } catch {
      this.fallBackToPolling();
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.retry = 0;
      ws.send(JSON.stringify({ t: 'auth', token: this.token }));
      this.stopPolling();
      this.emitStatus('live');
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('{"t":"ping"}'), PING_MS);
    };
    ws.onmessage = (ev) => {
      this.clearWatchdog();
      this.handle(typeof ev.data === 'string' ? ev.data : '');
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      this.clearWatchdog();
      this.ws = null;
      if (this.closed) return;
      this.fallBackToPolling();
      this.scheduleReconnect();
    };
  }

  /** Backoff 1s, 2s, 4s ... capped at 15s. The server holds your seat for 3 minutes meanwhile. */
  private scheduleReconnect(): void {
    if (this.closed || this.retryTimer) return;
    const delay = Math.min(15_000, 1_000 * 2 ** this.retry++);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  private clearWatchdog(): void {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  resume(): void {
    if (this.closed) return;
    this.retry = 0;
    const ws = this.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      // iOS can hand back a socket that looks open but died while suspended. Ping it; if nothing
      // comes back quickly, drop it and reconnect.
      try {
        ws.send('{"t":"ping"}');
      } catch {
        /* handled by the watchdog */
      }
      this.clearWatchdog();
      this.watchdog = setTimeout(() => {
        if (this.ws === ws) {
          this.ws = null;
          try {
            ws.close();
          } catch {
            /* ignore */
          }
          this.fallBackToPolling();
          this.connect();
        }
      }, 3_000);
      return;
    }
    if (ws && ws.readyState === WebSocket.CONNECTING) return;
    this.ws = null;
    this.connect();
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
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.clearWatchdog();
    this.ws?.close();
  }
}

/** Guest-mode bots need something to say when it is their turn to tell. */
const BOT_LINES: ReadonlyArray<readonly [string, string, string]> = [
  ['I have never seen the ocean.', 'I can name every planet backwards.', 'I once slept through a fire alarm.'],
  ['I own four identical hoodies.', 'I was on local TV as a kid.', 'I have never lost at checkers.'],
  ['I hate pizza.', 'I broke my wrist falling off a couch.', 'I can whistle with two fingers.'],
];

const BOT_NAMES = ['Bot Chad', 'Bot Becky', 'Bot Tilted Tim', 'Bot Copium Carl', 'Bot Variance Val', 'Bot Max Bet Mo', 'Bot Snooze'];

/** Guest/dev mode: the full room in the browser. Bots play so DA&D and trivia can be tested solo. */
export class LocalTransport extends Emitter implements Transport {
  readonly room: Room;
  private bots: RoomUser[] = [];
  private timer: ReturnType<typeof setInterval>;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  /** Guest mode keeps a board in this tab so the high-score UI can be tried without Discord. */
  private readonly book = new ScoreBook(memoryBookStorage());
  private posting = false;

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

  resume(): void {
    this.push();
  }

  private push(): void {
    this.emitState(this.room.viewFor(this.me.id, Date.now()));
    this.scheduleBots();
    void this.postScores();
  }

  /** Same rule as the server: only a game the room ran to the end, with the room's own scores. */
  private async postScores(): Promise<void> {
    const pending = this.room.pendingHighScores();
    if (!pending || this.posting) return;
    this.posting = true;
    try {
      const brags = await this.book.record(pending.results, Date.now());
      this.room.applyHighScores(pending.game, brags);
    } finally {
      this.posting = false;
    }
    this.push();
  }

  async highScores(): Promise<ScoresResult> {
    return { kind: 'board', board: await this.book.view('guest', this.me.id, Date.now()), guest: true };
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
    this.room.handle(bot.id, { t: 'bluff.sit' }, Date.now());
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
        const bv = this.room.viewFor(bot.id, now).bluff;
        if (bv.phase === 'writing' && bv.me.isTeller) {
          const lines = BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)] ?? BOT_LINES[0]!;
          acted = this.room.handle(bot.id, { t: 'bluff.tell', statements: [...lines] as [string, string, string], lie: Math.floor(Math.random() * 3) }, now).ok || acted;
        } else if (bv.phase === 'guessing' && bv.me.seated && !bv.me.isTeller && bv.me.guess === null && bv.rid && Math.random() < 0.7) {
          acted = this.room.handle(bot.id, { t: 'bluff.guess', rid: bv.rid, pick: Math.floor(Math.random() * 3) }, now).ok || acted;
        }
        const tv = this.room.viewFor(bot.id, now).trivia;
        if (tv.phase === 'question' && tv.question && tv.me.playing && tv.me.answered === null && Math.random() < 0.6) {
          const choice = Math.floor(Math.random() * tv.question.choices.length);
          acted = this.room.handle(bot.id, { t: 'trivia.answer', qid: tv.question.id, choice }, now).ok || acted;
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
