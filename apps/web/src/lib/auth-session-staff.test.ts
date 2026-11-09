// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-09
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAuthSession } from './auth-session';

function mockMe(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    ),
  );
}

describe('staff flag on the auth session (fails closed)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is true only when /auth/me says isStaff === true', async () => {
    mockMe(200, { userId: 'u1', roles: [], isStaff: true });
    expect((await fetchAuthSession({ includeStoredToken: false }))?.isStaff).toBe(true);
  });

  it('is false when the flag is missing or not exactly true', async () => {
    mockMe(200, { userId: 'u1', roles: [] });
    expect((await fetchAuthSession({ includeStoredToken: false }))?.isStaff).toBe(false);
    mockMe(200, { userId: 'u1', roles: [], isStaff: 'true' });
    expect((await fetchAuthSession({ includeStoredToken: false }))?.isStaff).toBe(false);
  });

  it('returns no session when logged out or the API is down', async () => {
    mockMe(401, { error: 'Not authenticated' });
    expect(await fetchAuthSession({ includeStoredToken: false })).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad gateway', { status: 502 })));
    expect(await fetchAuthSession({ includeStoredToken: false })).toBeNull();
  });

  it('StaffOnly renders nothing until the staff check passes', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const staffOnly = readFileSync(path.join(dir, '../components/StaffOnly.tsx'), 'utf8');
    const hook = readFileSync(path.join(dir, '../hooks/useIsStaff.ts'), 'utf8');
    expect(staffOnly).toContain('if (!isStaff) return null;');
    expect(hook).toContain('useState(false)');
    expect(hook).toContain("session?.isStaff === true");
    expect(hook).toContain('.catch(() => false)');
  });
});
