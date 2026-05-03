/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { issueToken, verifyToken } from '../src/jwt.js';

describe('@tiltcheck/auth-flow JWT helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('issues and verifies a token using environment-backed config', async () => {
    vi.stubEnv('JWT_SECRET', 'compat-secret-for-tests');
    vi.stubEnv('JWT_ISSUER', 'compat.tiltcheck.test');
    vi.stubEnv('JWT_AUDIENCE', 'compat.tiltcheck.test');
    vi.stubEnv('JWT_EXPIRES_IN', '2h');

    const token = await issueToken('legacy-user', { role: 'user', heater: true });
    const payload = await verifyToken(token);

    expect(payload.userId).toBe('legacy-user');
    expect(payload.role).toBe('user');
    expect(payload.heater).toBe(true);
    expect(payload.iss).toBe('compat.tiltcheck.test');
    expect(payload.aud).toBe('compat.tiltcheck.test');
  });

  it('fails closed when JWT_SECRET is missing', async () => {
    vi.stubEnv('JWT_SECRET', '');

    await expect(issueToken('legacy-user')).rejects.toThrow(/JWT_SECRET/);
  });
});
