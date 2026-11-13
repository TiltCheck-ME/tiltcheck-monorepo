// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Touch Grass Activity entry. Inside Discord: SDK handshake, then the worker room.
// Plain browser (no frame_id): guest mode with a fake user and an in-browser room.

import './styles.css';
import { COPY } from './copy.js';
import { isInsideDiscord, startDiscord, startGuest, type Participant, type Session } from './discord.js';
import { LocalTransport, RemoteTransport, type LinkStatus, type Transport } from './transport.js';
import { mergePeople, renderLobby } from './views/lobby.js';
import { renderDad } from './views/dad.js';
import { renderTrivia, secondsLeft } from './views/trivia.js';
import { bluffSecondsLeft, emptyDraft, renderBluff, type BluffDraft } from './views/bluff.js';
import { DEFAULT_TARGET } from '../shared/dad.js';
import type { ClientAction, RoomView } from '../shared/protocol.js';
import { esc, failedAvatars } from './views/util.js';
import type { ScoresResult, ScoresTab } from './views/highScores.js';

type Screen = 'lobby' | 'dad' | 'trivia' | 'bluff';

const app = document.getElementById('app') as HTMLElement;

const ui = {
  screen: 'lobby' as Screen,
  view: null as RoomView | null,
  participants: [] as Participant[],
  status: 'connecting' as LinkStatus,
  toast: '' as string,
  toastTimer: 0 as number | ReturnType<typeof setTimeout>,
  clockOffset: 0,
  target: DEFAULT_TARGET,
  lastTriviaGame: 0,
  scores: null as ScoresResult | null,
  scoresTab: 'week' as ScoresTab,
  scoresAt: 0,
  scoresPostedGame: 0,
  bluffDraft: emptyDraft() as BluffDraft,
  /** game:round the draft belongs to; a new turn starts a clean draft. */
  bluffDraftKey: '',
  lastBluffGame: 0,
};

const SCORES_STALE_MS = 20_000;

/** Fetch the board: on boot, on the way back to the lobby (if stale), and after a game is posted. */
async function loadScores(force = false): Promise<void> {
  if (!transport) return;
  if (!force && Date.now() - ui.scoresAt < SCORES_STALE_MS) return;
  ui.scoresAt = Date.now();
  const r = await transport.highScores();
  // Keep showing the last good board if a refresh fails.
  if (r.kind === 'error' && ui.scores?.kind === 'board') return;
  ui.scores = r;
  render();
}

let session: Session | null = null;
let transport: Transport | null = null;

function toast(msg: string): void {
  ui.toast = msg;
  clearTimeout(ui.toastTimer as ReturnType<typeof setTimeout>);
  ui.toastTimer = setTimeout(() => {
    ui.toast = '';
    render();
  }, 2600);
  render();
}

function send(a: ClientAction): void {
  transport?.send(a);
}

function statusBar(): string {
  const bits: string[] = [];
  if (session?.mode === 'guest') {
    const local = transport instanceof LocalTransport;
    bits.push(`<div class="guest">${esc(COPY.guestBanner)}${
      local ? ` <button class="btn btn--sm btn--ghost" data-bot="add">+ bot</button><button class="btn btn--sm btn--ghost" data-bot="remove">- bot</button>` : ''
    }</div>`);
  }
  if (ui.status === 'polling') bits.push(`<div class="link">${esc(COPY.polling)}</div>`);
  if (ui.status === 'offline') bits.push(`<div class="link link--bad">${esc(COPY.offline)}</div>`);
  return bits.join('');
}

/**
 * Motion bookkeeping. The whole screen is re-rendered on every state push, which would restart every
 * entrance animation. Instead each phase gets a key; while the key holds, the screen carries a negative
 * --fx-t so a running animation resumes where it was, and after FX_MS the animations are switched off.
 */
const FX_MS = 2200;
const POP_MS = 900;
const fx = { key: '', at: 0 };
const pts = new Map<string, number>();
const popAt = new Map<string, number>();

function phaseKey(v: RoomView | null): string {
  if (!v) return 'boot';
  if (ui.screen === 'dad') return `dad:${v.dad.phase}:${v.dad.round}`;
  if (ui.screen === 'trivia') return `trivia:${v.trivia.game}:${v.trivia.phase}:${v.trivia.number}`;
  if (ui.screen === 'bluff') return `bluff:${v.bluff.game}:${v.bluff.phase}:${v.bluff.round}`;
  return 'lobby';
}

