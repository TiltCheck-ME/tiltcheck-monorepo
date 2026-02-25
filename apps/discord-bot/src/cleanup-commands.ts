/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Cleanup Commands Script
 *
 * Remove stale slash commands globally or for a specific guild.
 * Usage examples:
 *   # Remove ALL global commands
 *   pnpm --filter @tiltcheck/discord-bot run clear:global
 *
 *   # Remove ALL guild commands
 *   pnpm --filter @tiltcheck/discord-bot run clear:guild
 *
 *   # Remove only specific command names (global)
 *   pnpm --filter @tiltcheck/discord-bot run clear:names -- tip justthetip
 *
 * Requires DISCORD_TOKEN and CLIENT_ID; optional GUILD_ID for guild ops.
 */

import { REST, Routes, APIApplicationCommand } from 'discord.js';
import { config } from './config.js';

async function getRest() {
  if (!config.discordToken) throw new Error('DISCORD_TOKEN missing');
  if (!config.clientId) throw new Error('DISCORD_CLIENT_ID missing');
  return new REST().setToken(config.discordToken);
}

async function clearGlobal() {
  const rest = await getRest();
  console.log('[Cleanup] Clearing ALL global commands…');
  await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
  console.log('[Cleanup] Global commands cleared.');
}

async function clearGuild() {
  const rest = await getRest();
  if (!config.guildId) throw new Error('GUILD_ID not set in config for guild cleanup');
  console.log('[Cleanup] Clearing ALL guild commands for', config.guildId);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: [] });
  console.log('[Cleanup] Guild commands cleared.');
}

async function deleteByNames(names: string[], scope: 'global'|'guild'='global') {
  const rest = await getRest();
  const lower = new Set(names.map(n => n.toLowerCase()));

  if (scope === 'guild') {
    if (!config.guildId) throw new Error('GUILD_ID not set for guild scoped deletion');
    const existing = (await rest.get(
      Routes.applicationGuildCommands(config.clientId, config.guildId)
    )) as APIApplicationCommand[];

    const targets = existing.filter(c => lower.has(c.name.toLowerCase()));
    if (targets.length === 0) {
      console.log('[Cleanup] No matching guild commands found.');
      return;
    }
    for (const cmd of targets) {
      console.log(`[Cleanup] Deleting guild command /${cmd.name} (${cmd.id})`);
      await rest.delete(Routes.applicationGuildCommand(config.clientId, config.guildId, cmd.id));
    }
    console.log('[Cleanup] Done deleting selected guild commands.');
  } else {
    const existing = (await rest.get(
      Routes.applicationCommands(config.clientId)
    )) as APIApplicationCommand[];

    const targets = existing.filter(c => lower.has(c.name.toLowerCase()));
    if (targets.length === 0) {
      console.log('[Cleanup] No matching global commands found.');
      return;
    }
    for (const cmd of targets) {
      console.log(`[Cleanup] Deleting global command /${cmd.name} (${cmd.id})`);
      await rest.delete(Routes.applicationCommand(config.clientId, cmd.id));
    }
    console.log('[Cleanup] Done deleting selected global commands.');
  }
}

async function main() {
  // Simple CLI: node cleanup-commands.js [--guild] [--all | names...]
  const args = process.argv.slice(2);
  const isGuild = args.includes('--guild');
  const withoutFlags = args.filter(a => a !== '--guild');

  if (withoutFlags.length === 0) {
    console.log('Usage:');
    console.log('  tsx src/cleanup-commands.ts --all             # clear ALL global commands');
    console.log('  tsx src/cleanup-commands.ts --guild --all     # clear ALL guild commands');
    console.log('  tsx src/cleanup-commands.ts tip justthetip    # delete specific global commands by name');
    console.log('  tsx src/cleanup-commands.ts --guild tip       # delete specific guild commands by name');
    process.exit(1);
  }

  if (withoutFlags[0] === '--all') {
    if (isGuild) await clearGuild(); else await clearGlobal();
    return;
  }

  // Otherwise treat remaining args as names
  await deleteByNames(withoutFlags, isGuild ? 'guild' : 'global');
}

main().catch((err) => {
  console.error('[Cleanup] Error:', err);
  process.exit(1);
});
