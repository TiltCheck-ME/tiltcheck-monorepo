// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
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
import { dailyShare, renderDaily } from './views/daily.js';
import { mythSecondsLeft, renderMyth } from './views/myth.js';
import { inviteButton, openInvite, setInviteSdk } from './views/invite.js';
import { chessClockLeft, emptyChessUi, fmtClock, needsPromotion, renderChess, type ChessUi } from './views/chess.js';
import { fmtLeft, renderHotTakes, type SocialFetch } from './views/hotTakes.js';
import { emptyStoryUi, renderStory, type StoryUi } from './views/story.js';
import { TAKE_MAX, LINE_MAX, type SocialOp } from '../shared/social.js';
import type { LookAt } from '../shared/protocol.js';

type Screen = 'lobby' | 'dad' | 'trivia' | 'bluff' | 'daily' | 'myth' | 'chess' | 'hot' | 'story';

/** Hot Takes and Story Chain aren't room screens; the room (table alerts) just hears "lobby". */
function lookAt(screen: Screen): LookAt {
  return screen === 'hot' || screen === 'story' ? 'lobby' : screen;
}

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
  /** Scores sheet open over the lobby. */
  scoresOpen: false,
  scoresAt: 0,
  scoresPostedGame: 0,
  bluffDraft: emptyDraft() as BluffDraft,
  /** game:round the draft belongs to; a new turn starts a clean draft. */
  bluffDraftKey: '',
  lastBluffGame: 0,
  /** Daily Grass letters typed into the current row (client only until Enter). */
  dailyDraft: '',
  dailyRows: -1,
  dailyAsked: '',
  /** Chess: selected square, pending promotion, armed resign. Reset whenever the position moves on. */
  chess: emptyChessUi() as ChessUi,
  chessKey: '',
  lastChessGame: 0,
  /** Hot Takes + Story Chain, fetched over HTTP (not part of the room). */
  social: null as SocialFetch | null,
  socialAt: 0,
  socialJson: '',
  socialBusy: false,
  hotDraft: '',
  story: emptyStoryUi() as StoryUi,
};

const SOCIAL_POLL_MS = 20_000;
const SOCIAL_LOBBY_STALE_MS = 60_000;

/** Fetch Hot Takes + Story Chain. Skips the re-render when nothing changed (keeps typing smooth). */
async function loadSocial(force = false, staleMs = SOCIAL_POLL_MS): Promise<void> {
  if (!transport) return;
  if (!force && Date.now() - ui.socialAt < staleMs) return;
  ui.socialAt = Date.now();
  const r = await transport.social();
  if (r.kind === 'error' && ui.social?.kind === 'ok') return;
  applySocial(r);
}

function applySocial(r: SocialFetch): void {
  const json = JSON.stringify(r.kind === 'ok' ? { ...r, error: undefined } : r);
  if (json === ui.socialJson && !(r.kind === 'ok' && r.error)) return;
  ui.socialJson = json;
  ui.social = r.kind === 'ok' && r.error ? { ...r, error: undefined } : r;
  // A story the reader had open that is gone from the archive: close the sheet.
  if (ui.story.reading && !(r.kind === 'ok' && r.view.storyArchive.some((st) => st.id === ui.story.reading))) ui.story.reading = null;
  render();
}

async function socialAct(op: SocialOp, okToast?: string): Promise<boolean> {
  if (!transport || ui.socialBusy) return false;
  ui.socialBusy = true;
  try {
    const r = await transport.socialAct(op);
    ui.socialAt = Date.now();
    if (r.kind === 'ok') applySocial(r);
    const code = r.kind === 'ok' ? r.error : r.kind === 'error' ? (r.code ?? 'fallback') : 'fallback';
    if (code) {
      toast(COPY.socialErrors[code] ?? COPY.socialErrors.fallback ?? '');
      return false;
    }
    if (okToast) toast(okToast);
    return true;
  } finally {
    ui.socialBusy = false;
  }
}

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
 * Motion bookkeeping. The whole screen is re-rendered on every state push, which would replay every
 * entrance fade. Each phase gets a key; after FX_MS the fades are switched off (.fx-done), and while
 * the key holds a negative --fx-t lets a running fade finish instead of restarting. Fades are 120 ms.
 */
