/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

import { readPresenceGameTitle } from './presence-game-title.js';

const HOST_ID = 'tiltcheck-lounge-host';
const STORAGE_ID_KEY = 'tiltcheck_lounge_user';
const STORAGE_URL_KEY = 'tiltcheck_lounge_url';

type LoungeState = {
  tagline: string;
  messages: Array<{ id: string; username: string; text: string; timestamp: number }>;
  presence: Array<{ username: string; status: string; awayMessage: string | null; gameTitle: string | null }>;
};

function defaultLoungeUrl(): string {
  return 'http://127.0.0.1:3004';
}

async function loungeBase(): Promise<string> {
  const stored = await chrome.storage.local.get([STORAGE_URL_KEY]);
  const url = typeof stored[STORAGE_URL_KEY] === 'string' ? stored[STORAGE_URL_KEY] : defaultLoungeUrl();
  return url.replace(/\/+$/, '');
}

async function identity(): Promise<{ userId: string; username: string }> {
  const stored = await chrome.storage.local.get([STORAGE_ID_KEY, 'userData']);
  const userData = stored.userData as { id?: string; username?: string } | undefined;
  if (userData?.id && userData?.username) {
    return { userId: String(userData.id), username: String(userData.username).slice(0, 32) };
  }
  let row = stored[STORAGE_ID_KEY] as { userId: string; username: string } | undefined;
  if (!row?.userId) {
    const userId = `guest-${crypto.randomUUID().slice(0, 8)}`;
    row = { userId, username: `degen-${userId.slice(-4)}` };
    await chrome.storage.local.set({ [STORAGE_ID_KEY]: row });
  }
  return row;
}

export function installLoungeOverlay(doc: Document = document): () => void {
  if (doc.getElementById(HOST_ID)) {
    return () => undefined;
  }

  const host = doc.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .panel {
      position: fixed; right: 12px; bottom: 12px; z-index: 2147483645;
      width: 18rem; max-height: 22rem; display: flex; flex-direction: column;
      background: #0f1115; color: #f3f6f8; border: 1px solid #2a3140;
      font: 12px/1.4 ui-monospace, monospace; pointer-events: auto;
    }
    .head { padding: 0.5rem 0.7rem; background: #17c3b2; color: #0f1115; font-weight: 700; }
    .tag { padding: 0.35rem 0.7rem; color: #17c3b2; }
    .log { flex: 1; overflow: auto; padding: 0.5rem 0.7rem; min-height: 7rem; }
    .who { padding: 0.35rem 0.7rem; border-top: 1px solid #2a3140; color: #9aa3b2; }
    form { display: flex; gap: 0.25rem; padding: 0.4rem; }
    input, button { font: inherit; border: 1px solid #2a3140; background: #1a1f29; color: inherit; padding: 0.35rem; }
    button { background: #17c3b2; color: #0f1115; font-weight: 700; }
    .foot { padding: 0.35rem 0.7rem 0.5rem; color: #5a6472; font-size: 10px; }
  `;
  const panel = doc.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="head">Degen Lounge</div>
    <div class="tag"></div>
    <div class="log"></div>
    <div class="who"></div>
    <form><input maxlength="500" placeholder="talk to the room" /><button type="submit">SEND</button></form>
    <div class="foot">Show receipts or touch grass. Made for Degens. By Degens.</div>
  `;
  shadow.append(style, panel);
  doc.body.append(host);

  const log = panel.querySelector('.log') as HTMLElement;
  const who = panel.querySelector('.who') as HTMLElement;
  const tag = panel.querySelector('.tag') as HTMLElement;
  const form = panel.querySelector('form') as HTMLFormElement;
  const input = panel.querySelector('input') as HTMLInputElement;
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const render = (state: LoungeState): void => {
    tag.textContent = state.tagline;
    log.textContent = '';
    for (const msg of state.messages.slice(-40)) {
      const p = doc.createElement('p');
      p.textContent = `${msg.username}: ${msg.text}`;
      log.appendChild(p);
    }
    log.scrollTop = log.scrollHeight;
    who.textContent = state.presence
      .map((row) => {
        const game = row.gameTitle ? `, playing ${row.gameTitle}` : '';
        const away = row.awayMessage ? ` — ${row.awayMessage}` : '';
        return `${row.username} (${row.status}${game}${away})`;
      })
      .join(' · ');
  };

  const tick = async (): Promise<void> => {
    if (stopped) return;
    try {
      const base = await loungeBase();
      const me = await identity();
      await fetch(`${base}/lounge/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: me.userId,
          username: me.username,
          gameTitle: readPresenceGameTitle(),
          status: 'online',
        }),
      });
      const res = await fetch(`${base}/lounge/state`);
      if (!res.ok) throw new Error('lounge down');
      render((await res.json()) as LoungeState);
    } catch {
      tag.textContent = 'Lounge offline. Local: game-arena on :3004 /lounge';
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const text = input.value;
      input.value = '';
      const base = await loungeBase();
      const me = await identity();
      await fetch(`${base}/lounge/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: me.userId, username: me.username, text }),
      });
      await tick();
    })();
  });

  void tick();
  timer = setInterval(() => {
    void tick();
  }, 3000);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    host.remove();
  };
}
