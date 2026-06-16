// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-16
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  SOURCE_BADGE_LABELS,
  type BonusFeedSourceKey,
  type BonusSourceStatus,
  type DailyBonusFeedEntry,
  type DailyBonusFeedResponse,
} from '@/lib/daily-bonus-feed';
import { findLiveTrustScore, type LiveTrustScore } from '@/lib/casino-trust';

interface DailyBonusFeedProps {
  initialFeed: DailyBonusFeedResponse;
  usOnlyDefault?: boolean;
}

type SourceFilter = 'all' | BonusFeedSourceKey;

function formatShortDate(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return 'Unknown';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function SourceBadge({ source }: { source: BonusFeedSourceKey }) {
  const tone = source === 'email-inbox'
    ? 'text-[#ffd700] border-[#ffd700]/40'
    : source === 'collectclock'
      ? 'text-[#17c3b2] border-[#17c3b2]/40'
      : 'text-[#8a97a8] border-[#8a97a8]/40';

  return (
    <span className={`text-[10px] font-mono font-bold uppercase tracking-widest border px-2 py-0.5 ${tone}`}>
      [{SOURCE_BADGE_LABELS[source]}]
    </span>
  );
}

function SourceStatusBar({ sources }: { sources: readonly BonusSourceStatus[] }) {
  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-3">
      {sources.map((source) => (
        <div
          key={source.key}
          className={`public-page-card px-4 py-3 ${source.available ? 'public-page-card--accent' : ''}`}
        >
          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-gray-500">
            {source.label}
          </p>
          <p className="mt-1 text-sm font-mono text-white">
            {source.available ? `${source.count} live` : 'offline'}
          </p>
          <p className="mt-1 text-[11px] font-mono text-[#8a97a8]">{source.detail}</p>
        </div>
      ))}
    </div>
  );
}

