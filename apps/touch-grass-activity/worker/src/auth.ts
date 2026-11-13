// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Discord OAuth helpers for the Activity: code -> token exchange, and token -> user lookup.

import type { RoomUser } from '../../src/shared/protocol.js';

export interface AuthEnv {
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  /** "true" only for local dev. Lets `guest:<name>` tokens in. Never set this in production. */
  ALLOW_GUEST?: string;
}

export const DEFAULT_CLIENT_ID = '1445916179163250860';
const DISCORD_API = 'https://discord.com/api/v10';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Swap the Activity's authorize() code for an access token.
 * No redirect_uri: the Embedded App SDK flow does not use one (matches Discord's sample app).
 */
export async function exchangeCode(
  code: string,
  env: AuthEnv,
  fetchImpl: FetchLike = fetch,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const clientId = env.DISCORD_CLIENT_ID || DEFAULT_CLIENT_ID;
  const secret = env.DISCORD_CLIENT_SECRET;
  if (!secret) return { status: 500, body: { error: 'server-not-configured' } };
  if (!code || typeof code !== 'string' || code.length > 256) return { status: 400, body: { error: 'bad-code' } };

  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    grant_type: 'authorization_code',
    code,
  });
  const res = await fetchImpl(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) return { status: 401, body: { error: 'exchange-failed', discordStatus: res.status } };
  const data = (await res.json()) as { access_token?: string; expires_in?: number; scope?: string };
  if (!data.access_token) return { status: 502, body: { error: 'no-token' } };
  // Only hand back what the client needs. No refresh token leaves the worker.
  return { status: 200, body: { access_token: data.access_token, expires_in: data.expires_in ?? null } };
}

interface CacheEntry {
  user: RoomUser;
  exp: number;
}
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX = 500;
const userCache = new Map<string, CacheEntry>();

export function clearUserCache(): void {
  userCache.clear();
}

function guestUser(token: string): RoomUser | null {
  const raw = token.slice('guest:'.length).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);
  if (!raw) return null;
  return { id: `guest-${raw}`, name: `Guest ${raw}`, avatar: null };
}

/** Bearer token -> Discord user. Cached per isolate for 5 minutes. */
export async function verifyToken(token: string, env: AuthEnv, fetchImpl: FetchLike = fetch, now = Date.now()): Promise<RoomUser | null> {
  if (!token || token.length > 512) return null;
  if (token.startsWith('guest:')) return env.ALLOW_GUEST === 'true' ? guestUser(token) : null;

  const hit = userCache.get(token);
  if (hit && hit.exp > now) return hit.user;

  const res = await fetchImpl(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const u = (await res.json()) as { id?: string; username?: string; global_name?: string | null; avatar?: string | null };
  if (!u.id || !/^\d{5,25}$/.test(u.id)) return null;
  const user: RoomUser = { id: u.id, name: (u.global_name || u.username || 'degen').slice(0, 64), avatar: u.avatar ?? null };
  if (userCache.size >= CACHE_MAX) {
    const first = userCache.keys().next().value;
    if (first !== undefined) userCache.delete(first);
  }
  userCache.set(token, { user, exp: now + CACHE_TTL_MS });
  return user;
}
