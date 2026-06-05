/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import {
  extractCasinoNameCandidate,
  extractDomainCandidate,
  parseListFiltersFromText,
} from '@tiltcheck/intel-tools';
import type { ListFilters } from '@tiltcheck/intel-tools';
import type { RoutedIntent } from './types.js';

function buildListTitle(filters: ListFilters): string {
  if (filters.geo === 'us-crypto') {
    return 'US crypto casinos';
  }
  if (filters.geo === 'us-sweeps') {
    return 'US sweeps casinos';
  }
  if (filters.category) {
    return `${filters.category} casinos`;
  }
  return 'Tracked casinos';
}

export function routeIntelIntent(message: string): RoutedIntent {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return { kind: 'unknown' };
  }

  if (/\b(my bonus|reload|re-up|collectclock)\b/.test(lower)) {
    return { kind: 'personal', topic: 'bonus' };
  }
  if (/\b(my session|session stats|rtp|how am i doing)\b/.test(lower)) {
    return { kind: 'personal', topic: 'session' };
  }
  if (/\b(vault|lockvault|should i vault)\b/.test(lower)) {
    return { kind: 'personal', topic: 'vault' };
  }

  if (/\b(how (?:do|are) grades|grading methodology|trust score work)\b/.test(lower)) {
    return { kind: 'methodology' };
  }

  const domain = extractDomainCandidate(trimmed);
  if (domain && (/\b(check|scan|verify|domain)\b/.test(lower) || domain.includes('.'))) {
    return { kind: 'domain', domain };
  }

  if (/\blist\b/.test(lower) || /\bshow me\b/.test(lower) || /\bcasinos\b/.test(lower)) {
    const filters = parseListFiltersFromText(trimmed);
    if (filters.category || filters.geo !== 'all' || /\bcasinos\b/.test(lower)) {
      return { kind: 'list', filters, title: buildListTitle(filters) };
    }
  }

  const scamCheck = /\bscam\b|\bskem\b|\bsus\b|\blegit\b|\bsafe\b/.test(lower);
  const name = extractCasinoNameCandidate(trimmed);
  if (name) {
    return { kind: 'lookup', name, checkScam: scamCheck };
  }

  if (scamCheck) {
    const fallbackName = trimmed
      .replace(/is\s+/i, '')
      .replace(/\s+a\s+scam.*/i, '')
      .replace(/[?.!]+$/, '')
      .trim();
    if (fallbackName.length >= 2) {
      return { kind: 'lookup', name: fallbackName, checkScam: true };
    }
  }

  if (domain) {
    return { kind: 'domain', domain };
  }

  return { kind: 'unknown' };
}
