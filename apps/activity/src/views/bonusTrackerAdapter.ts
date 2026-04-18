// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import type { BonusItem } from '../state/SessionState.js';
import { formatDuration } from '../utils/math.js';

const API_BASE = (import.meta.env.VITE_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');
const MAX_TRACKER_CARDS = 6;

type FetchLike = typeof fetch;

interface TrackerFeedEntry {
  brand: string;
  bonus: string;
  url: string;
  verified?: string | null;
  code?: string | null;
}

interface TrackerFeedResponse {
  data?: TrackerFeedEntry[];
  available?: boolean;
  updatedAt?: string | null;
}

export type BonusCardStatus = 'ready' | 'cooldown' | 'expired' | 'tracker';
export type BonusPillTone = 'good' | 'neutral' | 'warn';
export type BonusSourceMode = 'live' | 'tracker' | 'fallback';

export interface BonusSourceStatus {
  key: 'live' | 'collectclock' | 'inbox';
  label: string;
  mode: BonusSourceMode;
  detail: string;
}

export interface ActivityBonusCard {
  key: string;
  casinoName: string;
  description: string;
  status: BonusCardStatus;
  statusLabel: string;
  timerLabel: string;
  sourceLabel: string;
  trustLabel: string;
  trustTone: BonusPillTone;
  safetyLabel: string;
  safetyTone: BonusPillTone;
  code: string | null;
  updatedLabel: string | null;
  claimUrl: string | null;
}

export interface ActivityBonusSnapshot {
  cards: ActivityBonusCard[];
  sources: BonusSourceStatus[];
  summary: {
    total: number;
    ready: number;
    cooling: number;
    tracker: number;
  };
  fallbackTitle: string | null;
  fallbackCopy: string | null;
}

export interface RemoteTrackerSnapshot {
  collectClockEntries: TrackerFeedEntry[];
  inboxEntries: TrackerFeedEntry[];
  sources: BonusSourceStatus[];
}

export interface LiveBonusFetchResult {
  items: BonusItem[];
  source: BonusSourceStatus;
}

function buildLiveSafetyState(
  item: BonusItem,
  status: BonusCardStatus,
): Pick<ActivityBonusCard, 'safetyLabel' | 'safetyTone'> {
  if (item.is_expired) {
    return {
      safetyLabel: 'Skip stale promo',
      safetyTone: 'warn',
    };
  }

  if (!item.is_verified) {
    return {
      safetyLabel: status === 'cooldown' ? 'Cooldown first, verify second' : 'Scam check before claim',
      safetyTone: 'warn',
    };
  }

  if (status === 'cooldown') {
    return {
      safetyLabel: 'Cooldown live',
      safetyTone: 'neutral',
    };
  }

  return {
    safetyLabel: 'Cash clean, then cool off',
    safetyTone: 'good',
  };
}

function buildTrackerSafetyState(
  secureUrl: boolean,
  verifiedLabel: string | null,
): Pick<ActivityBonusCard, 'safetyLabel' | 'safetyTone'> {
  if (!secureUrl) {
    return {
      safetyLabel: 'Scam check first',
      safetyTone: 'warn',
    };
  }

  if (verifiedLabel) {
    return {
      safetyLabel: 'Clean link, one hit max',
      safetyTone: 'good',
    };
  }

  return {
    safetyLabel: 'Verify source before click',
    safetyTone: 'warn',
  };
}

function normalizeTrackerEntries(value: unknown): TrackerFeedEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is TrackerFeedEntry => {
      if (!entry || typeof entry !== 'object') {
        return false;
      }

      const candidate = entry as Partial<TrackerFeedEntry>;
      return typeof candidate.brand === 'string'
        && typeof candidate.bonus === 'string'
        && typeof candidate.url === 'string';
    })
    .map((entry) => ({
      brand: entry.brand.trim(),
      bonus: entry.bonus.trim(),
      url: entry.url.trim(),
      verified: entry.verified ?? null,
      code: entry.code ?? null,
    }));
}

