import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { readdirSync, statSync, writeFileSync, mkdirSync, realpathSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire(import.meta.url);

/**
 * Validates and sanitizes a directory path to prevent path traversal attacks.
 * @param dirPath - The directory path to validate
 * @returns The validated absolute path
 * @throws Error if the path is invalid or doesn't exist
 */
function validateDirectoryPath(dirPath: string): string {
  if (!dirPath || typeof dirPath !== 'string') {
    throw new Error('Invalid commandsDir: path must be a non-empty string');
  }
  
  // Resolve to absolute path
  const absolutePath = path.resolve(dirPath);
  
  // Resolve symlinks - handle errors separately for better error messages
  let realPath: string;
  try {
    realPath = realpathSync(absolutePath);
  } catch (err) {
    throw new Error(`Invalid commandsDir: unable to resolve path ${dirPath} - ${err instanceof Error ? err.message : String(err)}`);
  }
  
  // Verify it's a directory
  try {
    if (!statSync(realPath).isDirectory()) {
      throw new Error(`Invalid commandsDir: ${dirPath} is not a directory`);
    }
  } catch (err) {
    throw new Error(`Invalid commandsDir: cannot access ${dirPath} - ${err instanceof Error ? err.message : String(err)}`);
  }
  
  return realPath;
}

/**
 * Validates that a file path is within the allowed base directory.
 * @param filePath - The file path to validate
 * @param baseDir - The base directory that the file must be within
 * @returns True if the file is within the base directory
 */
function isPathWithinBase(filePath: string, baseDir: string): boolean {
  try {
    // Resolve symlinks to prevent symlink-based directory traversal
    const resolvedFile = realpathSync(filePath);
    const resolvedBase = realpathSync(baseDir);
    const relative = path.relative(resolvedBase, resolvedFile);
    
    // Allow files in the base directory (empty string) or subdirectories (no '..' or absolute paths)
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  } catch {
    return false;
  }
}

export interface DeployOptions {
  token: string;
  clientId: string;
  guildId?: string;
  commandsDir: string;
  dryRun?: boolean;
  removeName?: string;
  artifactDir?: string;
}

export interface DiffResult {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export function discoverCommands(commandsDir: string): any[] {
  // Validate and sanitize the commands directory path
  const validatedDir = validateDirectoryPath(commandsDir);
  
  // Legacy synchronous discovery (prefers built JS). Falls back to async variant if empty.
  const entries = readdirSync(validatedDir);
  const commands: any[] = [];
  for (const file of entries) {
    const full = path.join(validatedDir, file);
    
    // Security: Ensure the file is within the commands directory
    if (!isPathWithinBase(full, validatedDir)) {
      console.warn(`[Security] Skipping file outside commands directory:`, path.basename(file));
      continue;
    }
    
    if (statSync(full).isDirectory()) continue;
    if (!full.endsWith('.js')) continue; // only pick js here
    try {
       
      const mod = req(full);
      const candidate = mod.default || mod.command || mod;
      if (candidate && candidate.data instanceof SlashCommandBuilder) {
        commands.push(candidate.data.toJSON());
      } else if (candidate?.data) {
        commands.push(candidate.data);
      }
    } catch {
      // ignore require failures
    }
  }
  return commands;
}

export async function discoverCommandsAsync(commandsDir: string): Promise<any[]> {
  // Validate and sanitize the commands directory path
  const validatedDir = validateDirectoryPath(commandsDir);
  
  const entries = readdirSync(validatedDir);
  const commands: any[] = [];
  for (const file of entries) {
    const full = path.join(validatedDir, file);
    
    // Security: Ensure the file is within the commands directory
    if (!isPathWithinBase(full, validatedDir)) {
      console.warn(`[Security] Skipping file outside commands directory:`, path.basename(file));
      continue;
    }
    
    if (statSync(full).isDirectory()) continue;
    if (!/(\.ts|\.js)$/.test(full)) continue;
    try {
      const mod = await import(full);
      for (const key of Object.keys(mod)) {
        const candidate: any = (mod as any)[key];
        if (!candidate) continue;
        const data = candidate.data;
        if (data instanceof SlashCommandBuilder) {
          commands.push(data.toJSON());
        } else if (data && data.name && data.description) {
          // assume already JSON
          commands.push(data);
        }
      }
    } catch {
      // Attempt require fallback for js
      if (full.endsWith('.js')) {
        try {
           
          const mod = req(full);
          const candidate = mod.default || mod.command || mod;
          if (candidate?.data instanceof SlashCommandBuilder) {
            commands.push(candidate.data.toJSON());
          } else if (candidate?.data) {
            commands.push(candidate.data);
          }
        } catch {
          // swallow
        }
      }
    }
  }
  return commands;
}

export async function fetchExisting(rest: REST, clientId: string, guildId?: string) {
  try {
    if (guildId) {
      return await rest.get(Routes.applicationGuildCommands(clientId, guildId)) as any[];
    }
    return await rest.get(Routes.applicationCommands(clientId)) as any[];
  } catch {
    return [];
  }
}

export function diffCommands(existing: any[], next: any[]): DiffResult {
  const existingNames = new Set(existing.map(c => c.name));
  const nextNames = new Set(next.map(c => c.name));
  const added = [...nextNames].filter(n => !existingNames.has(n));
  const removed = [...existingNames].filter(n => !nextNames.has(n));
  const unchanged = [...nextNames].filter(n => existingNames.has(n));
  return { added, removed, unchanged };
}

export function writeArtifact(dir: string, scope: 'guild' | 'global', guildId: string | null, diff: DiffResult, commands: any[]) {
  mkdirSync(dir, { recursive: true });
  const outFile = path.join(dir, 'last-command-sync.json');
  writeFileSync(outFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    scope,
    guildId,
    added: diff.added,
    removed: diff.removed,
    unchanged: diff.unchanged,
    total: commands.length,
    commands: commands.map(c => ({ name: c.name, description: c.description }))
  }, null, 2));
  return outFile;
}

export async function deployCommands(options: DeployOptions) {
  const {
    token, clientId, guildId, commandsDir,
    dryRun, removeName, artifactDir = path.join(process.cwd(), 'data')
  } = options;

  const rest = new REST({ version: '10' }).setToken(token);
  let discovered = discoverCommands(commandsDir);
  if (removeName) {
    discovered = discovered.filter(c => c.name !== removeName);
  }
  if (discovered.length === 0) {
    throw new Error('Zero commands discovered after processing; aborting to prevent wipe');
  }
  const existing = await fetchExisting(rest, clientId, guildId);
  const diff = diffCommands(existing, discovered);
  if (dryRun) {
    return { diff, dryRun: true, artifact: null, total: discovered.length };
  }
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: discovered });
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: discovered });
  }
  const artifact = writeArtifact(artifactDir, guildId ? 'guild' : 'global', guildId || null, diff, discovered);
  return { diff, dryRun: false, artifact, total: discovered.length };
}
