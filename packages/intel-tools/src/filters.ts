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

/** Strip trailing ?, . and ! characters without a backtracking regex (ReDoS-safe). */
function stripTrailingPunctuation(value: string): string {
  let end = value.length;
  while (end > 0) {
    const ch = value[end - 1];
    if (ch !== '?' && ch !== '.' && ch !== '!') break;
    end -= 1;
  }
  return value.slice(0, end);
}

/**
 * Linear-time replacement for `/is\s+(.+?)\s+a\s+scam/i` (CodeQL polynomial ReDoS).
 * Mirrors the original's backtracking order and returns its capture (without trailing
 * whitespace), or null when the original pattern would not match.
 */
function matchIsAScam(text: string): string | null {
  const isRe = /is\s+/gi;
  const scamRe = /\sa\s+scam/gi;
  const scamAtStart = /a\s+scam/iy;
  let cached: RegExpExecArray | null = null;
  let searchedFrom = Infinity;
  let isMatch: RegExpExecArray | null;
  while ((isMatch = isRe.exec(text)) !== null) {
    const isEnd = isMatch.index + 2;
    const captureStart = isMatch.index + isMatch[0].length;

    // 1) Greedy `\s+`: capture starts at the first non-space char and ends before the
    //    first later " a scam" (lazy). It cannot cross a newline.
    const minScamIndex = captureStart + 1;
    if (minScamIndex < searchedFrom || (cached && cached.index < minScamIndex)) {
      scamRe.lastIndex = minScamIndex;
      cached = scamRe.exec(text);
      searchedFrom = minScamIndex;
    }
    if (cached && cached.index >= minScamIndex) {
      const capture = text.slice(captureStart, cached.index).trimEnd();
      if (!capture.includes('\n')) {
        return capture;
      }
    }

    // 2) Backtracked `\s+`: a whitespace-only capture inside the run when "a scam" follows it.
    const run = text.slice(isEnd, captureStart);
    scamAtStart.lastIndex = captureStart;
    if (run.length >= 3 && scamAtStart.test(text)) {
      for (let j = 1; j <= run.length - 2; j += 1) {
        if (run[j] !== '\n') return run[j];
      }
    }
  }
  return null;
}

export function extractCasinoNameCandidate(text: string): string | null {
  // Each capture must start with a non-space character so `\s+` and the capture cannot
  // overlap, and it stops at the first '?' (as the old lazy `(.+?)(?:\?|$)` did) without a
  // trailing anchor, which keeps the match linear (CodeQL polynomial ReDoS).
  const patterns = [
    /about\s+(\S[^?\n]*)/i,
    /lookup\s+(\S[^?\n]*)/i,
    /grade\s+(?:for|on)\s+(\S[^?\n]*)/i,
    /trust\s+(?:on|for)\s+(\S[^?\n]*)/i,
  ];

  const scamCapture = matchIsAScam(text);
  if (scamCapture !== null) {
    return stripTrailingPunctuation(scamCapture).trim();
  }

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return stripTrailingPunctuation(match[1]).trim();
    }
  }

  return null;
}
