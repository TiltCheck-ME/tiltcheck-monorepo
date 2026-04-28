// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-15
/**
 * Tilted Role Handler
 *
 * When a user hits critical tilt (score >= 8), the bot:
 *   1. Assigns the "Tilted" role (created if missing)
 *   2. Saves their current nickname and replaces it with "Donation Station"
 *   3. Announces the cooldown in-channel with degen-toned copy
 *   4. Restores role + nickname after the cooldown window expires
 *
 * Constraints:
 *   - ADMINISTRATOR users are skipped silently
 *   - Original nicknames are stored in-memory (Map) — not persisted
 *   - On bot restart, auto-restore does NOT run (documented, acceptable for MVP)
 *   - Requires bot permissions: MANAGE_ROLES, MANAGE_NICKNAMES
 */

import { Client, Guild, TextChannel, PermissionsBitField } from 'discord.js';

const TILTED_ROLE_NAME = 'Tilted';
const TILTED_NICKNAME = 'Donation Station';
const DEFAULT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// In-memory store: userId -> original nickname (or null if they had none)
// Ephemeral — not persisted across bot restarts (documented behavior)
const originalNicknames = new Map<string, string | null>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function getOrCreateTiltedRole(guild: Guild) {
  const existing = guild.roles.cache.find(r => r.name === TILTED_ROLE_NAME);
  if (existing) return existing;

  return guild.roles.create({
    name: TILTED_ROLE_NAME,
    color: 0xef4444,
    reason: 'TiltCheck accountability role — auto-created for critical tilt cooldowns',
    mentionable: false,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply the Tilted role and Donation Station nickname to a user in critical cooldown.
 * Announces in the given channel. Schedules auto-restore after cooldownMs.
 */
export async function applyTiltedCooldown(
  client: Client,
  guildId: string,
  userId: string,
  displayName: string,
  channelId: string | null,
  cooldownMs: number = DEFAULT_COOLDOWN_MS,
): Promise<void> {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    console.warn(`[TiltedRole] Guild ${guildId} not found — skipping`);
    return;
  }

  // Fetch member with full data
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    console.warn(`[TiltedRole] Member ${userId} not found in guild — skipping`);
    return;
  }

  // Never touch ADMINISTRATOR users — skip silently
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return;
  }

  // Assign Tilted role
  try {
    const role = await getOrCreateTiltedRole(guild);
    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role, 'TiltCheck critical tilt cooldown');
    }
  } catch (err) {
    console.error('[TiltedRole] Failed to assign Tilted role:', err);
  }

  // Save current nickname and update to Donation Station
  if (!originalNicknames.has(userId)) {
    originalNicknames.set(userId, member.nickname);
  }
  try {
    await member.setNickname(TILTED_NICKNAME, 'TiltCheck critical tilt cooldown');
  } catch (err) {
    console.error('[TiltedRole] Failed to set nickname:', err);
  }

  // Announce in channel
  if (channelId) {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel && channel instanceof TextChannel) {
        await channel.send(
          `${displayName} is now in cooldown. Nickname updated for accountability.`,
        );
      }
    } catch (err) {
      console.error('[TiltedRole] Failed to send cooldown announcement:', err);
    }
  }

  // Schedule auto-restore
  setTimeout(() => {
    restoreTiltedCooldown(client, guildId, userId).catch(err => {
      console.error('[TiltedRole] Auto-restore failed:', err);
    });
  }, cooldownMs);
}

/**
 * Remove the Tilted role and restore the original nickname.
 * Safe to call multiple times — idempotent.
 */
export async function restoreTiltedCooldown(
  client: Client,
  guildId: string,
  userId: string,
): Promise<void> {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  // Remove Tilted role if present
  try {
    const role = guild.roles.cache.find(r => r.name === TILTED_ROLE_NAME);
    if (role && member.roles.cache.has(role.id)) {
      await member.roles.remove(role, 'TiltCheck cooldown expired');
    }
  } catch (err) {
    console.error('[TiltedRole] Failed to remove Tilted role:', err);
  }

  // Restore original nickname
  if (originalNicknames.has(userId)) {
    const savedNick = originalNicknames.get(userId) ?? null;
    try {
      await member.setNickname(savedNick, 'TiltCheck cooldown expired — restoring nickname');
      originalNicknames.delete(userId);
    } catch (err) {
      console.error('[TiltedRole] Failed to restore nickname:', err);
    }
  }
}