function BonusCard({
  entry,
  trustScore,
}: {
  entry: DailyBonusFeedEntry;
  trustScore: LiveTrustScore | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!entry.code) return;
    navigator.clipboard.writeText(entry.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [entry.code]);

  const trustLabel = trustScore
    ? `TRUST ${Math.round(trustScore.currentScore)}`
    : 'TRUST PENDING';

  const expiryLabel = entry.expiresAt
    ? `EXPIRES ${formatShortDate(entry.expiresAt)}`
    : entry.expiryMessage && entry.expiryMessage !== 'Expiry not stated in email'
      ? entry.expiryMessage.toUpperCase()
      : null;

  return (
    <div
      className="group relative flex flex-col justify-between p-6 border border-[#283347] bg-gradient-to-br from-[#0E0E0F] to-[#0a0c10] transition-all duration-300 hover:border-[#17c3b2] hover:shadow-[0_0_20px_rgba(23,195,178,0.15)]"
      style={{ minHeight: '280px' }}
    >
      <div className="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-widest text-[#17c3b2]/70 border border-[#17c3b2]/20 px-2 py-1">
        [{trustLabel}]
      </div>

      <div className="flex-1 mt-2">
        <div className="flex gap-2 mb-3 flex-wrap pr-24">
          {entry.sources.map((source) => (
            <SourceBadge key={source} source={source} />
          ))}
          {entry.code && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#ffd700] border border-[#ffd700]/40 px-2 py-0.5">
              [HAS CODE]
            </span>
          )}
          {entry.isUsCasino && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#17c3b2] border border-[#17c3b2]/30 px-2 py-0.5">
              [US]
            </span>
          )}
        </div>

        {entry.imageUrl && (
          <div className="mb-4 overflow-hidden border border-[#283347] bg-[#080a0d]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.imageUrl}
              alt={`${entry.brand} promo`}
              className="h-28 w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2 leading-tight">
          {entry.brand}
        </h3>

        {entry.bonusType && (
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#8a97a8] mb-2">
            {entry.bonusType}
            {entry.bonusValue ? ` · ${entry.bonusValue}` : ''}
          </p>
        )}

        <p className="text-[#c4ced8] text-sm font-mono leading-relaxed mb-4">
          {entry.bonus}
        </p>

        {entry.code && (
          <div className="flex items-center gap-2 mb-4 p-2 border border-[#ffd700]/20 bg-[#ffd700]/5">
            <span className="text-xs font-mono uppercase tracking-widest text-[#8a97a8]">CODE:</span>
            <span className="text-[#ffd700] font-mono font-bold tracking-widest flex-1">
              {entry.code}
            </span>
            <button
              onClick={handleCopy}
              className="text-[10px] font-mono font-bold uppercase tracking-widest border px-2 py-1 transition-all duration-200"
              style={{
                borderColor: copied ? 'var(--color-positive)' : 'rgba(255,215,0,0.4)',
                color: copied ? 'var(--color-positive)' : '#ffd700',
              }}
              aria-label={`Copy promo code for ${entry.brand}`}
            >
              {copied ? '[COPIED]' : '[COPY]'}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-4 border-t border-[#283347]">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary text-center text-xs font-black tracking-widest"
          aria-label={`Claim bonus at ${entry.brand}`}
        >
          CLAIM BONUS
        </a>
        <div className="flex justify-between items-center pt-1 gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#4B5563]">
            LAST VERIFIED:
          </span>
          <span className="text-[10px] font-mono text-[#8a97a8]">{formatShortDate(entry.verified)}</span>
        </div>
        {expiryLabel && (
          <div className="flex justify-between items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#4B5563]">
              EXPIRY:
            </span>
            <span className="text-[10px] font-mono text-[#ffd700]">{expiryLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DailyBonusFeed({ initialFeed, usOnlyDefault = true }: DailyBonusFeedProps) {
  const { user, loading } = useAuth();
  const [feed, setFeed] = useState(initialFeed);
  const [usOnly, setUsOnly] = useState(usOnlyDefault);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [liveScores, setLiveScores] = useState<LiveTrustScore[]>([]);
  const [hiddenCount, setHiddenCount] = useState(initialFeed.suppression?.hiddenCount ?? 0);
  const [suppressionActive, setSuppressionActive] = useState(initialFeed.suppression?.active ?? false);

  useEffect(() => {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');
    fetch(`${apiUrl}/rgaas/casino-scores`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { casinos?: LiveTrustScore[] } | null) => {
        setLiveScores(Array.isArray(payload?.casinos) ? payload.casinos : []);
      })
      .catch(() => setLiveScores([]));
  }, []);

  useEffect(() => {
    if (loading) return;

    const token = typeof window !== 'undefined'
      ? window.localStorage.getItem('tc_token')?.trim() || null
      : null;
    if (!user && !token) {
      setFeed(initialFeed);
      setHiddenCount(initialFeed.suppression?.hiddenCount ?? 0);
      setSuppressionActive(initialFeed.suppression?.active ?? false);
      return;
    }

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');
    const controller = new AbortController();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    fetch(`${apiBase}/bonuses/daily-feed?usOnly=${usOnly ? 'true' : 'false'}`, {
      credentials: 'include',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) return;
        const body = await response.json() as DailyBonusFeedResponse;
        setFeed(body);
        setHiddenCount(body.suppression?.hiddenCount ?? 0);
        setSuppressionActive(Boolean(body.suppression?.active));
      })
      .catch(() => {});

    return () => controller.abort();
  }, [loading, user, usOnly, initialFeed]);

  const filtered = useMemo(() => {
    let entries = feed.data;

    if (sourceFilter !== 'all') {
      entries = entries.filter((entry) => entry.sources.includes(sourceFilter));
    }

    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      entries = entries.filter((entry) =>
        entry.brand.toLowerCase().includes(trimmed)
        || entry.bonus.toLowerCase().includes(trimmed),
      );
    }

    return entries;
  }, [feed.data, query, sourceFilter]);

  return (
    <div>
      <SourceStatusBar sources={feed.sources} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-gray-500">
          {filtered.length} offers · updated {formatShortDate(feed.updatedAt)} · verify terms before claiming
        </p>
        <button
          type="button"
          onClick={() => setUsOnly((current) => !current)}
          className={`text-[10px] font-mono uppercase tracking-widest border px-3 py-1 transition-colors ${
            usOnly
              ? 'border-[#17c3b2] text-[#17c3b2]'
              : 'border-[#283347] text-[#8a97a8] hover:border-[#17c3b2]/50'
          }`}
        >
          {usOnly ? '[US CASINOS ONLY]' : '[ALL SOURCES]'}
        </button>
      </div>

      {suppressionActive && hiddenCount > 0 && (
        <div className="mb-6 border border-[#17c3b2]/30 bg-[#0d1117] px-4 py-3">
          <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2]">
            [{hiddenCount} HIDDEN] Your active casino filters are suppressing matching bonus promos.
          </p>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative max-w-lg flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#17c3b2] font-mono text-sm select-none pointer-events-none">
            $
          </span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="FILTER BY BRAND OR BONUS..."
            className="w-full pl-8 pr-4 py-3 bg-[#080a0d] border border-[#283347] text-white font-mono text-sm uppercase tracking-widest placeholder:text-[#4B5563] focus:outline-none focus:border-[#17c3b2] focus:shadow-[0_0_10px_rgba(23,195,178,0.2)] transition-all duration-200"
            aria-label="Filter bonuses by brand or bonus text"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'email-inbox', 'collectclock', 'local-fallback'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSourceFilter(filter)}
              className={`text-[10px] font-mono uppercase tracking-widest border px-3 py-2 transition-colors ${
                sourceFilter === filter
                  ? 'border-[#17c3b2] text-[#17c3b2]'
                  : 'border-[#283347] text-[#8a97a8] hover:border-[#17c3b2]/50'
              }`}
            >
              {filter === 'all' ? '[ALL SOURCES]' : `[${SOURCE_BADGE_LABELS[filter]}]`}
            </button>
          ))}
        </div>
      </div>

      {query && (
        <p className="mb-4 text-xs font-mono text-[#8a97a8] uppercase tracking-widest">
          {filtered.length} RESULT{filtered.length !== 1 ? 'S' : ''} FOR &quot;{query.toUpperCase()}&quot;
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="public-page-card py-20 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-[#17c3b2] mb-2">
            [NO BONUSES FOUND]
          </p>
          <p className="font-mono text-[#8a97a8] text-sm">
            No cap — the feed is dry right now. Toggle filters or check back after the next inbox crawl.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((entry) => {
            let domainCandidates: string[] = [];
            try {
              domainCandidates = [new URL(entry.url).hostname.replace(/^www\./i, '')];
            } catch {
              domainCandidates = [];
            }

            return (
            <BonusCard
              key={entry.id}
              entry={entry}
              trustScore={findLiveTrustScore(
                { name: entry.brand, slug: entry.brand, domainCandidates },
                liveScores,
              )}
            />
            );
          })}
        </div>
      )}
    </div>
  );
}
