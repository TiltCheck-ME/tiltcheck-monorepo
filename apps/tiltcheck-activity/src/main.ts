// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
// TiltCheck Activity — main entry

import { initSDK, invite, type DiscordUser } from './sdk.js';
import * as relay from './relay.js';
import * as sessionView from './views/session.js';
import * as tiltView from './views/tilt.js';
import * as trustView from './views/trust.js';

const VIEWS = ['session', 'tilt', 'trust'] as const;
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
  const target = VIEWS.includes(view as View) ? view : 'session';

  document.querySelectorAll<HTMLElement>('.view').forEach((el) => {
    el.classList.toggle('active', el.id === `view-${target}`);
  });
  document.querySelectorAll<HTMLElement>('.tab').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === target);
  });
}

async function boot(): Promise<void> {
  setStatus('CONNECTING');

  const sessionShell = document.getElementById('view-session');
  if (sessionShell) {
    sessionShell.innerHTML =
      '<div class="card card--accent" data-boot-skeleton><p class="card__body">Discord wiring — we time out and fall back automatically if the iframe stalls.</p></div>';
  }

  let user: DiscordUser;
  try {
    user = await initSDK();
    setStatus('CONNECTED', true);
  } catch {
    user = { id: 'demo-0000', username: 'DEMO DEGEN', channelId: null };
    setStatus('DEMO MODE');
  }

  // Connect hub relay
  relay.connect(user.id, user.channelId ?? 'demo-channel');
  relay.on('connected', (connected) => {
    setStatus(connected ? 'LIVE' : 'RECONNECTING', connected as boolean);
  });

  // Mount views
  const sessionEl = document.getElementById('view-session');
  const tiltEl = document.getElementById('view-tilt');
  const trustEl = document.getElementById('view-trust');
  if (!sessionEl || !tiltEl || !trustEl) {
    throw new Error('TiltCheck Activity shell DOM is missing expected #view-* roots');
  }

  sessionView.mount(sessionEl, user.id, user.channelId ?? 'demo-channel');
  tiltView.mount(tiltEl, relay);
  trustView.mount(trustEl);

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
  console.error('[TiltCheck] Fatal:', err);
  setStatus('ERROR');
});