const FX_MS = 400;
const fx = { key: '', at: 0 };

function phaseKey(v: RoomView | null): string {
  if (!v) return 'boot';
  if (ui.screen === 'dad') return `dad:${v.dad.phase}:${v.dad.round}`;
  if (ui.screen === 'trivia') return `trivia:${v.trivia.game}:${v.trivia.phase}:${v.trivia.number}`;
  if (ui.screen === 'bluff') return `bluff:${v.bluff.game}:${v.bluff.phase}:${v.bluff.round}`;
  if (ui.screen === 'daily') return `daily:${v.daily.me?.day ?? ''}:${v.daily.me?.rows.length ?? -1}:${v.daily.me?.status ?? ''}`;
  if (ui.screen === 'chess') return `chess:${v.chess.game}:${v.chess.phase}`;
  if (ui.screen === 'hot') return `hot:${ui.social?.kind === 'ok' ? (ui.social.view.hot.featured?.id ?? '') : ui.social?.kind ?? ''}`;
  if (ui.screen === 'story') return `story:${ui.social?.kind === 'ok' ? ui.social.view.story.id : ui.social?.kind ?? ''}`;
  if (ui.screen === 'myth') return `myth:${v.myth.run?.runId ?? ''}:${v.myth.run?.phase ?? ''}:${v.myth.run?.number ?? 0}`;
  return 'lobby';
}

