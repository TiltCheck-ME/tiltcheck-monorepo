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
import { DEFAULT_TARGET } from '../shared/dad.js';
import type { ClientAction, RoomView } from '../shared/protocol.js';
import { esc } from './views/util.js';
import type { ScoresResult, ScoresTab } from './views/highScores.js';

type Screen = 'lobby' | 'dad' | 'trivia';

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

function render(): void {
  const v = ui.view;
  let main: string;
  if (!v) main = `<section class="panel"><p class="muted">${esc(COPY.connecting)}</p></section>`;
  else if (ui.screen === 'dad') main = renderDad(v, ui.target);
  else if (ui.screen === 'trivia') main = renderTrivia(v, ui.clockOffset, ui.scores, ui.scoresTab);
  else main = renderLobby(v, mergePeople(v, ui.participants), ui.scores, ui.scoresTab);
  app.innerHTML = `${statusBar()}<main class="screen screen--${ui.screen}">${main}</main>${
    ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : ''
  }`;
}

/** Only the trivia countdown digits change every tick; avoid re-rendering the whole screen. */
function tickClock(): void {
  const v = ui.view;
  if (!v || ui.screen !== 'trivia' || v.trivia.phase !== 'question') return;
  const el = app.querySelector('[data-trivia-clock]');
  if (el) el.textContent = String(secondsLeft(v.trivia.endsAt, ui.clockOffset));
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
  if (d.act === 'dad.start') return send({ t: 'dad.start', target: ui.target });
  if (d.act) return send({ t: d.act } as ClientAction);
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
      wire(new RemoteTransport(session.instanceId, session.token, '/api', session.guildId));
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
