// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16

export type BonusFeedSourceKey = 'collectclock' | 'email-inbox' | 'local-fallback';

export interface DailyBonusFeedEntry {
  id: string;
  brand: string;
  bonus: string;
  url: string;
  verified: string;
  code: string | null;
  sources: BonusFeedSourceKey[];
  bonusType: string | null;
  bonusValue: string | null;
  expiresAt: string | null;
  expiryMessage: string | null;
  imageUrl: string | null;
  isUsCasino: boolean;
  casinoCategory: string | null;
  trustScore: number | null;
}

export interface BonusSourceStatus {
  key: BonusFeedSourceKey;
  label: string;
  available: boolean;
  count: number;
  updatedAt: string | null;
  detail: string;
}

export interface DailyBonusFeedResponse {
  updatedAt: string;
  total: number;
  usTotal: number;
  data: DailyBonusFeedEntry[];
  sources: BonusSourceStatus[];
  suppression?: {
    active?: boolean;
    hiddenCount?: number;
  };
}

export const SOURCE_BADGE_LABELS: Record<BonusFeedSourceKey, string> = {
  collectclock: 'CollectClock',
  'email-inbox': 'Inbox',
  'local-fallback': 'Cache',
};

export function getDailyFeedApiUrl(usOnly = true): string | null {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
  if (!apiBase) return null;
  const suffix = usOnly ? '?usOnly=true' : '?usOnly=false';
  return `${apiBase.replace(/\/$/, '')}/bonuses/daily-feed${suffix}`;
}