function render(): void {
  const v = ui.view;
  let main: string;
  if (!v && ui.screen !== 'hot' && ui.screen !== 'story') main = `<section class="panel"><p class="muted">${esc(COPY.connecting)}</p></section>`;
  else if (!v) main = ui.screen === 'hot' ? renderHotTakes(ui.social, ui.hotDraft, Date.now()) : renderStory(ui.social, ui.story);
  else if (ui.screen === 'dad') main = renderDad(v, ui.target);
  else if (ui.screen === 'trivia') main = renderTrivia(v, ui.clockOffset, ui.scores, ui.scoresTab);
  else if (ui.screen === 'bluff') main = renderBluff(v, ui.bluffDraft, ui.clockOffset);
  else if (ui.screen === 'daily') main = renderDaily(v, ui.dailyDraft, session?.mode === 'guest', inviteButton());
  else if (ui.screen === 'myth') main = renderMyth(v, ui.clockOffset, session?.mode === 'guest');
  else if (ui.screen === 'chess') main = renderChess(v, ui.chess, ui.clockOffset);
  else if (ui.screen === 'hot') main = renderHotTakes(ui.social, ui.hotDraft, Date.now());
  else if (ui.screen === 'story') main = renderStory(ui.social, ui.story);
  else main = renderLobby(v, mergePeople(v, ui.participants), ui.scores, ui.scoresTab, ui.scoresOpen, ui.social);
  // Re-rendering replaces the inputs: keep focus and the caret on the statement being typed.
  const active = document.activeElement as HTMLInputElement | null;
  const focusDraft = active?.dataset?.draft;
  const focusSocial = active?.dataset?.sdraft;
  const caret = focusDraft !== undefined || focusSocial !== undefined ? [active?.selectionStart ?? null, active?.selectionEnd ?? null] : null;
  const now = Date.now();
  const key = phaseKey(v);
  if (key !== fx.key) {
    fx.key = key;
    fx.at = now;
  }
  const since = now - fx.at;
  const motion = since > FX_MS ? 'fx-done' : '';
  const focusSheet = ui.scoresOpen && ui.screen === 'lobby' && !app.querySelector('[data-scores-sheet]');
  app.innerHTML = `${statusBar()}<main class="screen screen--${ui.screen} ${motion}" style="--fx-t:-${since}ms">${main}</main>${
    ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : ''
  }`;
  if (focusSheet) app.querySelector<HTMLElement>('[data-scores-sheet] [data-scores-close].btn')?.focus();
  if (focusSocial !== undefined) {
    const el = app.querySelector<HTMLTextAreaElement>(`[data-sdraft="${focusSocial}"]`);
    if (el && !el.disabled) {
      el.focus();
      if (caret && typeof caret[0] === 'number') el.setSelectionRange(caret[0], caret[1] ?? caret[0]);
    }
  }
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
  if (ui.screen === 'hot' && ui.social?.kind === 'ok') {
    const f = ui.social.view.hot.featured;
    const el = app.querySelector('[data-hot-left]');
    if (f) {
      const left = f.endsAt - Date.now();
      if (el) el.textContent = COPY.hot.nextIn(fmtLeft(Math.max(0, left)));
      // The slot turned: pull the new take (once a second at most, via loadSocial's own spacing).
      if (left <= 0) void loadSocial(false, 5_000);
    }
  }
  const v = ui.view;
  if (!v) return;
  if (ui.screen === 'chess') {
    for (const side of ['w', 'b'] as const) {
      const left = chessClockLeft(v, side, ui.clockOffset);
      const el = app.querySelector(`[data-chess-clock="${side}"]`);
      if (el && left !== null) {
        el.textContent = fmtClock(left);
        el.classList.toggle('clock--low', left <= 30_000);
      }
    }
    return;
  }
  if (ui.screen === 'myth') {
    const left = mythSecondsLeft(v, ui.clockOffset);
    const el = app.querySelector('[data-myth-clock]');
    if (el && left !== null) {
      el.textContent = String(left);
      el.classList.toggle('clock--low', left <= 3);
    }
    return;
  }
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

/** Load today's Daily Grass board once per Chicago day (the server makes it on first open). */
function askDaily(view: RoomView | null): void {
  if (!view) return;
  const have = view.daily.me && view.daily.me.day === view.daily.today;
  if (have || ui.dailyAsked === view.daily.today) return;
  ui.dailyAsked = view.daily.today;
  queueMicrotask(() => send({ t: 'daily.open' }));
}

function dailyKey(k: string): void {
  const me = ui.view?.daily.me;
  if (!me || me.status !== 'playing' || me.day !== ui.view?.daily.today) return;
  if (k === 'enter') {
    if (ui.dailyDraft.length < 5) return toast(COPY.daily.tooShort);
    send({ t: 'daily.guess', word: ui.dailyDraft });
    return;
  }
  if (k === 'back') ui.dailyDraft = ui.dailyDraft.slice(0, -1);
  else if (/^[a-z]$/.test(k) && ui.dailyDraft.length < 5) ui.dailyDraft += k;
  else return;
  render();
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older webviews: fall back to a hidden textarea.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function onState(view: RoomView): void {
  // First state after (re)joining: tell the room which screen is open (feeds table alerts only).
  if (!lookSent) {
    lookSent = true;
    queueMicrotask(() => send({ t: 'look', at: lookAt(ui.screen) }));
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
  // A chess game started by anyone pulls its two players to the board.
  if (view.chess.game !== ui.lastChessGame && view.chess.phase === 'playing') {
    if (view.chess.me.color && ui.screen !== 'chess') {
      ui.screen = 'chess';
      send({ t: 'look', at: 'chess' });
    }
    ui.lastChessGame = view.chess.game;
  }
  // The position moved on: drop any selection, pending promotion or armed resign.
  const chessKey = `${view.chess.game}:${view.chess.phase}:${view.chess.ply}`;
  if (chessKey !== ui.chessKey) {
    ui.chessKey = chessKey;
    ui.chess = emptyChessUi();
  }
  // New turn as teller: start from a clean draft.
  const key = view.bluff.phase === 'writing' ? `${view.bluff.game}:${view.bluff.round}` : '';
  if (key && key !== ui.bluffDraftKey) {
    ui.bluffDraftKey = key;
    ui.bluffDraft = emptyDraft();
  }
  // Daily Grass: a new row came back from the server, so the typed draft is spent.
  const rows = view.daily.me?.rows.length ?? -1;
  if (rows !== ui.dailyRows) {
    if (rows > ui.dailyRows) ui.dailyDraft = '';
    ui.dailyRows = rows;
  }
  // On the Daily screen with no board for today yet (first visit, or the day turned): ask once per day.
  if (ui.screen === 'daily') askDaily(view);
  // A finished game just landed on the board: pull the fresh board.
  if (view.trivia.highScores === 'posted' && view.trivia.game !== ui.scoresPostedGame) {
    ui.scoresPostedGame = view.trivia.game;
    void loadScores(true);
  }
  render();
}

app.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('button, [data-go], [data-scores-close], [data-story-close]');
  if (!el || (el as HTMLButtonElement).disabled) return;
  const d = el.dataset;
  if (el.hasAttribute('data-reload')) {
    location.reload();
    return;
  }
  if (d.go) {
    ui.screen = d.go as Screen;
    ui.scoresOpen = false;
    ui.story.reading = null;
    ui.story.endArmed = false;
    send({ t: 'look', at: lookAt(ui.screen) });
    if (ui.screen === 'daily') askDaily(ui.view);
    render();
    void loadScores();
    if (ui.screen === 'hot' || ui.screen === 'story') void loadSocial(true);
    else if (ui.screen === 'lobby') void loadSocial(false, SOCIAL_LOBBY_STALE_MS);
    return;
  }
  // Hot Takes and Story Chain.
  if (!el.hasAttribute('data-mod-end') && ui.story.endArmed) {
    ui.story.endArmed = false;
    render();
  }
  if (d.hotVote && d.poll) return void socialAct({ op: 'hot.vote', pollId: d.poll, vote: d.hotVote === 'agree' ? 'agree' : 'disagree' });
  if (el.hasAttribute('data-hot-submit')) {
    const text = ui.hotDraft;
    void socialAct({ op: 'hot.submit', text }, COPY.hot.submitted).then((ok) => {
      if (ok) {
        ui.hotDraft = '';
        render();
      }
    });
    return;
  }
  if (el.hasAttribute('data-story-add') && d.storyId) {
    const text = ui.story.draft;
    void socialAct({ op: 'story.add', storyId: d.storyId, text }).then((ok) => {
      if (ok) {
        ui.story.draft = '';
        render();
      }
    });
    return;
  }
  if (el.hasAttribute('data-story-all')) {
    ui.story.showAll = !ui.story.showAll;
    render();
    return;
  }
  if (d.storyRead) {
    ui.story.reading = d.storyRead;
    render();
    app.querySelector<HTMLElement>('[data-story-sheet] .btn[data-story-close]')?.focus();
    return;
  }
  if (el.hasAttribute('data-story-close')) {
    closeStorySheet();
    return;
  }
  if (d.modHide && (d.modKind === 'take' || d.modKind === 'line')) return void socialAct({ op: 'mod.hide', kind: d.modKind, id: d.modHide, hidden: d.modHidden === 'true' });
  if (d.modRemove && (d.modKind === 'take' || d.modKind === 'line')) return void socialAct({ op: 'mod.remove', kind: d.modKind, id: d.modRemove });
  if (d.modEnd) {
    if (!ui.story.endArmed) {
      ui.story.endArmed = true;
      render();
      return;
    }
    ui.story.endArmed = false;
    return void socialAct({ op: 'mod.endStory', storyId: d.modEnd });
  }
  if (el.hasAttribute('data-scores-open')) {
    ui.scoresOpen = true;
    render();
    void loadScores();
    return;
  }
  if (el.hasAttribute('data-scores-close')) {
    closeScores();
    return;
  }
  if (el.hasAttribute('data-invite')) {
    void openInvite(toast);
    return;
  }
  if (d.dgKey) return dailyKey(d.dgKey);
  if (el.hasAttribute('data-dg-share') && ui.view) {
    const text = dailyShare(ui.view);
    if (text) void copyText(text).then((ok) => toast(ok ? COPY.daily.copied : COPY.daily.copyFailed));
    return;
  }
  if (!el.hasAttribute('data-chess-resign') && ui.chess.resignArmed) {
    ui.chess.resignArmed = false;
    render();
  }
  if (d.sq !== undefined) return chessTap(Number(d.sq));
  if (d.chessPromo && ui.chess.promo && ui.view) {
    const { from, to } = ui.chess.promo;
    send({ t: 'chess.move', ply: ui.view.chess.ply, from, to, promotion: d.chessPromo as 'q' | 'r' | 'b' | 'n' });
    ui.chess = emptyChessUi();
    render();
    return;
  }
  if (d.chessClaim) return send({ t: 'chess.claim', color: d.chessClaim === 'b' ? 'b' : 'w' });
  if (d.chessClockset !== undefined) return send({ t: 'chess.clock', minutes: Number(d.chessClockset) });
  if (el.hasAttribute('data-chess-resign')) {
    if (!ui.chess.resignArmed) {
      ui.chess.resignArmed = true;
      render();
      return;
    }
    ui.chess.resignArmed = false;
    return send({ t: 'chess.resign' });
  }
  if (d.mrid && d.mcid && d.mpick) return send({ t: 'myth.answer', rid: d.mrid, cid: d.mcid, pick: d.mpick === 'true' });
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

/** Tap a square: pick up one of your pieces, put it on a lit square, or let go. */
function chessTap(sq: number): void {
  const v = ui.view;
  if (!v) return;
  const ch = v.chess;
  if (ch.phase !== 'playing' || ch.me.color !== ch.turn) return;
  const sel = ui.chess.sel;
  if (sel !== null && (ch.me.legal[sel] ?? []).includes(sq)) {
    if (needsPromotion(v, sel, sq)) {
      ui.chess.promo = { from: sel, to: sq };
      render();
      return;
    }
    send({ t: 'chess.move', ply: ch.ply, from: sel, to: sq });
    ui.chess = emptyChessUi();
    ui.chess.sel = null;
    render();
    return;
  }
  ui.chess.promo = null;
  ui.chess.sel = ch.me.legal[sq]?.length && sel !== sq ? sq : null;
  render();
}

/** Close the Read it back sheet and hand focus back to the list. */
function closeStorySheet(): void {
  if (!ui.story.reading) return;
  const id = ui.story.reading;
  ui.story.reading = null;
  render();
  app.querySelector<HTMLElement>(`[data-story-read="${CSS.escape(id)}"]`)?.focus();
}

/** Close the Scores sheet and hand focus back to the Scores button. */
function closeScores(): void {
  if (!ui.scoresOpen) return;
  ui.scoresOpen = false;
  render();
  app.querySelector<HTMLElement>('[data-scores-open]')?.focus();
}

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && ui.scoresOpen) {
    ev.preventDefault();
    closeScores();
  }
  if (ev.key === 'Escape' && ui.story.reading) {
    ev.preventDefault();
    closeStorySheet();
  }
});

