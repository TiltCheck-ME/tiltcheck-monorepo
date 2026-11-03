/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

import {
  GAME_EXCLUSION_CATEGORIES,
  GAME_EXCLUSION_CATEGORY_LABELS,
  type GameCategory,
} from '@tiltcheck/types';

export { GAME_EXCLUSION_CATEGORIES, GAME_EXCLUSION_CATEGORY_LABELS };
export type { GameCategory };

/** Keywords matched against URL, iframe src, and lobby card text. User config picks the category. */
export const CATEGORY_KEYWORDS: Record<GameCategory, string[]> = {
  chicken_mines: ['chicken', 'mines', 'minefield', 'chicken-road', 'chickenroad'],
  bonus_buy: ['bonus-buy', 'bonusbuy', 'feature-buy', 'featurebuy'],
  live_dealer: ['live-dealer', 'live-casino', 'live_dealer', 'livecasino'],
  slots: ['slot', 'slots'],
  crash: ['crash', 'aviator', 'jetx', 'spaceman'],
  table_games: ['blackjack', 'roulette', 'baccarat', 'poker', 'table'],
};

export type ExclusionHit = {
  kind: 'slug' | 'category';
  value: string;
};

export function matchExclusion(
  haystack: string,
  slugs: readonly string[],
  categories: readonly GameCategory[],
): ExclusionHit | null {
  const lower = haystack.toLowerCase();
  if (!lower.trim()) return null;

  for (const category of categories) {
    const keywords = CATEGORY_KEYWORDS[category] ?? [];
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return { kind: 'category', value: category };
    }
  }

  for (const slug of slugs) {
    const needle = slug.trim().toLowerCase();
    if (needle.length >= 2 && lower.includes(needle)) {
      return { kind: 'slug', value: slug };
    }
  }

  return null;
}

export function haystackFromLocation(loc: { pathname: string; search: string; href?: string }): string {
  return `${loc.pathname}${loc.search}${loc.href ?? ''}`.toLowerCase();
}

export function haystackFromElement(el: Element): string {
  const card = el.closest('a, button, [role="button"], [data-game-id], [data-game-name], [data-game], article, li');
  const node = card ?? el;
  return [
    node.getAttribute('href'),
    node.getAttribute('src'),
    node.getAttribute('data-game-id'),
    node.getAttribute('data-game-name'),
    node.getAttribute('data-game'),
    node.getAttribute('data-testid'),
    node.textContent,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
