/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
/**
 * buddy-panel.ts
 * Popup "Cash-out Buddy" section: get an invite code, accept a buddy's code,
 * see who you are paired with, unpair. Every call goes through the background
 * worker (runtime messages buddy_*), which talks to collectclock-api /buddy/*
 * with the Discord-login session.
 *
 * Privacy: nothing here sends or shows an amount. Buddies only ever get
 * "<name> hit their walk-away." or "<name> could use a nudge."
 */

import { isBackendFeatureEnabled } from './config.js';

export interface BuddyEntry {
  id: string;
  name: string;
  since?: number;
}

export interface BuddyStatus {
  paired: boolean;
  count: number;
  max?: number;
  buddies: BuddyEntry[];
  invite: { code: string; expiresAt: string } | null;
}

export interface BuddyResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  signedIn?: boolean;
  unavailable?: boolean;
}

export type BuddySend = <T = unknown>(message: Record<string, unknown>) => Promise<BuddyResponse<T>>;

export const BUDDY_PANEL_ID = 'buddy-panel';

export function defaultBuddySend<T = unknown>(message: Record<string, unknown>): Promise<BuddyResponse<T>> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (res?: BuddyResponse<T>) => {
        void chrome.runtime.lastError;
        resolve(res ?? { success: false, error: 'No answer from the extension.' });
      });
    } catch {
      resolve({ success: false, error: 'Extension context unavailable.' });
    }
  });
}

function el<T extends HTMLElement>(doc: Document, id: string): T | null {
  return doc.getElementById(id) as T | null;
}

/** Render a status (or an error state) into the panel. */
export function renderBuddyStatus(doc: Document, res: BuddyResponse<BuddyStatus>, send: BuddySend): void {
  const line = el(doc, 'buddy-status-line');
  const list = el<HTMLUListElement>(doc, 'buddy-list');
  const controls = el(doc, 'buddy-controls');
  const codeEl = el(doc, 'buddy-invite-code');
  const copyBtn = el<HTMLButtonElement>(doc, 'btn-buddy-copy');
  if (!line || !list) return;
  list.textContent = '';

  if (!res.success || !res.data) {
    line.textContent = res.signedIn === false
      ? 'Sign in with Discord to pair with a buddy.'
      : res.unavailable
        ? 'Cash-out Buddy is not live on the server yet.'
        : `Could not load your buddy: ${res.error || 'try again later.'}`;
    if (controls) controls.style.display = res.signedIn === false || res.unavailable ? 'none' : '';
    return;
  }

  const st = res.data;
  if (controls) controls.style.display = '';
  line.textContent = st.paired ? `Paired: ${st.count}` : 'Not paired.';

  for (const b of st.buddies) {
    const li = doc.createElement('li');
    li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:6px; margin:4px 0;';
    const name = doc.createElement('span');
    name.textContent = b.name || 'Your buddy';
    const un = doc.createElement('button');
    un.type = 'button';
    un.className = 'btn btn-ghost';
    un.style.cssText = 'padding:3px 8px; font-size:10px;';
    un.textContent = 'Unpair';
    un.dataset.buddy = b.id;
    un.addEventListener('click', async () => {
      un.disabled = true;
      const r = await send({ type: 'buddy_unpair', buddy: b.id });
      if (!r.success) {
        un.disabled = false;
        line.textContent = r.error || 'Could not unpair.';
        return;
      }
      await refreshBuddyPanel(doc, send);
    });
    li.append(name, un);
    list.appendChild(li);
  }

  if (codeEl) codeEl.textContent = st.invite ? st.invite.code : '';
  if (copyBtn) copyBtn.style.display = st.invite ? '' : 'none';
}

export async function refreshBuddyPanel(doc: Document, send: BuddySend = defaultBuddySend): Promise<void> {
  const res = await send<BuddyStatus>({ type: 'buddy_status' });
  renderBuddyStatus(doc, res, send);
}

/** Wire the popup section. Hidden entirely while the feature flag is off. */
export function initBuddyPanel(doc: Document = document, send: BuddySend = defaultBuddySend): void {
  const panel = el(doc, BUDDY_PANEL_ID);
  if (!panel) return;
  if (!isBackendFeatureEnabled('buddyPing')) {
    panel.style.display = 'none';
    return;
  }
  const line = el(doc, 'buddy-status-line');
  const say = (msg: string) => {
    if (line) line.textContent = msg;
  };

  el<HTMLButtonElement>(doc, 'btn-buddy-invite')?.addEventListener('click', async () => {
    const r = await send<{ code: string; expiresAt: string }>({ type: 'buddy_invite' });
    if (!r.success || !r.data) {
      say(r.error || 'Could not make a code.');
      return;
    }
    const codeEl = el(doc, 'buddy-invite-code');
    if (codeEl) codeEl.textContent = r.data.code;
    const copyBtn = el(doc, 'btn-buddy-copy');
    if (copyBtn) copyBtn.style.display = '';
    say('');
  });

  el<HTMLButtonElement>(doc, 'btn-buddy-copy')?.addEventListener('click', async () => {
    const code = el(doc, 'buddy-invite-code')?.textContent || '';
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      say('Code copied.');
    } catch {
      say(`Your code: ${code}`);
    }
  });

  el<HTMLButtonElement>(doc, 'btn-buddy-accept')?.addEventListener('click', async () => {
    const input = el<HTMLInputElement>(doc, 'buddy-accept-input');
    const code = (input?.value || '').trim();
    if (!code) {
      say("Enter your buddy's code first.");
      return;
    }
    const r = await send<{ buddy?: BuddyEntry; already?: boolean }>({ type: 'buddy_accept', code });
    if (!r.success) {
      say(r.error || 'That code did not work.');
      return;
    }
    if (input) input.value = '';
    await refreshBuddyPanel(doc, send);
  });

  void refreshBuddyPanel(doc, send);
}