function normalizeLiveItems(value: unknown): BonusItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is BonusItem => {
      if (!entry || typeof entry !== 'object') {
        return false;
      }

      const candidate = entry as Partial<BonusItem>;
      return typeof candidate.id === 'string'
        && typeof candidate.casinoName === 'string'
        && typeof candidate.description === 'string';
    })
    .map((entry) => ({
      id: entry.id,
      casinoName: entry.casinoName.trim(),
      description: entry.description.trim(),
      nextClaimAt: entry.nextClaimAt ?? null,
      is_expired: Boolean(entry.is_expired),
      is_verified: Boolean(entry.is_verified),
    }));
}

function createSourceStatus(
  key: BonusSourceStatus['key'],
  label: string,
  mode: BonusSourceMode,
  detail: string,
): BonusSourceStatus {
  return { key, label, mode, detail };
}

function formatShortDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function isSecureClaimUrl(url: string | null): boolean {
  if (!url) {
    return false;
  }

  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function buildLiveCard(item: BonusItem): ActivityBonusCard {
  const nextClaimAtMs = item.nextClaimAt ? Date.parse(item.nextClaimAt) : Number.NaN;
  const hasValidNextClaim = Number.isFinite(nextClaimAtMs);
  const remainingMs = hasValidNextClaim ? nextClaimAtMs - Date.now() : null;

  let status: BonusCardStatus = 'ready';
  let statusLabel = 'Ready';
  let timerLabel = 'Ready now';

  if (item.is_expired) {
    status = 'expired';
    statusLabel = 'Expired';
    timerLabel = 'Refresh pending';
  } else if (hasValidNextClaim && remainingMs !== null && remainingMs > 0) {
    status = 'cooldown';
    statusLabel = 'Cooling down';
    timerLabel = formatDuration(remainingMs);
  }

  const safetyState = buildLiveSafetyState(item, status);

  return {
    key: `live:${item.id}`,
    casinoName: item.casinoName,
    description: item.description,
    status,
    statusLabel,
    timerLabel,
    sourceLabel: 'Live tracker',
    trustLabel: item.is_verified ? 'Verified feed' : 'Unverified feed',
    trustTone: item.is_verified ? 'good' : 'warn',
    safetyLabel: safetyState.safetyLabel,
    safetyTone: safetyState.safetyTone,
    code: null,
    updatedLabel: hasValidNextClaim ? formatShortDate(new Date(nextClaimAtMs).toISOString()) : null,
    claimUrl: null,
  };
}

function buildTrackerCard(entry: TrackerFeedEntry, sourceLabel: string): ActivityBonusCard {
  const verifiedLabel = formatShortDate(entry.verified);
  const secureUrl = isSecureClaimUrl(entry.url);
  const safetyState = buildTrackerSafetyState(secureUrl, verifiedLabel);

  return {
    key: `tracker:${sourceLabel}:${entry.brand}:${entry.url}`,
    casinoName: entry.brand,
    description: entry.bonus,
    status: 'tracker',
    statusLabel: 'Tracker only',
    timerLabel: 'Manual timing',
    sourceLabel,
    trustLabel: verifiedLabel ? `Verified ${verifiedLabel}` : `${sourceLabel} source`,
    trustTone: verifiedLabel ? 'good' : 'neutral',
    safetyLabel: safetyState.safetyLabel,
    safetyTone: safetyState.safetyTone,
    code: entry.code ?? null,
    updatedLabel: verifiedLabel,
    claimUrl: secureUrl ? entry.url : null,
  };
}

function buildDedupedCards(liveItems: readonly BonusItem[], remoteSnapshot: RemoteTrackerSnapshot): ActivityBonusCard[] {
  const liveCards = liveItems.map((item) => buildLiveCard(item));
  const trackerCards = [
    ...remoteSnapshot.inboxEntries.map((entry) => buildTrackerCard(entry, 'Inbox intel')),
    ...remoteSnapshot.collectClockEntries.map((entry) => buildTrackerCard(entry, 'CollectClock')),
  ];

  const deduped = new Map<string, ActivityBonusCard>();

  for (const card of [...liveCards, ...trackerCards]) {
    const normalizedKey = `${card.casinoName.trim().toLowerCase()}::${card.description.trim().toLowerCase()}`;
    if (!deduped.has(normalizedKey)) {
      deduped.set(normalizedKey, card);
    }
  }

  return [...deduped.values()].slice(0, MAX_TRACKER_CARDS);
}

async function fetchTrackerFeed(
  url: string,
  fetchFn: FetchLike,
  sourceKey: BonusSourceStatus['key'],
  sourceLabel: string,
  emptyDetail: string,
): Promise<{ entries: TrackerFeedEntry[]; source: BonusSourceStatus }> {
  try {
    const response = await fetchFn(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        entries: [],
        source: createSourceStatus(sourceKey, sourceLabel, 'fallback', `${sourceLabel} unavailable`),
      };
    }

    const data = await response.json() as TrackerFeedResponse | TrackerFeedEntry[];
    const entries = Array.isArray(data)
      ? normalizeTrackerEntries(data)
      : normalizeTrackerEntries(data.data);

    return {
      entries,
      source: createSourceStatus(
        sourceKey,
        sourceLabel,
        entries.length > 0 ? 'tracker' : 'fallback',
        entries.length > 0 ? `${entries.length} tracker cards ready` : emptyDetail,
      ),
    };
  } catch {
    return {
      entries: [],
      source: createSourceStatus(sourceKey, sourceLabel, 'fallback', `${sourceLabel} unreachable`),
    };
  }
}

