/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-09 */
/**
 * Staff role check.
 *
 * A user is "staff" when their Discord account holds the TiltCheck Team role in the
 * TiltCheck Discord server. Checked with the bot token via the Discord REST API,
 * cached per Discord id, and FAIL CLOSED: any missing config, network error,
 * non-200 answer, or missing member returns false.
 *
 * Env:
 *   DISCORD_BOT_TOKEN (or TILT_DISCORD_BOT_TOKEN)  bot must be in the guild
 *   TILTCHECK_STAFF_GUILD_ID   default 1488253239643078787
 *   TILTCHECK_STAFF_ROLE_ID    default 1488256012807966751 (TiltCheck Team)
 */

const DEFAULT_STAFF_GUILD_ID = '1488253239643078787';
const DEFAULT_STAFF_ROLE_ID = '1488256012807966751';

const POSITIVE_TTL_MS = 10 * 60 * 1000;
const NEGATIVE_TTL_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 3000;

type CacheEntry = { isStaff: boolean; expiresAt: number };
const cache = new Map<string, CacheEntry>();

export function getStaffRoleConfig() {
  return {
    botToken:
      process.env.DISCORD_BOT_TOKEN?.trim() || process.env.TILT_DISCORD_BOT_TOKEN?.trim() || '',
    guildId: process.env.TILTCHECK_STAFF_GUILD_ID?.trim() || DEFAULT_STAFF_GUILD_ID,
    roleId: process.env.TILTCHECK_STAFF_ROLE_ID?.trim() || DEFAULT_STAFF_ROLE_ID,
  };
}

export function clearStaffRoleCache(): void {
  cache.clear();
}

export async function isTiltCheckStaff(
  discordId: string | null | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!discordId || !/^\d{5,25}$/.test(discordId)) return false;

  const now = Date.now();
  const hit = cache.get(discordId);
  if (hit && hit.expiresAt > now) return hit.isStaff;

  const { botToken, guildId, roleId } = getStaffRoleConfig();
  if (!botToken) return false;

  let isStaff = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetchImpl(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timer));

    if (res.ok) {
      const member = (await res.json()) as { roles?: unknown };
      isStaff = Array.isArray(member.roles) && member.roles.includes(roleId);
    } else if (res.status !== 404) {
      // Rate limit or outage: fail closed, don't cache long.
      return false;
    }
  } catch {
    return false;
  }

  cache.set(discordId, {
    isStaff,
    expiresAt: now + (isStaff ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS),
  });
  return isStaff;
}
