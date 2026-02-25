/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Command Loader
 *
 * Dynamically discovers and loads all command modules from the commands/
 * directory using fs.readdir + dynamic import(). Each module must export:
 *   - `data`    – a SlashCommandBuilder (or compatible) instance
 *   - `execute` – a ChatInputCommandInteraction handler
 *
 * Also exports `registerCommands` which deploys the loaded commands to
 * Discord via the REST API (guild-scoped when guildId is provided, or
 * globally otherwise).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Collection, REST, Routes } from 'discord.js';
import type { Command } from '../types.js';

// ---------------------------------------------------------------------------
// Resolve the commands directory at runtime.
// import.meta.url is used here because this file lives inside commands/
// and we need to walk the same directory.
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reads every .ts / .js file in the commands directory (excluding this
 * loader itself and the barrel index), attempts to import each one, and
 * registers any module that exposes a valid `data` + `execute` pair.
 *
 * @returns A discord.js Collection keyed by command name.
 */
export async function loadCommands(): Promise<Collection<string, Command>> {
  const collection = new Collection<string, Command>();

  // Files we must skip to avoid circular imports or non-command modules
  const SKIP_FILES = new Set(['loader.ts', 'loader.js', 'index.ts', 'index.js']);

  let entries: string[];
  try {
    entries = await fs.promises.readdir(__dirname);
  } catch (err) {
    console.error('[CommandLoader] Failed to read commands directory:', err);
    return collection;
  }

  const commandFiles = entries.filter((file) => {
    if (SKIP_FILES.has(file)) return false;
    return file.endsWith('.ts') || file.endsWith('.js');
  });

  const results = await Promise.allSettled(
    commandFiles.map(async (file) => {
      const filePath = path.join(__dirname, file);
      // pathToFileURL ensures compatibility on Windows and with ESM loaders
      const fileUrl = pathToFileURL(filePath).href;

      let mod: Record<string, unknown>;
      try {
        mod = await import(fileUrl);
      } catch (importErr) {
        console.warn(`[CommandLoader] Could not import ${file}:`, importErr);
        return;
      }

      // A command module may export the command directly as named export
      // (e.g. `export const ping`) or as a default export.
      // We check every exported value for the required shape.
      const candidates = Object.values(mod);

      for (const candidate of candidates) {
        if (isCommand(candidate)) {
          const name: string = (candidate.data as { name: string }).name;
          if (collection.has(name)) {
            console.warn(
              `[CommandLoader] Duplicate command name "${name}" in ${file} – skipping`
            );
            continue;
          }
          collection.set(name, candidate);
          console.log(`  [CommandLoader] Loaded /${name} from ${file}`);
        }
      }
    })
  );

  // Surface any unexpected rejections from the allSettled batch
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[CommandLoader] Unexpected error while loading a command file:', result.reason);
    }
  }

  console.log(`[CommandLoader] ${collection.size} command(s) discovered.`);
  return collection;
}

/**
 * Deploys the provided commands to Discord via the REST API.
 *
 * - When `guildId` is supplied the commands are registered to that guild
 *   immediately (useful for development / staging).
 * - When `guildId` is omitted commands are registered globally (can take
 *   up to one hour to propagate).
 *
 * @param clientId - Discord application / client ID
 * @param guildId  - Optional guild ID for scoped (faster) deployment
 * @param token    - Bot token used to authenticate the REST call
 * @param commands - Collection returned by `loadCommands()`. When omitted
 *                   the loader will auto-discover commands before deploying.
 */
export async function registerCommands(
  clientId: string,
  guildId: string | undefined,
  token: string,
  commands?: Collection<string, Command>
): Promise<void> {
  const cmdCollection = commands ?? (await loadCommands());

  if (cmdCollection.size === 0) {
    console.warn('[CommandLoader] No commands found – skipping deployment.');
    return;
  }

  const body = Array.from(cmdCollection.values()).map((cmd) => cmd.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (guildId) {
      console.log(`[CommandLoader] Deploying ${body.length} command(s) to guild ${guildId}…`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
      console.log('[CommandLoader] Guild commands deployed successfully.');
    } else {
      console.log(`[CommandLoader] Deploying ${body.length} command(s) globally…`);
      await rest.put(Routes.applicationCommands(clientId), { body });
      console.log('[CommandLoader] Global commands deployed successfully.');
    }

    for (const [name] of cmdCollection) {
      console.log(`  /${name}`);
    }
  } catch (err) {
    console.error('[CommandLoader] Failed to register commands with Discord:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Type guard – returns true when `value` looks like a valid Command object.
 */
function isCommand(value: unknown): value is Command {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    'data' in v &&
    typeof v['data'] === 'object' &&
    v['data'] !== null &&
    'name' in (v['data'] as object) &&
    typeof (v['data'] as Record<string, unknown>)['name'] === 'string' &&
    'execute' in v &&
    typeof v['execute'] === 'function'
  );
}
