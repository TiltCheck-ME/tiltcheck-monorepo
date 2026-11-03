/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

import { createHmac } from 'node:crypto';

export const LOUNGE_COOKIE = 'tiltcheck_lounge';
export const LOUNGE_DEFAULT_SEAT = { userId: 'local-jmenichole', username: 'jmenichole' } as const;

export type LoungeIdentity = {
  userId: string;
  username: string;
};

export function identityFromHandle(handle: string | undefined | null): LoungeIdentity {
  const username = String(handle ?? '').replace(/\s+/g, ' ').trim().slice(0, 32);
  if (!username) return { ...LOUNGE_DEFAULT_SEAT };
  const key = username.toLowerCase().replace(/[\s_-]+/g, '');
  if (key === 'jmenichole') return { ...LOUNGE_DEFAULT_SEAT };
  const slug = username
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return { userId: `local-${slug || 'degen'}`, username };
}

export function signLoungeIdentity(secret: string, user: LoungeIdentity): string {
  const payload = Buffer.from(JSON.stringify({ userId: user.userId, username: user.username }), 'utf8').toString(
    'base64url',
  );
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyLoungeIdentity(secret: string, token: string | undefined | null): LoungeIdentity | null {
  if (!secret || !token) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  if (sig.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as LoungeIdentity;
    if (!parsed.userId || !parsed.username) return null;
    const userId = String(parsed.userId).slice(0, 64);
    const username = String(parsed.username).slice(0, 32);
    if (userId === 'user-1' || username.toLowerCase().replace(/[\s_-]+/g, '') === 'user1') {
      return { ...LOUNGE_DEFAULT_SEAT };
    }
    return { userId, username };
  } catch {
    return null;
  }
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return undefined;
}

export function loungeCookieHeader(token: string, secure: boolean): string {
  const parts = [
    `${LOUNGE_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 60 * 60}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearLoungeCookieHeader(secure: boolean): string {
  const parts = [`${LOUNGE_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
