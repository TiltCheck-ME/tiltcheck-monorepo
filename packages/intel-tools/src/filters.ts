/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import { normalizeQuery } from './grades.js';
import type { CasinoRecord, ListFilters } from './types.js';

const SWEEPS_CATEGORIES = new Set(['Sweeps', 'Sweeps Hybrid']);

export function applyListFilters(casinos: CasinoRecord[], filters: ListFilters): CasinoRecord[] {
  let result = [...casinos];

  if (filters.geo === 'us-sweeps') {
    result = result.filter((casino) => SWEEPS_CATEGORIES.has(casino.category));
  } else if (filters.geo === 'us-crypto') {
    result = result.filter((casino) => casino.category === 'Crypto');
  }

  if (filters.category) {
    const category = filters.category.trim();
    result = result.filter(
      (casino) => casino.category.toLowerCase() === category.toLowerCase(),
    );
  }

  if (filters.query) {
    const query = normalizeQuery(filters.query);
    result = result.filter(
      (casino) =>
        casino.name.toLowerCase().includes(query) ||
        casino.category.toLowerCase().includes(query) ||
        casino.slug.includes(query.replace(/\s+/g, '-')),
    );
  }

  return result.sort((left, right) => right.score - left.score);
}

export function findCasinoByName(casinos: CasinoRecord[], name: string): CasinoRecord[] {
  const query = normalizeQuery(name);
  if (!query) {
    return [];
  }

  const exact = casinos.filter((casino) => normalizeQuery(casino.name) === query);
  if (exact.length > 0) {
    return exact;
  }

  return casinos.filter(
    (casino) =>
      normalizeQuery(casino.name).includes(query) ||
      casino.slug.includes(query.replace(/\s+/g, '-')),
  );
}

export function parseListFiltersFromText(text: string): ListFilters {
  const lower = text.toLowerCase();
  const filters: ListFilters = { geo: 'all' };

  if (/\bus\s+sweep|\bsweepstakes|\bsweeps\b/.test(lower)) {
    filters.geo = 'us-sweeps';
    filters.category = 'Sweeps';
  } else if (/\bus\s+crypto|\bcrypto casinos\b/.test(lower)) {
    filters.geo = 'us-crypto';
    filters.category = 'Crypto';
  } else if (/\bscam\b/.test(lower) && /\blist\b/.test(lower)) {
    filters.category = 'Scam';
  } else if (/\bcrypto\b/.test(lower)) {
    filters.category = 'Crypto';
  } else if (/\bsweeps\b/.test(lower)) {
    filters.category = 'Sweeps';
  } else if (/\bregulated\b/.test(lower)) {
    filters.category = 'Regulated';
  } else if (/\boffshore\b/.test(lower)) {
    filters.category = 'Offshore';
  }

  const queryMatch = lower.match(/(?:search|find|named)\s+([a-z0-9][a-z0-9\s.-]{1,40})/i);
  if (queryMatch?.[1]) {
    filters.query = queryMatch[1].trim();
  }

  return filters;
}

export function extractDomainCandidate(text: string): string | null {
  const domainMatch = text.match(
    /\b([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)\b/i,
  );
  if (!domainMatch?.[1]) {
    return null;
  }

  const domain = domainMatch[1].toLowerCase();
  if (domain.endsWith('.com') || domain.endsWith('.us') || domain.endsWith('.net') || domain.endsWith('.io')) {
    return domain.replace(/^www\./, '');
  }

  return null;
}

export function extractCasinoNameCandidate(text: string): string | null {
  const patterns = [
    /is\s+(.+?)\s+a\s+scam/i,
    /about\s+(.+?)(?:\?|$)/i,
    /lookup\s+(.+?)(?:\?|$)/i,
    /grade\s+(?:for|on)\s+(.+?)(?:\?|$)/i,
    /trust\s+(?:on|for)\s+(.+?)(?:\?|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/[?.!]+$/, '').trim();
    }
  }

  return null;
}
