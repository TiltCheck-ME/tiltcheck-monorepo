// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-27

import { getActiveEmailBonusEntries, readEmailBonusFeed } from './email-bonus-feed.js';
import { applyBonusListOptions, parseBonusListQuery, type BonusSortMode } from './bonus-urgency.js';
import type { ForbiddenGamesProfile } from '@tiltcheck/types';
import { suppressBonusEntries } from '../services/bonus-suppression.js';

export function buildInboxBonusResponse(
  query: Record<string, unknown>,
  profile: ForbiddenGamesProfile | null,
): {
  source: 'email-inbox';
  available: boolean;
  updatedAt: string | null;
  total: number;
  limit: number;
  sort: BonusSortMode;
  data: ReturnType<typeof applyBonusListOptions>;
  message?: string;
  suppression: { active: boolean; hiddenCount: number };
} {
  const { limit, sort } = parseBonusListQuery({ ...query, source: 'inbox' });
  const feed = readEmailBonusFeed();
  const activeBonuses = getActiveEmailBonusEntries();
  const suppression = suppressBonusEntries(activeBonuses, profile);
  const data = applyBonusListOptions(suppression.entries, { limit, sort });
  const message = data.length === 0
    ? suppression.hiddenCount > 0 && suppression.active
      ? 'Inbox bonus feed is live, but your active filters suppressed every matching casino bonus.'
      : 'Inbox bonus feed is empty or no active email bonuses are available.'
    : undefined;

  return {
    source: 'email-inbox',
    available: data.length > 0,
    updatedAt: feed.updatedAt,
    total: data.length,
    limit,
    sort,
    data,
    ...(message ? { message } : {}),
    suppression: {
      active: suppression.active,
      hiddenCount: suppression.hiddenCount,
    },
  };
}
