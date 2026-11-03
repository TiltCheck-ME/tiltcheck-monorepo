/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */
import { describe, expect, it } from 'vitest';
import {
  LOUNGE_DEFAULT_SEAT,
  identityFromHandle,
  signLoungeIdentity,
  verifyLoungeIdentity,
} from '../src/lounge/identity.js';

describe('lounge identity', () => {
  it('defaults the first seat to jmenichole', () => {
    expect(identityFromHandle('')).toEqual(LOUNGE_DEFAULT_SEAT);
    expect(identityFromHandle('jmenichole')).toEqual(LOUNGE_DEFAULT_SEAT);
    expect(identityFromHandle('Jmenichole')).toEqual(LOUNGE_DEFAULT_SEAT);
    expect(identityFromHandle('  jmenichole  ')).toEqual(LOUNGE_DEFAULT_SEAT);
  });

  it('keeps a custom handle stable across logins', () => {
    expect(identityFromHandle('Chase')).toEqual({ userId: 'local-chase', username: 'Chase' });
    expect(identityFromHandle('Chase').userId).toBe(identityFromHandle('chase').userId);
  });

  it('signs and verifies a lounge cookie, rejects tampering', () => {
    const secret = 'test-lounge-secret';
    const token = signLoungeIdentity(secret, LOUNGE_DEFAULT_SEAT);
    expect(verifyLoungeIdentity(secret, token)).toEqual(LOUNGE_DEFAULT_SEAT);
    expect(verifyLoungeIdentity(secret, token.replace(/.$/, 'x'))).toBeNull();
    expect(verifyLoungeIdentity('other', token)).toBeNull();
  });

  it('migrates the old User 1 seat to jmenichole', () => {
    const secret = 'test-lounge-secret';
    const legacy = signLoungeIdentity(secret, { userId: 'user-1', username: 'User 1' });
    expect(verifyLoungeIdentity(secret, legacy)).toEqual(LOUNGE_DEFAULT_SEAT);
  });
});
