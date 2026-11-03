/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

import { readPresenceGameTitle } from './presence-game-title.js';

const HOST_ID = 'tiltcheck-lounge-host';
const STORAGE_ID_KEY = 'tiltcheck_lounge_user';
const STORAGE_URL_KEY = 'tiltcheck_lounge_url';

type LoungeState = {
  tagline: string;
  messages: Array<{ id: string; username: string; text: string; timestamp: number }>;
  presence: Array<{
    userId: string;
    username: string;
    status: string;
    awayMessage: string | null;
    gameTitle: string | null;
  }>;
};

function defaultLoungeUrl(): string {
  return 'http://127.0.0.1:3004';
}

async function loungeBase(): Promise<string> {
  const stored = await chrome.storage.local.get([STORAGE_URL_KEY]);
  const url = typeof stored[STORAGE_URL_KEY] === 'string' ? stored[STORAGE_URL_KEY] : defaultLoungeUrl();
  return url.replace(/\/+$/, '');
}

async function identity(): Promise<{ userId: string; username: string } | null> {
  const stored = await chrome.storage.local.get([STORAGE_ID_KEY, 'userData']);
  const userData = stored.userData as { id?: string; username?: string } | undefined;
  if (userData?.id && userData?.username) {
    return { userId: String(userData.id), username: String(userData.username).slice(0, 32) };
  }
  const row = stored[STORAGE_ID_KEY] as { userId: string; username: string } | undefined;
  if (row?.userId && row.username) return row;
  return null;
}

async function saveIdentity(user: { userId: string; username: string }): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_ID_KEY]: user });
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
    .cards, .notice { padding: 0.35rem 0.7rem; color: #9aa3b2; font-size: 11px; }
    .notice { display: none; color: #17c3b2; }
    .flag { font: inherit; padding: 0.1rem 0.3rem; margin-left: 0.25rem; background: #17c3b2; color: #0f1115; border: 0; }
  `;
  const panel = doc.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="head">Degen Lounge</div>
    <div class="tag"></div>
    <div class="notice" role="status"></div>
    <div class="log"></div>
    <div class="who"></div>
    <div class="cards"></div>
    <form class="gate"><input maxlength="32" value="jmenichole" placeholder="username" /><button type="submit">WALK IN</button></form>
    <form class="chat" hidden><input maxlength="500" placeholder="talk to the room. names are on." /><button type="submit">SEND</button></form>
    <div class="foot">Chat is named. Tips stay between you two. Made for Degens. By Degens.</div>
  `;
  shadow.append(style, panel);
  doc.body.append(host);

  const log = panel.querySelector('.log') as HTMLElement;
  const who = panel.querySelector('.who') as HTMLElement;
  const tag = panel.querySelector('.tag') as HTMLElement;
  const cardsEl = panel.querySelector('.cards') as HTMLElement;
  const noticeEl = panel.querySelector('.notice') as HTMLElement;
  const gateForm = panel.querySelector('form.gate') as HTMLFormElement;
  const chatForm = panel.querySelector('form.chat') as HTMLFormElement;
  const handleInput = gateForm.querySelector('input') as HTMLInputElement;
  const chatInput = chatForm.querySelector('input') as HTMLInputElement;
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const render = (state: LoungeState, me: { userId: string; username: string }): void => {
    tag.textContent = state.tagline;
    log.textContent = '';
    for (const msg of state.messages.slice(-40)) {
      const p = doc.createElement('p');
      p.textContent = `${msg.username}: ${msg.text}`;
      log.appendChild(p);
    }
    log.scrollTop = log.scrollHeight;
    who.textContent = '';
    for (const row of state.presence) {
      const span = doc.createElement('span');
      const game = row.gameTitle ? `, playing ${row.gameTitle}` : '';
      const away = row.awayMessage ? ` — ${row.awayMessage}` : '';
      const mine = row.userId === me.userId ? ' (you)' : '';
      span.textContent = `${row.username}${mine} (${row.status}${game}${away})`;
      if (row.userId && row.userId !== me.userId) {
        const flag = doc.createElement('button');
        flag.type = 'button';
        flag.className = 'flag';
        flag.textContent = 'breather';
        const tip = doc.createElement('button');
        tip.type = 'button';
        tip.className = 'flag';
        tip.textContent = 'tip';
        tip.addEventListener('click', () => {
          void (async () => {
            const me = await identity();
            if (!me) return;
            const amount = window.prompt(`Tip ${row.username} how much USD? Names stay between you two.`, '2.00');
            if (!amount) return;
            const base = await loungeBase();
            const res = await fetch(`${base}/lounge/tip`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: me.userId, username: me.username, receiverId: row.userId, amountUsd: amount }),
            });
            const view = (await res.json()) as { line?: string };
            if (view.line) {
              noticeEl.style.display = 'block';
              noticeEl.textContent = view.line;
            }
          })();
        });
        span.appendChild(tip);
        flag.addEventListener('click', () => {
          void (async () => {
            const base = await loungeBase();
            const me = await identity();
            if (!me) return;
            await fetch(`${base}/lounge/flag`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                flaggerId: me.userId,
                targetId: row.userId,
                accountAgeDays: 30,
                reputationOk: true,
              }),
            });
          })();
        });
        span.appendChild(flag);
      }
      who.appendChild(span);
      who.appendChild(doc.createTextNode(' · '));
    }
  };

  const tick = async (): Promise<void> => {
    if (stopped) return;
    try {
      const base = await loungeBase();
      const me = await identity();
      if (!me) {
        tag.textContent = 'Pick a username. Chat is named. Tips stay private.';
        gateForm.hidden = false;
        chatForm.hidden = true;
        return;
      }
      gateForm.hidden = true;
      chatForm.hidden = false;
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
      render((await res.json()) as LoungeState, me);
      const [cardsRes, triviaRes, noticeRes] = await Promise.all([
        fetch(`${base}/lounge/scorecards`),
        fetch(`${base}/lounge/trivia`),
        fetch(`${base}/lounge/me/notice?userId=${encodeURIComponent(me.userId)}`),
      ]);
      const cards = cardsRes.ok ? ((await cardsRes.json()) as { cards?: Array<{ name: string; payout: string }> }) : { cards: [] };
      const trivia = triviaRes.ok ? ((await triviaRes.json()) as { note?: string }) : {};
      const notice = noticeRes.ok ? ((await noticeRes.json()) as { notice?: { copy: string } | null }) : { notice: null };
      cardsEl.textContent = [
        ...(cards.cards ?? []).map((card) => `${card.name}: ${card.payout}`),
        trivia.note ?? '',
      ]
        .filter(Boolean)
        .join(' · ');
      if (notice.notice?.copy) {
        noticeEl.style.display = 'block';
        noticeEl.textContent = notice.notice.copy;
        const skip = doc.createElement('button');
        skip.type = 'button';
        skip.className = 'flag';
        skip.textContent = 'Skip';
        skip.addEventListener('click', () => {
          noticeEl.style.display = 'none';
        });
        noticeEl.appendChild(skip);
      }
    } catch {
      tag.textContent = 'Lounge offline. Local: game-arena on :3004 /lounge';
    }
  };

  gateForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const base = await loungeBase();
      const res = await fetch(`${base}/lounge/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: handleInput.value }),
      });
      const body = (await res.json()) as { user?: { userId: string; username: string } };
      if (body.user) {
        await saveIdentity(body.user);
        await tick();
      }
    })();
  });

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      const text = chatInput.value;
      chatInput.value = '';
      const base = await loungeBase();
      const me = await identity();
      if (!me) return;
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