/** Scores that went up since the last render get a short pop (kept across re-renders until it ends). */
function popScores(now: number): void {
  for (const el of app.querySelectorAll<HTMLElement>('[data-pts]')) {
    const key = `${ui.screen}:${el.dataset.pts}`;
    const val = Number(el.textContent);
    const prev = pts.get(key);
    pts.set(key, val);
    if (prev !== undefined && val > prev) popAt.set(key, now);
    const at = popAt.get(key);
    if (at !== undefined && now - at < POP_MS) {
      el.classList.add('pop');
      el.style.animationDelay = `-${now - at}ms`;
    }
  }
}

function render(): void {
  const v = ui.view;
  let main: string;
  if (!v) main = `<section class="panel"><p class="muted">${esc(COPY.connecting)}</p></section>`;
  else if (ui.screen === 'dad') main = renderDad(v, ui.target);
  else if (ui.screen === 'trivia') main = renderTrivia(v, ui.clockOffset, ui.scores, ui.scoresTab);
  else if (ui.screen === 'bluff') main = renderBluff(v, ui.bluffDraft, ui.clockOffset);
  else main = renderLobby(v, mergePeople(v, ui.participants), ui.scores, ui.scoresTab);
  // Re-rendering replaces the inputs: keep focus and the caret on the statement being typed.
  const active = document.activeElement as HTMLInputElement | null;
  const focusDraft = active?.dataset?.draft;
  const caret = focusDraft !== undefined ? [active?.selectionStart ?? null, active?.selectionEnd ?? null] : null;
  const now = Date.now();
  const key = phaseKey(v);
  if (key !== fx.key) {
    fx.key = key;
    fx.at = now;
  }
  const since = now - fx.at;
  const motion = since > FX_MS ? 'fx-done' : '';
  app.innerHTML = `${statusBar()}<main class="screen screen--${ui.screen} ${motion}" style="--fx-t:-${since}ms;--pulse-t:-${now % 1600}ms">${main}</main>${
    ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : ''
  }`;
  popScores(now);
  if (focusDraft !== undefined) {
    const el = app.querySelector<HTMLInputElement>(`[data-draft="${focusDraft}"]`);
    if (el) {
      el.focus();
      if (caret && typeof caret[0] === 'number') el.setSelectionRange(caret[0], caret[1] ?? caret[0]);
    }
  }
}

/** Enable "Lock it in" without a full re-render while the teller types. */
function syncTellButton(): void {
  const btn = app.querySelector<HTMLButtonElement>('[data-act="bluff.tell"]');
  if (btn) btn.disabled = !(ui.bluffDraft.lie !== null && ui.bluffDraft.statements.every((x) => x.trim().length > 0));
}

/** Only the trivia countdown digits change every tick; avoid re-rendering the whole screen. */
function tickClock(): void {
  const v = ui.view;
  if (!v) return;
  if (ui.screen === 'bluff') {
    const left = bluffSecondsLeft(v, ui.clockOffset);
    const el = app.querySelector('[data-bluff-clock]');
    if (el && left !== null) {
      el.textContent = String(left);
      el.classList.toggle('clock--low', left <= 10);
    }
    return;
  }
  if (ui.screen !== 'trivia' || v.trivia.phase !== 'question') return;
  const el = app.querySelector('[data-trivia-clock]');
  if (el) {
    const left = secondsLeft(v.trivia.endsAt, ui.clockOffset);
    el.textContent = String(left);
    el.classList.toggle('clock--low', left <= 5);
  }
}

let lookSent = false;

function onState(view: RoomView): void {
  // First state after (re)joining: tell the room which screen is open (feeds table alerts only).
  if (!lookSent) {
    lookSent = true;
    queueMicrotask(() => send({ t: 'look', at: ui.screen }));
  }
  ui.view = view;
  ui.clockOffset = view.serverNow - Date.now();
  // A trivia game started by anyone pulls everyone who is on the board to the questions.
  if (view.trivia.game !== ui.lastTriviaGame && (view.trivia.phase === 'question' || view.trivia.phase === 'reveal')) {
    if (view.trivia.me.playing && ui.screen !== 'trivia') {
      ui.screen = 'trivia';
      send({ t: 'look', at: 'trivia' });
    }
    ui.lastTriviaGame = view.trivia.game;
  }
  // A Bluff game started by anyone pulls the seated players to the table.
  if (view.bluff.game !== ui.lastBluffGame && view.bluff.phase === 'writing') {
    if (view.bluff.me.seated && ui.screen !== 'bluff') {
      ui.screen = 'bluff';
      send({ t: 'look', at: 'bluff' });
    }
    ui.lastBluffGame = view.bluff.game;
  }
  // New turn as teller: start from a clean draft.
  const key = view.bluff.phase === 'writing' ? `${view.bluff.game}:${view.bluff.round}` : '';
  if (key && key !== ui.bluffDraftKey) {
    ui.bluffDraftKey = key;
    ui.bluffDraft = emptyDraft();
  }
  // A finished game just landed on the board: pull the fresh board.
  if (view.trivia.highScores === 'posted' && view.trivia.game !== ui.scoresPostedGame) {
    ui.scoresPostedGame = view.trivia.game;
    void loadScores(true);
  }
  render();
}

