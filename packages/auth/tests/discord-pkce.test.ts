/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  derivePkceCodeChallengeS256,
  generatePkceCodeVerifier,
  getAuthorizationUrl,
} from '../src/discord.ts';

describe('Discord OAuth PKCE helpers', () => {
  it('generates a verifier within RFC 7636 length bounds', () => {
    const v = generatePkceCodeVerifier();
    expect(v.length).toBeGreaterThanOrEqual(43);
    expect(v.length).toBeLessThanOrEqual(128);
  });

  it('derivePkceCodeChallengeS256 matches SHA-256 base64url', () => {
    const verifier = generatePkceCodeVerifier();
    const expected = createHash('sha256').update(verifier).digest('base64url');
    expect(derivePkceCodeChallengeS256(verifier)).toBe(expected);
  });

  it('includes PKCE params on the Discord authorize URL when requested', () => {
    const url = getAuthorizationUrl(
      {
        clientId: 'cid',
        clientSecret: 'sec',
        redirectUri: 'https://api.example/cb',
        scopes: ['identify'],
      },
      'stateval',
      {
        pkce: { codeChallenge: 'chal', codeChallengeMethod: 'S256' },
      },
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get('code_challenge')).toBe('chal');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('state')).toBe('stateval');
  });
});
