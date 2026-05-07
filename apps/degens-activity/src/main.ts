// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
// Degens Activity — main entry

import { initSDK, invite, type DiscordUser } from './sdk.js';
import * as relay from './relay.js';
import * as lobbyView from './views/lobby.js';
import * as dadView from './views/dad.js';
import * as triviaView from './views/trivia.js';
import * as jackpotView from './views/jackpot.js';

const VIEWS = ['lobby', 'dad', 'trivia', 'jackpot'] as const;
type View = (typeof VIEWS)[number];

const statusEl = document.getElementById('status');

function setStatus(msg: string, live = false): void {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = msg;
  statusEl.classList.toggle('live', live);
}

function switchView(view: string): void {
  const target = VIEWS.includes(view as View) ? view : 'lobby';

  document.querySelectorAll<HTMLElement>('.view').forEach((el) => {
    el.classList.toggle('active', el.id === `view-${target}`);
  });
  document.querySelectorAll<HTMLElement>('.tab').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === target);
  });
}

async function boot(): Promise<void> {
  setStatus('CONNECTING');

  const lobbySkeleton = document.getElementById('view-lobby');
  if (lobbySkeleton) {
    lobbySkeleton.innerHTML =
      '<div class="card card--accent" data-boot-skeleton><p class="card__body">Discord wiring — if this hangs, wait a few seconds; we fall back to demo mode automatically.</p></div>';
  }

  let user: DiscordUser;
  try {
    user = await initSDK();
    setStatus('CONNECTED', true);
  } catch {
    user = { id: 'demo-0000', username: 'DEMO DEGEN', channelId: null };
    setStatus('DEMO MODE');
  }

  // Connect to game-arena
  relay.connect(user.id);
  relay.on('connected', (connected) => {
    setStatus(connected ? 'LIVE' : 'RECONNECTING', connected as boolean);
  });
  relay.joinLobby();

  // Mount views
  const lobbyEl = document.getElementById('view-lobby');
  const dadEl = document.getElementById('view-dad');
  const triviaEl = document.getElementById('view-trivia');
  const jackpotEl = document.getElementById('view-jackpot');

  if (!lobbyEl || !dadEl || !triviaEl || !jackpotEl) {
    throw new Error('Degens Activity shell DOM is missing expected #view-* roots');
  }

  lobbyView.mount(lobbyEl, switchView, user.username);
  dadView.mount(dadEl, user.id);
  triviaView.mount(triviaEl, user.id);
  jackpotView.mount(jackpotEl, user.id);

  // Tab navigation
  document.querySelectorAll<HTMLElement>('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      if (view) switchView(view);
    });
  });

  // Invite button
  document.getElementById('btn-invite')?.addEventListener('click', () => {
    invite();
  });
}

boot().catch((err) => {
  console.error('[Degens] Fatal:', err);
  setStatus('ERROR');
});
