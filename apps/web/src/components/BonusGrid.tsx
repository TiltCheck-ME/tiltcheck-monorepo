// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface BonusEntry {
  brand: string;
  bonus: string;
  url: string;
  verified: string;
  code: string | null;
}

interface BonusGridProps {
  bonuses: BonusEntry[];
}

interface BonusFeedResponse {
  data?: BonusEntry[];
  available?: boolean;
  suppression?: {
    active?: boolean;
    hiddenCount?: number;
  };
}

function normalizeBonusKey(entry: BonusEntry): string {
  return `${entry.brand.trim().toLowerCase()}::${entry.bonus.trim().toLowerCase()}::${entry.url.trim().toLowerCase()}`;
}

function mergeBonuses(...sources: BonusEntry[][]): BonusEntry[] {
  const byKey = new Map<string, BonusEntry>();

  for (const source of sources) {
    for (const entry of source) {
      const key = normalizeBonusKey(entry);
      const existing = byKey.get(key);

      if (!existing || Date.parse(entry.verified) > Date.parse(existing.verified)) {
        byKey.set(key, entry);
      }
    }
  }

  return [...byKey.values()].sort(
    (left, right) => Date.parse(right.verified) - Date.parse(left.verified)
  );
}

function BonusCard({ entry }: { entry: BonusEntry }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!entry.code) return;
    navigator.clipboard.writeText(entry.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [entry.code]);

  const formattedDate = entry.verified
    ? new Date(entry.verified).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <div
      className="group relative flex flex-col justify-between p-6 border border-[#283347] bg-gradient-to-br from-[#0E0E0F] to-[#0a0c10] transition-all duration-300 hover:border-[#17c3b2] hover:shadow-[0_0_20px_rgba(23,195,178,0.15)]"
      style={{ minHeight: '260px' }}
    >
      {/* Trust badge placeholder */}
      <div className="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-widest text-[#17c3b2]/50 border border-[#17c3b2]/20 px-2 py-1">
        [TRUST SCORE: LOADING]
      </div>

      {/* Content */}
      <div className="flex-1 mt-2">
        {/* Status badges */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#17c3b2] border border-[#17c3b2]/40 px-2 py-0.5">
            [VERIFIED]
          </span>
          {entry.code && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#ffd700] border border-[#ffd700]/40 px-2 py-0.5">
              [HAS CODE]
            </span>
          )}
        </div>

        {/* Brand name */}
        <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2 leading-tight">
          {entry.brand}
        </h3>

        {/* Bonus description */}
        <p className="text-[#c4ced8] text-sm font-mono leading-relaxed mb-4">
          {entry.bonus}
        </p>

        {/* Promo code */}
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

      {/* Footer actions */}
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
        <div className="flex justify-between items-center pt-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#4B5563]">
            LAST VERIFIED:
          </span>
          <span className="text-[10px] font-mono text-[#8a97a8]">{formattedDate}</span>
        </div>
      </div>
    </div>
  );
}

export default function BonusGrid({ bonuses }: BonusGridProps) {
  const { user, loading } = useAuth();
  const [query, setQuery] = useState('');
  const [visibleBonuses, setVisibleBonuses] = useState(bonuses);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [suppressionActive, setSuppressionActive] = useState(false);

  useEffect(() => {
    setVisibleBonuses(bonuses);
  }, [bonuses]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const token = typeof window !== 'undefined' ? window.localStorage.getItem('tc_token')?.trim() || null : null;
    if (!user && !token) {
      setHiddenCount(0);
      setSuppressionActive(false);
      return;
    }

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');
    const controller = new AbortController();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    Promise.all([
      fetch(`${apiBase}/bonuses`, {
        credentials: 'include',
        headers,
        signal: controller.signal,
        cache: 'no-store',
      }),
      fetch(`${apiBase}/bonuses/inbox`, {
        credentials: 'include',
        headers,
        signal: controller.signal,
        cache: 'no-store',
      }),
    ])
      .then(async ([collectClockResponse, inboxResponse]) => {
        if (!collectClockResponse.ok || !inboxResponse.ok) {
          return;
        }

        const collectClockBody = await collectClockResponse.json() as BonusFeedResponse;
        const inboxBody = await inboxResponse.json() as BonusFeedResponse;
        const collectClockBonuses = Array.isArray(collectClockBody.data) ? collectClockBody.data : [];
        const inboxBonuses = Array.isArray(inboxBody.data) ? inboxBody.data : [];

        setVisibleBonuses(mergeBonuses(inboxBonuses, collectClockBonuses));
        setHiddenCount(
          Math.max(0, Number(collectClockBody.suppression?.hiddenCount ?? 0))
          + Math.max(0, Number(inboxBody.suppression?.hiddenCount ?? 0))
        );
        setSuppressionActive(Boolean(collectClockBody.suppression?.active) || Boolean(inboxBody.suppression?.active));
      })
      .catch(() => {});

    return () => controller.abort();
  }, [loading, user]);

  const filtered = useMemo(() => (query.trim()
    ? visibleBonuses.filter((b) =>
        b.brand.toLowerCase().includes(query.trim().toLowerCase())
      )
    : visibleBonuses), [query, visibleBonuses]);

  return (
    <div>
      {/* Search bar */}
      {suppressionActive && hiddenCount > 0 && (
        <div className="mb-6 border border-[#17c3b2]/30 bg-[#0d1117] px-4 py-3">
          <p className="text-xs font-mono uppercase tracking-widest text-[#17c3b2]">
            [{hiddenCount} HIDDEN] Your active casino filters are suppressing matching bonus promos.
          </p>
        </div>
      )}
      <div className="mb-8">
        <div className="relative max-w-lg">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#17c3b2] font-mono text-sm select-none pointer-events-none">
            $
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="FILTER BY BRAND..."
            className="w-full pl-8 pr-4 py-3 bg-[#080a0d] border border-[#283347] text-white font-mono text-sm uppercase tracking-widest placeholder:text-[#4B5563] focus:outline-none focus:border-[#17c3b2] focus:shadow-[0_0_10px_rgba(23,195,178,0.2)] transition-all duration-200"
            aria-label="Filter bonuses by brand name"
          />
        </div>
        {query && (
          <p className="mt-2 text-xs font-mono text-[#8a97a8] uppercase tracking-widest">
            {filtered.length} RESULT{filtered.length !== 1 ? 'S' : ''} FOR &quot;{query.toUpperCase()}&quot;
          </p>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center border border-[#283347]">
          <p className="font-mono text-[#8a97a8] uppercase tracking-widest">
            [NO BONUSES FOUND] — Try a different search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((entry) => (
            <BonusCard key={`${entry.brand}-${entry.url}-${entry.verified}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
