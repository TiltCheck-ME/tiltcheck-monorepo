/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');

export type FeedAvailability = 'available' | 'empty' | 'unavailable';

export interface DomainBlacklistSnapshot {
  availability: FeedAvailability;
  domains: string[];
  source: string | null;
}

export async function loadDomainBlacklist(): Promise<DomainBlacklistSnapshot> {
  const snapshot = await readStringArrayDataFile('domain_blacklist.json');
  if (!snapshot.available) {
    return {
      availability: 'unavailable',
      domains: [],
      source: null,
    };
  }

  return {
    availability: snapshot.items.length > 0 ? 'available' : 'empty',
    domains: snapshot.items,
    source: 'domain_blacklist.json',
  };
}

async function readStringArrayDataFile(fileName: string): Promise<{
  available: boolean;
  items: string[];
}> {
  const candidates = getDataFileCandidates(fileName);

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== 'string')) {
        throw new Error(`${fileName} must contain a JSON array of strings`);
      }

      const items = Array.from(
        new Set(
          parsed
            .map((entry) => entry.trim().toLowerCase())
            .filter((entry) => entry.length > 0)
        )
      );

      return { available: true, items };
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        continue;
      }

      throw error;
    }
  }

  return {
    available: false,
    items: [],
  };
}

function getDataFileCandidates(fileName: string): string[] {
  const candidates = [
    process.env.STATS_DATA_DIR ? path.resolve(process.env.STATS_DATA_DIR, fileName) : null,
    path.resolve(process.cwd(), 'data', fileName),
    path.resolve(API_DATA_DIR, fileName),
  ].filter((candidate): candidate is string => typeof candidate === 'string');

  return Array.from(new Set(candidates));
}
