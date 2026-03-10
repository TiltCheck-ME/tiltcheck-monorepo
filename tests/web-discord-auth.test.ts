import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function loadAuthScriptWithFetch(
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<{ ok: boolean; json: () => Promise<any> }>
) {
  const dom = new JSDOM(
    `<!doctype html><html><body><button class="discord-login-btn">Login</button></body></html>`,
    {
      url: 'https://tiltcheck.me/login.html',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
    }
  );

  const { window } = dom;
  (window as any).fetch = fetchImpl;
  (window as any).console = console;

  const script = readFileSync(resolve('apps/web/scripts/auth.js'), 'utf8');
  window.eval(script);

  await new Promise((resolveDelay) => setTimeout(resolveDelay, 30));
  return window as any;
}

describe('Discord web auth session detection', () => {
  it('repro: does not detect valid /api/auth/me session when /play/api/user fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return {
          ok: true,
          json: async () => ({ userId: 'u_123', discordUsername: 'tilt-user' }),
        };
      }
      return {
        ok: false,
        json: async () => ({}),
      };
    });

    const window = await loadAuthScriptWithFetch(fetchMock);
    const user = window.tiltCheckAuth?.getUser?.();

    // Desired behavior: valid /api/auth/me should count as logged in.
    expect(user).toEqual(
      expect.objectContaining({
        id: 'u_123',
      })
    );
  });

  it('keeps legacy /play/api/user compatibility', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/play/api/user') {
        return {
          ok: true,
          json: async () => ({ id: 'legacy_1', username: 'legacy-user' }),
        };
      }
      return {
        ok: false,
        json: async () => ({}),
      };
    });

    const window = await loadAuthScriptWithFetch(fetchMock);
    const user = window.tiltCheckAuth?.getUser?.();

    expect(user).toEqual(
      expect.objectContaining({
        id: 'legacy_1',
      })
    );
  });
});
