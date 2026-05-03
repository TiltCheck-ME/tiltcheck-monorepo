// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// TiltCheck Activity — main entry

import { initSDK, invite, type DiscordUser } from './sdk.js';
import * as relay from './relay.js';
import * as sessionView from './views/session.js';
import * as tiltView from './views/tilt.js';
import * as trustView from './views/trust.js';

const VIEWS = ['session', 'tilt', 'trust'] as const;
type View = (typeof VIEWS)[number];

const statusEl = document.getElementById('status')!;

function setStatus(msg: string, live = false): void {
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
  sessionView.mount(document.getElementById('view-session')!, user.id, user.channelId ?? 'demo-channel');
  tiltView.mount(document.getElementById('view-tilt')!, relay);
  trustView.mount(document.getElementById('view-trust')!);

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