export async function fetchRemoteTrackerSnapshot(fetchFn: FetchLike = fetch): Promise<RemoteTrackerSnapshot> {
  const [collectClockResult, inboxResult] = await Promise.all([
    fetchTrackerFeed(`${API_BASE}/bonuses`, fetchFn, 'collectclock', 'CollectClock', 'No tracker feed'),
    fetchTrackerFeed(`${API_BASE}/bonuses/inbox`, fetchFn, 'inbox', 'Inbox intel', 'No inbox cards'),
  ]);

  return {
    collectClockEntries: collectClockResult.entries,
    inboxEntries: inboxResult.entries,
    sources: [collectClockResult.source, inboxResult.source],
  };
}

export async function fetchLiveBonusFeed(userId: string, fetchFn: FetchLike = fetch): Promise<LiveBonusFetchResult> {
  const endpoints = [
    `/api/user/${encodeURIComponent(userId)}/bonuses`,
    `${API_BASE}/user/${encodeURIComponent(userId)}/bonuses`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetchFn(endpoint, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json() as { active?: BonusItem[] } | BonusItem[];
      const items = Array.isArray(data)
        ? normalizeLiveItems(data)
        : normalizeLiveItems(data.active);

      if (items.length > 0) {
        return {
          items,
          source: createSourceStatus('live', 'Live tracker', 'live', `${items.length} personal timers loaded`),
        };
      }
    } catch {
      continue;
    }
  }

  return {
    items: [],
    source: createSourceStatus('live', 'Live tracker', 'fallback', 'No personal timer feed'),
  };
}

export function buildActivityBonusSnapshot(
  liveItems: readonly BonusItem[],
  remoteSnapshot: RemoteTrackerSnapshot,
  liveSource: BonusSourceStatus,
): ActivityBonusSnapshot {
  const cards = buildDedupedCards(liveItems, remoteSnapshot);
  const summary = cards.reduce(
    (totals, card) => {
      totals.total += 1;
      if (card.status === 'ready') {
        totals.ready += 1;
      } else if (card.status === 'cooldown') {
        totals.cooling += 1;
      } else if (card.status === 'tracker') {
        totals.tracker += 1;
      }
      return totals;
    },
    { total: 0, ready: 0, cooling: 0, tracker: 0 },
  );

  const resolvedLiveSource = liveItems.length > 0
    ? createSourceStatus('live', 'Live tracker', 'live', `${liveItems.length} personal timers loaded`)
    : liveSource;

  const hasData = cards.length > 0;

  return {
    cards,
    sources: [resolvedLiveSource, ...remoteSnapshot.sources],
    summary,
    fallbackTitle: hasData ? null : 'Tracker fallback',
    fallbackCopy: hasData
      ? null
      : 'No live bonus timers are wired into this room yet. The lane stays safe with placeholder structure until a future adapter lands.',
  };
}
