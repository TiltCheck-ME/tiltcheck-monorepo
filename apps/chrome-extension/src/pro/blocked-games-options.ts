/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-20 */

/**
 * Local strategic game filter — storage schema for Pro-only self-exclusion.
 * Popup/options should write `tiltcheck_blocked_games` after explicit user opt-in.
 */

export const TILTCHECK_BLOCKED_GAMES_KEY = 'tiltcheck_blocked_games';

/** Master switch for local strategic filters (popup must set after explicit opt-in). */
export const TILTCHECK_GAME_BLOCK_OPT_IN_KEY = 'tiltcheck_game_block_opt_in';

const MAX_BLOCKED_ENTRIES = 64;
const MAX_SLUG_LENGTH = 48;

/**
 * Normalize user input to a URL/DOM-safe slug (e.g. "Plinko" → "plinko").
 */
export function normalizeBlockedGameSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug || slug.length > MAX_SLUG_LENGTH) return null;
  return slug;
}

/**
 * Sanitize a stored array into unique slugs.
 */
export function normalizeBlockedGamesList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const slug = normalizeBlockedGameSlug(item);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= MAX_BLOCKED_ENTRIES) break;
  }
  return out;
}

export async function loadBlockedGameSlugs(): Promise<string[]> {
  try {
    const stored = await chrome.storage.local.get(TILTCHECK_BLOCKED_GAMES_KEY);
    return normalizeBlockedGamesList(stored[TILTCHECK_BLOCKED_GAMES_KEY]);
  } catch {
    return [];
  }
}

export async function loadGameBlockOptIn(): Promise<boolean> {
  try {
    const stored = await chrome.storage.local.get(TILTCHECK_GAME_BLOCK_OPT_IN_KEY);
    return stored[TILTCHECK_GAME_BLOCK_OPT_IN_KEY] === true;
  } catch {
    return false;
  }
}
