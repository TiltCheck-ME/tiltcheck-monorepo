// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-15
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAuthSession } from '../apps/web/src/lib/auth-session';

describe('web auth session detection', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (typeof originalWindow === 'undefined') {
      delete (globalThis as typeof globalThis & { window?: Window }).window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  it('uses the canonical /auth/me endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: 'u_123',
        discordId: 'd_123',
        discordUsername: 'tilt-user',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const session = await fetchAuthSession({ apiBase: '/api', includeStoredToken: false });

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', {
      credentials: 'include',
      headers: undefined,
    });
    expect(session).toEqual(
      expect.objectContaining({
        userId: 'u_123',
        discordId: 'd_123',
        discordUsername: 'tilt-user',
        username: 'tilt-user',
      }),
    );
  });

  it('falls back to email when Discord username is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          userId: 'u_456',
          email: 'degen@tiltcheck.me',
        }),
      }),
    );

    const session = await fetchAuthSession({ apiBase: '', includeStoredToken: false });

    expect(session?.username).toBe('degen@tiltcheck.me');
  });

  it('adds bearer auth when a stored token exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: 'u_789',
        username: 'wallet-user',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn().mockReturnValue('stored-token'),
      },
    } as unknown as Window);

    await fetchAuthSession({ apiBase: '/api' });

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', {
      credentials: 'include',
      headers: { Authorization: 'Bearer stored-token' },
    });
  });

  it('returns null when no session exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Not authenticated' }),
      }),
    );

    await expect(fetchAuthSession({ apiBase: '/api', includeStoredToken: false })).resolves.toBeNull();
  });
});