// Physical keyboard for Daily Grass (desktop Discord), never while typing in a field.
document.addEventListener('keydown', (ev) => {
  if (ui.screen !== 'daily' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if ((ev.target as HTMLElement | null)?.closest?.('input, textarea, select')) return;
  const k = ev.key === 'Enter' ? 'enter' : ev.key === 'Backspace' ? 'back' : ev.key.length === 1 ? ev.key.toLowerCase() : '';
  if (!k) return;
  // Enter on a focused button should press that button, not submit the row.
  if (k === 'enter' && (ev.target as HTMLElement | null)?.closest?.('button')) return;
  if (k === 'enter' || k === 'back' || /^[a-z]$/.test(k)) {
    ev.preventDefault();
    dailyKey(k);
  }
});

app.addEventListener('input', (ev) => {
  const el = ev.target as HTMLInputElement;
  const sd = el.dataset?.sdraft;
  if (sd === 'hot' || sd === 'story') {
    // Update the draft, counter and button in place: no re-render while typing.
    if (sd === 'hot') ui.hotDraft = el.value;
    else ui.story.draft = el.value;
    const max = sd === 'hot' ? TAKE_MAX : LINE_MAX;
    const counter = app.querySelector(`[data-count-for="${sd}"]`);
    if (counter) counter.textContent = `${[...el.value].length}/${max}`;
    const btn = app.querySelector<HTMLButtonElement>(sd === 'hot' ? '[data-hot-submit]' : '[data-story-add]');
    if (btn) btn.disabled = !el.value.trim() || (sd === 'hot' && ui.social?.kind === 'ok' && ui.social.view.hot.submitsLeft === 0);
    return;
  }
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
  queueMicrotask(() => void loadSocial(true));
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
      setInviteSdk(session.sdk);
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
  // Hot Takes / Story Chain have no socket: poll while one of them is open.
  setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    if (ui.screen === 'hot' || ui.screen === 'story') void loadSocial();
  }, SOCIAL_POLL_MS);
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
