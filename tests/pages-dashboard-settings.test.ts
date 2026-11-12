// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
/**
 * tiltcheck.me dashboard Settings + the "No take-backs" lock confirmation
 * on /cooldown/ and /dashboard/. Builds the Pages site into a temp dir and drives
 * the real generated HTML in jsdom.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PLAYER_SETTINGS_DEFAULTS } from '../scripts/pages-product-data.mjs';
import { GAME_CATEGORIES, SETTINGS_GROUPS } from '../scripts/pages-dashboard-settings.mjs';

let outDir = '';
let dashboardHtml = '';
let cooldownHtml = '';

beforeAll(() => {
  outDir = mkdtempSync(path.join(tmpdir(), 'tc-pages-'));
  execFileSync('node', ['scripts/convert-markdown.js', 'docs/tiltcheck', path.join(outDir, 'docs')], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });
  dashboardHtml = readFileSync(path.join(outDir, 'dashboard/index.html'), 'utf8');
  cooldownHtml = readFileSync(path.join(outDir, 'cooldown/index.html'), 'utf8');
}, 60_000);

afterAll(() => {
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

type Posted = Record<string, unknown>;

function open(html: string, url: string, opts: { token?: string; fetchImpl?: unknown } = {}) {
  const dom = new JSDOM(html, {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(win) {
      if (opts.token) {
        win.localStorage.setItem('tc_token', opts.token);
        win.localStorage.setItem('tc_user', JSON.stringify({ id: '123456789012345678', username: 'degen' }));
        win.localStorage.setItem('tc_token_exp', String(Date.now() + 3_600_000));
      }
      (win as unknown as { fetch: unknown }).fetch = opts.fetchImpl ?? (() => Promise.reject(new Error('offline')));
    },
  });
  const posted: Posted[] = [];
  const realPost = dom.window.postMessage.bind(dom.window);
  dom.window.postMessage = ((msg: Posted, target: string) => {
    posted.push(msg);
    return realPost(msg, target);
  }) as typeof dom.window.postMessage;
  return { dom, win: dom.window, doc: dom.window.document, posted };
}

const tick = () => new Promise((r) => setTimeout(r, 5));
const lockMessages = (posted: Posted[]) => posted.filter((m) => m.type === 'LOCK_UPDATED');

function key(win: Window, k: string, shift = false) {
  const ev = new win.KeyboardEvent('keydown', { key: k, shiftKey: shift, bubbles: true, cancelable: true });
  win.document.activeElement?.dispatchEvent(ev);
  return ev;
}

describe.each([
  ['cooldown page', () => cooldownHtml, 'https://tiltcheck.me/cooldown/', 'btn-cooldown-lock', 'local_browser_session'],
  ['dashboard', () => dashboardHtml, 'https://tiltcheck.me/dashboard/', 'btn-dash-lock', 'dashboard'],
])('lock confirmation on the %s', (_name, html, url, buttonId, lockSource) => {
  it('opens a labelled modal dialog and cannot lock without the checkbox', async () => {
    const { win, doc, posted } = open(html(), url);
    (doc.getElementById(buttonId) as HTMLButtonElement).click();
    await tick();

    const root = doc.getElementById('lock-confirm') as HTMLElement;
    const box = root.querySelector('[role="dialog"]') as HTMLElement;
    const go = doc.getElementById('lock-confirm-go') as HTMLButtonElement;
    const check = doc.getElementById('lock-confirm-check') as HTMLInputElement;
    expect(root.hidden).toBe(false);
    expect(box.getAttribute('aria-modal')).toBe('true');
    expect(doc.getElementById(box.getAttribute('aria-labelledby')!)?.textContent).toBe('No take-backs.');
    expect(doc.getElementById('lock-confirm-end')?.textContent).not.toBe('the end time');
    expect(doc.activeElement).toBe(check);
    expect(go.disabled).toBe(true);

    go.click(); // disabled: nothing
    // Even if someone strips the disabled attribute, the box still has to be ticked.
    go.disabled = false;
    go.click();
    await tick();
    expect(lockMessages(posted)).toHaveLength(0);
    expect(win.localStorage.getItem('tiltcheck_cooldown_active_until')).toBeNull();

    check.click();
    expect(go.disabled).toBe(false);
    go.click();
    await tick();
    expect(root.hidden).toBe(true);
    const sent = lockMessages(posted);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ source: 'TILTCHECK_COOLDOWN_PAGE', lockSource });
    expect(Number(win.localStorage.getItem('tiltcheck_cooldown_active_until'))).toBeGreaterThan(Date.now());
  });

  it('Cancel and Esc close it without locking, and focus goes back to the button', async () => {
    const { win, doc, posted } = open(html(), url);
    const btn = doc.getElementById(buttonId) as HTMLButtonElement;
    btn.focus();
    btn.click();
    await tick();
    (doc.getElementById('lock-confirm-check') as HTMLInputElement).click();
    (doc.getElementById('lock-confirm-cancel') as HTMLButtonElement).click();
    await tick();
    expect((doc.getElementById('lock-confirm') as HTMLElement).hidden).toBe(true);
    expect(doc.activeElement).toBe(btn);

    btn.click();
    await tick();
    expect((doc.getElementById('lock-confirm-check') as HTMLInputElement).checked).toBe(false);
    key(win, 'Escape');
    await tick();
    expect((doc.getElementById('lock-confirm') as HTMLElement).hidden).toBe(true);
    expect(lockMessages(posted)).toHaveLength(0);
    expect(win.localStorage.getItem('tiltcheck_cooldown_active_until')).toBeNull();
  });

  it('traps Tab focus inside the dialog', async () => {
    const { win, doc } = open(html(), url);
    (doc.getElementById(buttonId) as HTMLButtonElement).click();
    await tick();
    const check = doc.getElementById('lock-confirm-check') as HTMLInputElement;
    const cancel = doc.getElementById('lock-confirm-cancel') as HTMLButtonElement;
    // Lock button disabled: Cancel is the last stop.
    cancel.focus();
    const ev = key(win, 'Tab');
    expect(ev.defaultPrevented).toBe(true);
    expect(doc.activeElement).toBe(check);
    const back = key(win, 'Tab', true);
    expect(back.defaultPrevented).toBe(true);
    expect(doc.activeElement).toBe(cancel);
  });

  it('shows a lock the extension reports even after localStorage was cleared', async () => {
    const { win, doc } = open(html(), url);
    const until = Date.now() + 5 * 3_600_000;
    // What the extension's content script posts (jsdom's postMessage leaves event.source empty).
    win.dispatchEvent(new win.MessageEvent('message', { data: { source: 'TILTCHECK_EXTENSION', type: 'LOCK_STATE', activeUntil: until }, source: win }));
    await tick();
    const btn = doc.getElementById(buttonId) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toMatch(/^Locked until/);
    expect(Number(win.localStorage.getItem('tiltcheck_cooldown_active_until'))).toBe(until);
  });
});

describe('dashboard Settings', () => {
  it('covers every synced setting', () => {
    const keys = SETTINGS_GROUPS.flatMap((g) => g.rows.map((r) => r.key)).sort();
    expect(keys).toEqual([...Object.keys(PLAYER_SETTINGS_DEFAULTS), 'goals'].sort());
  });

  it('game types match the extension taxonomy', () => {
    const types = readFileSync(path.join(process.cwd(), 'packages/types/src/index.ts'), 'utf8');
    for (const [slug, label] of GAME_CATEGORIES) {
      expect(types).toContain(`'${slug}'`);
      expect(types).toContain(`${slug}: '${label}'`);
    }
  });

  it('uses current tool names and plain language', () => {
    const { doc } = open(dashboardHtml, 'https://tiltcheck.me/dashboard/');
    const text = (doc.querySelector('main')?.textContent || '').replace(/\s+/g, ' ');
    expect(text).not.toMatch(/SpinCheck|PocketCheck|WinCheck|AutoVault|Bet Verifier/);
    expect(text).not.toMatch(/\b(shield|armor|armour|guard(s|ed|ing)?|protect(s|ed|ing|ion)?|save you)\b/i);
    for (const name of ['ClickCheck', 'Sneaky Bet Alert', 'TimeCheck', 'RealityCheck', 'Keep the Win', 'Win Skim', 'Nope List']) {
      expect(text).toContain(name);
    }
  });

  it('signed out: shows Discord sign-in and hides the form', async () => {
    const fetchImpl = vi.fn();
    const { doc } = open(dashboardHtml, 'https://tiltcheck.me/dashboard/', { fetchImpl });
    await tick();
    expect((doc.getElementById('dash-signin') as HTMLElement).hidden).toBe(false);
    expect((doc.getElementById('dash-settings-form') as HTMLElement).hidden).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('signed in: loads saved settings and saves the whole object with the Discord token', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl = (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (!init || !init.method || init.method === 'GET') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ settings: { winSkimPercent: 30, nopeGames: ['plinko'] }, updatedAt: 1 }) });
      }
      const body = JSON.parse(String(init.body));
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, settings: body.settings, updatedAt: 2 }) });
    };
    const { doc, win } = open(dashboardHtml, 'https://tiltcheck.me/dashboard/', { token: 'discord-token-abcdefghijklmnopqrstuvwxyz', fetchImpl });
    await new Promise((r) => setTimeout(r, 30));
    expect(calls[0].url).toBe('https://collectclock-api.j-chapman7.workers.dev/settings');
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe('Bearer discord-token-abcdefghijklmnopqrstuvwxyz');
    expect((doc.getElementById('set-winSkimPercent') as HTMLSelectElement).value).toBe('30');
    expect((doc.getElementById('set-nopeGames') as HTMLTextAreaElement).value).toBe('plinko');

    (doc.getElementById('set-sounds') as HTMLInputElement).click();
    (doc.getElementById('set-nopeGames') as HTMLTextAreaElement).value = 'Plinko\nSweet Bonanza';
    const form = doc.getElementById('dash-settings-form') as HTMLFormElement;
    form.dispatchEvent(new win.Event('submit', { cancelable: true, bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
    const put = calls.find((c) => c.init?.method === 'PUT');
    expect(put).toBeTruthy();
    const sent = JSON.parse(String(put!.init!.body)).settings;
    expect(Object.keys(sent).sort()).toEqual([...Object.keys(PLAYER_SETTINGS_DEFAULTS), 'goals'].sort());
    expect(sent.sounds).toBe(false);
    expect(sent.winSkimPercent).toBe(30);
    expect(sent.nopeGames).toEqual(['plinko', 'sweet-bonanza']);
    expect(doc.getElementById('dash-save-status')?.textContent).toMatch(/^Saved/);
  });

  it('refuses to save an out-of-range number', async () => {
    const calls: string[] = [];
    const fetchImpl = (_url: string, init?: RequestInit) => {
      calls.push(init?.method || 'GET');
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ settings: {}, updatedAt: null }) });
    };
    const { doc, win } = open(dashboardHtml, 'https://tiltcheck.me/dashboard/', { token: 'discord-token-abcdefghijklmnopqrstuvwxyz', fetchImpl });
    await new Promise((r) => setTimeout(r, 30));
    (doc.getElementById('set-hourlyWage') as HTMLInputElement).value = '99999';
    (doc.getElementById('dash-settings-form') as HTMLFormElement).dispatchEvent(new win.Event('submit', { cancelable: true }));
    await tick();
    expect(calls).not.toContain('PUT');
    expect(doc.getElementById('dash-save-status')?.textContent).toMatch(/outside/);
  });
});
