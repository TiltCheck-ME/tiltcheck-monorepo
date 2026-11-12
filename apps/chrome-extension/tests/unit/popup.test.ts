/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */
/**
 * @vitest-environment jsdom
 * Popup keeps three things: Discord sign-in, one on/off switch, Open Dashboard.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const root = dirname(fileURLToPath(import.meta.url));
const popupHtml = readFileSync(join(root, '../../src/popup.html'), 'utf8');

function mountPopup() {
  const body = popupHtml.slice(popupHtml.indexOf('<body>') + 6, popupHtml.indexOf('<script src="popup.js">'));
  document.body.innerHTML = body;
}

function mockChrome(state: Record<string, unknown>) {
  const created: string[] = [];
  const chromeMock = {
    tabs: { create: vi.fn((o: { url: string }, cb?: () => void) => { created.push(o.url); cb?.(); }) },
    runtime: { sendMessage: vi.fn(), lastError: null },
    storage: {
      onChanged: { addListener: vi.fn() },
      local: {
        get: vi.fn(async (keys: string[]) => {
          const out: Record<string, unknown> = {};
          for (const k of keys) if (k in state) out[k] = state[k];
          return out;
        }),
        set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(state, items); }),
      },
    },
  };
  (globalThis as unknown as { chrome: unknown }).chrome = chromeMock;
  return { chromeMock, created, state };
}

describe('popup markup', () => {
  it('has exactly three controls: sign-in, the switch, and Open Dashboard (plus sign-out when signed in)', () => {
    const ids = [...popupHtml.matchAll(/<(?:button|a|input|select)[^>]*id="([^"]+)"/g)].map((m) => m[1]).sort();
    expect(ids).toEqual(['btn-dashboard', 'btn-signin', 'btn-signout', 'master-switch']);
    expect(popupHtml).not.toMatch(/<input|<select|<textarea/);
    expect(popupHtml).toContain('href="https://tiltcheck.me/dashboard/"');
    expect(popupHtml).toContain('role="switch"');
  });

  it('carries no old tool names or shield/guard framing', () => {
    const visible = popupHtml.replace(/<style[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ');
    expect(visible).not.toMatch(/SpinCheck|PocketCheck|WinCheck|Guards?\b|Shield|Armor|protect/i);
  });
});

describe('popup behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
  });

  it('signed out: shows the Discord sign-in and opens the same sign-in the site uses', async () => {
    mountPopup();
    const { created } = mockChrome({});
    const { initPopup } = await import('../../src/popup.js');
    await initPopup();
    expect((document.getElementById('signed-out') as HTMLElement).hidden).toBe(false);
    expect((document.getElementById('signed-in') as HTMLElement).hidden).toBe(true);
    (document.getElementById('btn-signin') as HTMLButtonElement).click();
    expect(created[0]).toContain('https://discord.com/oauth2/authorize?');
    expect(created[0]).toContain('state=h.web');
    expect(created[0]).toContain(encodeURIComponent('https://collectclock-api.j-chapman7.workers.dev/auth/callback'));
  });

  it('the switch turns TiltCheck off locally and says a running break still runs', async () => {
    mountPopup();
    const { state } = mockChrome({ tiltcheck_cooldown_active_until: Date.now() + 3_600_000 });
    vi.stubGlobal('fetch', vi.fn());
    const { initPopup } = await import('../../src/popup.js');
    await initPopup();
    const sw = document.getElementById('master-switch') as HTMLButtonElement;
    expect(sw.getAttribute('aria-checked')).toBe('true');
    sw.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(state.tiltcheck_enabled).toBe(false);
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(document.getElementById('switch-hint')?.textContent).toMatch(/break still runs/i);
    vi.unstubAllGlobals();
  });

  it('Open Dashboard opens tiltcheck.me/dashboard/', async () => {
    mountPopup();
    const { created } = mockChrome({});
    const { initPopup } = await import('../../src/popup.js');
    await initPopup();
    (document.getElementById('btn-dashboard') as HTMLAnchorElement).click();
    expect(created).toContain('https://tiltcheck.me/dashboard/');
  });
});
