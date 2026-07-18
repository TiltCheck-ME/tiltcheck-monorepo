// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18

export type DailyBonusFeedEntry = {
  id: string;
  brand: string;
  bonus: string;
  url: string;
  verified: string;
  code: string | null;
  sources?: string[];
  bonusType?: string | null;
  bonusValue?: string | null;
  expiresAt?: string | null;
  expiryMessage?: string | null;
  imageUrl?: string | null;
  slug?: string | null;
  stale?: boolean;
};

export type DailyBonusFeedResponse = {
  updatedAt?: string;
  total?: number;
  data?: DailyBonusFeedEntry[];
  sources?: Array<{ key: string; label: string; available: boolean; count: number }>;
};

export function getDailyBonusFeedUrl(): string | null {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
  if (!apiBase) return null;
  return `${apiBase.replace(/\/$/, '')}/bonuses/daily-feed`;
}

export async function fetchDailyBonusFeed(bonusType?: string): Promise<{
  entries: DailyBonusFeedEntry[];
  available: boolean;
  updatedAt: string | null;
  sourceSummary: string;
}> {
  const base = getDailyBonusFeedUrl();
  if (!base) {
    return { entries: [], available: false, updatedAt: null, sourceSummary: 'api offline' };
  }
  const url = bonusType && bonusType !== 'all' ? `${base}?bonusType=${encodeURIComponent(bonusType)}` : base;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      return { entries: [], available: false, updatedAt: null, sourceSummary: 'daily-feed error' };
    }
    const body = (await res.json()) as DailyBonusFeedResponse;
    const entries = Array.isArray(body.data) ? body.data : [];
    const activeSources = (body.sources || [])
      .filter((s) => s.available)
      .map((s) => s.label)
      .join(' + ');
    return {
      entries,
      available: entries.length > 0,
      updatedAt: body.updatedAt ?? null,
      sourceSummary: activeSources || 'daily-feed',
    };
  } catch {
    return { entries: [], available: false, updatedAt: null, sourceSummary: 'daily-feed unreachable' };
  }
}
