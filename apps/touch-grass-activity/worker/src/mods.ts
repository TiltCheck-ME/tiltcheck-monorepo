// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// Who counts as a mod for Hot Takes and Story Chain. The Activity only asks Discord for `identify`,
// so it can't see roles on its own and the app had no staff check to reuse. Two config lists:
//   SOCIAL_MOD_USER_IDS  comma separated Discord user ids (works with nothing else set)
//   SOCIAL_MOD_ROLE_IDS  comma separated role ids; only checked when the secret DISCORD_BOT_TOKEN is
//                        set, through GET /guilds/{guild}/members/{user} with the bot (needs the bot in
//                        that server). Results are cached per isolate for 5 minutes.
// Both empty: nobody is a mod (players can still submit, vote and write; nothing can be hidden).

import type { FetchLike } from './auth.js';

export interface ModEnv {
  SOCIAL_MOD_USER_IDS?: string;
  SOCIAL_MOD_ROLE_IDS?: string;
  /** Secret. Only used for the role lookup above. */
  DISCORD_BOT_TOKEN?: string;
}

const DISCORD_API = 'https://discord.com/api/v10';
const CACHE_MS = 5 * 60_000;
const cache = new Map<string, { mod: boolean; exp: number }>();

export function clearModCache(): void {
  cache.clear();
}

export function idList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d{5,25}$/.test(s));
}

export async function isMod(userId: string, guild: string, env: ModEnv, fetchImpl: FetchLike = fetch, now = Date.now()): Promise<boolean> {
  if (idList(env.SOCIAL_MOD_USER_IDS).includes(userId)) return true;
  const roles = idList(env.SOCIAL_MOD_ROLE_IDS);
  const bot = env.DISCORD_BOT_TOKEN;
  if (!roles.length || !bot || !/^\d{5,25}$/.test(userId) || !/^\d{5,25}$/.test(guild)) return false;
  const key = `${guild}:${userId}`;
  const hit = cache.get(key);
  if (hit && hit.exp > now) return hit.mod;
  let mod = false;
  try {
    const res = await fetchImpl(`${DISCORD_API}/guilds/${guild}/members/${userId}`, { headers: { Authorization: `Bot ${bot}` } });
    if (res.ok) {
      const m = (await res.json()) as { roles?: unknown };
      mod = Array.isArray(m.roles) && m.roles.some((r) => typeof r === 'string' && roles.includes(r));
    }
  } catch {
    mod = false;
  }
  if (cache.size > 500) cache.clear();
  cache.set(key, { mod, exp: now + CACHE_MS });
  return mod;
}
