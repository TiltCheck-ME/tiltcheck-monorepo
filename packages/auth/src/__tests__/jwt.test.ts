/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */

import { describe, expect, it } from 'vitest';
import { createSessionToken, decodeToken, verifyToken } from '../jwt.js';

const jwtConfig = {
  secret: 'test-secret-key-for-auth-package-1234567890',
  issuer: 'tiltcheck.test',
  audience: 'tiltcheck.test',
  expiresIn: '1h',
} as const;

describe('@tiltcheck/auth JWT helpers', () => {
  it('issues and verifies a session token with roles and custom claims', async () => {
    const token = await createSessionToken(
      'user-123',
      'user',
      ['member', 'beta'],
      jwtConfig,
      { walletAddress: 'wallet-abc' },
    );

    const decoded = decodeToken(token);
    const verified = await verifyToken(token, jwtConfig);

    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe('user-123');
    expect(decoded?.type).toBe('user');
    expect(decoded?.roles).toEqual(['member', 'beta']);
    expect(decoded?.walletAddress).toBe('wallet-abc');

    expect(verified.valid).toBe(true);
    expect(verified.payload).toMatchObject({
      sub: 'user-123',
      type: 'user',
      roles: ['member', 'beta'],
      walletAddress: 'wallet-abc',
      iss: 'tiltcheck.test',
      aud: 'tiltcheck.test',
    });
  });

  it('fails closed when the verifier secret does not match the signing secret', async () => {
    const token = await createSessionToken('user-123', 'user', ['member'], jwtConfig);

    const verification = await verifyToken(token, {
      ...jwtConfig,
      secret: 'different-secret-key-for-auth-package-0987654321',
    });

    expect(verification.valid).toBe(false);
    expect(verification.error?.toLowerCase()).toContain('signature');
  });
});
