/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
/**
 * @vitest-environment jsdom
 * Popup Cash-out Buddy section: invite code, accept code, status, unpair.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initBuddyPanel, renderBuddyStatus, type BuddySend } from '../../src/buddy-panel.js';

const PANEL = `
<section id="buddy-panel">
  <p id="buddy-status-line"></p>
  <ul id="buddy-list"></ul>
  <div id="buddy-controls">
    <button id="btn-buddy-invite"></button><code id="buddy-invite-code"></code><button id="btn-buddy-copy" style="display:none"></button>
    <input id="buddy-accept-input" /><button id="btn-buddy-accept"></button>
  </div>
</section>`;

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const $ = (id: string) => document.getElementById(id)!;

function fakeSend(state: { buddies: Array<{ id: string; name: string }>; invite: null | { code: string; expiresAt: string } }) {
  const calls: any[] = [];
  const send: BuddySend = async (m: any) => {
    calls.push(m);
    if (m.type === 'buddy_status') {
      return { success: true, data: { paired: state.buddies.length > 0, count: state.buddies.length, max: 3, buddies: state.buddies, invite: state.invite } } as any;
    }
    if (m.type === 'buddy_invite') {
      state.invite = { code: 'ABCD-EFGH', expiresAt: 'x' };
      return { success: true, data: state.invite } as any;
    }
    if (m.type === 'buddy_accept') {
      if (m.code !== 'WXYZ-2345') return { success: false, error: 'That code is not valid or has expired.' };
      state.buddies.push({ id: 'abcdef0123456789', name: 'Pal' });
      return { success: true, data: { ok: true } } as any;
    }
    if (m.type === 'buddy_unpair') {
      state.buddies = state.buddies.filter((b) => b.id !== m.buddy);
      return { success: true, data: { ok: true, count: state.buddies.length } } as any;
    }
    return { success: false };
  };
  return { send, calls };
}

beforeEach(() => {
  document.body.innerHTML = PANEL;
});

describe('buddy panel', () => {
  it('shows status, makes an invite code, accepts a code and unpairs', async () => {
    const st = { buddies: [] as any[], invite: null as any };
    const { send, calls } = fakeSend(st);
    initBuddyPanel(document, send);
    await flush();
    expect($('buddy-status-line').textContent).toMatch(/Not paired/);

    ($('btn-buddy-invite') as HTMLButtonElement).click();
    await flush();
    expect($('buddy-invite-code').textContent).toBe('ABCD-EFGH');
    expect($('btn-buddy-copy').style.display).toBe('');

    ($('buddy-accept-input') as HTMLInputElement).value = 'nope';
    ($('btn-buddy-accept') as HTMLButtonElement).click();
    await flush();
    expect($('buddy-status-line').textContent).toBe('That code is not valid or has expired.');

    ($('buddy-accept-input') as HTMLInputElement).value = ' WXYZ-2345 ';
    ($('btn-buddy-accept') as HTMLButtonElement).click();
    await flush();
    expect(calls.find((c) => c.type === 'buddy_accept' && c.code === 'WXYZ-2345')).toBeTruthy();
    expect($('buddy-status-line').textContent).toMatch(/Paired: 1/);
    expect($('buddy-list').textContent).toContain('Pal');

    (document.querySelector('#buddy-list button[data-buddy]') as HTMLButtonElement).click();
    await flush();
    expect(calls.at(-2)).toEqual({ type: 'buddy_unpair', buddy: 'abcdef0123456789' });
    expect($('buddy-list').textContent).toBe('');
    expect($('buddy-status-line').textContent).toMatch(/Not paired/);
    // nothing the panel sends carries an amount-like field
    for (const c of calls) expect(Object.keys(c).every((k) => ['type', 'code', 'buddy'].includes(k))).toBe(true);
  });

  it('asks to sign in when signed out and hides the controls', () => {
    const send = vi.fn() as unknown as BuddySend;
    renderBuddyStatus(document, { success: false, signedIn: false }, send);
    expect($('buddy-status-line').textContent).toBe('Sign in with Discord to pair with a buddy.');
    expect($('buddy-controls').style.display).toBe('none');
  });

  it('says so when the server does not have buddy routes yet', () => {
    renderBuddyStatus(document, { success: false, unavailable: true }, vi.fn() as unknown as BuddySend);
    expect($('buddy-status-line').textContent).toBe('Cash-out Buddy is not live on the server yet.');
  });

  it('renders names as text, never HTML', () => {
    renderBuddyStatus(
      document,
      { success: true, data: { paired: true, count: 1, buddies: [{ id: 'abcdef0123456789', name: '<img src=x onerror=alert(1)>' }], invite: null } },
      vi.fn() as unknown as BuddySend,
    );
    expect(document.querySelector('#buddy-list img')).toBeNull();
    expect($('buddy-list').textContent).toContain('<img');
  });
});