app.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('button, [data-go]');
  if (!el || (el as HTMLButtonElement).disabled) return;
  const d = el.dataset;
  if (el.hasAttribute('data-reload')) {
    location.reload();
    return;
  }
  if (d.go) {
    ui.screen = d.go as Screen;
    send({ t: 'look', at: ui.screen });
    render();
    void loadScores();
    return;
  }
  if (d.scoresTab) {
    ui.scoresTab = d.scoresTab === 'all' ? 'all' : 'week';
    render();
    return;
  }
  if (d.bot && transport instanceof LocalTransport) {
    if (d.bot === 'add') transport.addBot();
    else transport.removeBot();
    return;
  }
  if (d.card) return send({ t: 'dad.submit', cardId: d.card });
  if (d.entry) return send({ t: 'dad.pick', entryId: d.entry });
  if (d.qid && d.choice !== undefined) return send({ t: 'trivia.answer', qid: d.qid, choice: Number(d.choice) });
  if (d.rid !== undefined && d.pick !== undefined) return send({ t: 'bluff.guess', rid: d.rid, pick: Number(d.pick) });
  if (d.lie !== undefined) {
    ui.bluffDraft.lie = Number(d.lie);
    render();
    return;
  }
  if (d.act === 'bluff.tell') {
    const { statements, lie } = ui.bluffDraft;
    if (lie === null) return;
    return send({ t: 'bluff.tell', statements: [...statements] as [string, string, string], lie });
  }
  if (d.act === 'dad.start') return send({ t: 'dad.start', target: ui.target });
  if (d.act) return send({ t: d.act } as ClientAction);
});

// A Discord avatar that can't load: drop the broken picture so the coloured initial shows instead.
// 'error' doesn't bubble, so listen in the capture phase.
app.addEventListener(
  'error',
  (ev) => {
    const img = ev.target as HTMLImageElement | null;
    if (!img || img.tagName !== 'IMG' || !img.hasAttribute('data-avatar')) return;
    failedAvatars.add(img.getAttribute('src') ?? '');
    img.remove();
  },
  true,
);

app.addEventListener('input', (ev) => {
  const el = ev.target as HTMLInputElement;
  const i = el.dataset?.draft;
  if (i === undefined) return;
  ui.bluffDraft.statements[Number(i) as 0 | 1 | 2] = el.value;
  syncTellButton();
});

app.addEventListener('change', (ev) => {
  const el = ev.target as HTMLSelectElement;
  if (el.matches('[data-target]')) ui.target = Number(el.value) || DEFAULT_TARGET;
});

function wire(t: Transport): void {
  transport = t;
  queueMicrotask(() => void loadScores(true));
  t.onState(onState);
  t.onError((_code, message) => toast(message));
  t.onStatus((s) => {
    if (s === 'live' && ui.status !== 'live') lookSent = false;
    ui.status = s;
    render();
  });
}

async function boot(): Promise<void> {
  render();
  if (isInsideDiscord()) {
    try {
      session = await startDiscord((list) => {
        ui.participants = list;
        render();
      });
      wire(new RemoteTransport(session.roomId, session.token, '/api', session.guildId, session.instanceId));
    } catch (err) {
      app.innerHTML = `<main class="screen"><section class="panel"><h1 class="h2">Could not load the table</h1><p class="muted">${esc(
        err instanceof Error ? err.message : String(err),
      )}</p><button class="btn btn--primary" data-reload>Reload</button></section></main>`;
    }
  } else {
    session = startGuest();
    const remote = new URLSearchParams(location.search).get('remote') === '1';
    wire(remote ? new RemoteTransport(session.instanceId, session.token) : new LocalTransport(session.user, session.instanceId));
  }
  setInterval(tickClock, 250);
  // iOS suspends the Discord webview on an app switch and the socket dies. Coming back, reconnect
  // right away instead of waiting out the backoff; the server held the seat meanwhile.
  const resume = () => {
    if (document.visibilityState === 'hidden') return;
    transport?.resume();
  };
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', resume);
  window.addEventListener('focus', resume);
}

void boot();
