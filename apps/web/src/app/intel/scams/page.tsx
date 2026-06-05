/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ToolPageHeader from '@/components/ToolPageHeader';

interface ScamEntry {
  domain: string;
  source: string;
  classification: string;
}

interface ScamFeedResponse {
  availability?: 'available' | 'empty' | 'unavailable';
  live?: boolean;
  message?: string;
  source?: string | null;
  scams?: ScamEntry[];
}

export default function ScamsPage() {
  const [scams, setScams] = useState<ScamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<'available' | 'empty' | 'unavailable'>('unavailable');
  const [message, setMessage] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    const fetchScams = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me';
        const res = await fetch(`${apiUrl}/rgaas/scam-domains`);
        if (!res.ok) throw new Error('Scam blacklist unavailable');

        const data = (await res.json()) as ScamFeedResponse;
        setScams(Array.isArray(data.scams) ? data.scams : []);
        setAvailability(data.availability || 'unavailable');
        setMessage(data.message || 'Scam blacklist unavailable.');
        setSource(data.source || null);
      } catch {
        setScams([]);
        setAvailability('unavailable');
        setMessage('Scam blacklist unavailable. No fake fallback list is shown.');
        setSource(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchScams();
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <ToolPageHeader
        centered
        eyebrow="Threat intel"
        title="Scam blacklist"
        description={
          <>
            Repo-backed domain list. Empty or down = we say so — no fake feed.{' '}
            <Link href="/tools/domain-verifier" className="text-[#17c3b2] hover:underline">
              Check a domain
            </Link>
            .
          </>
        }
      />

      {!loading && (
        <p className="px-4 py-3 text-center text-xs font-mono border-b border-[#283347] bg-black/30">
          <span className={availability === 'available' ? 'text-[#17c3b2]' : 'text-[#ffd700]'}>{message}</span>
          {source ? <span className="text-gray-500 ml-2">· {source}</span> : null}
        </p>
      )}

      <section className="py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="mb-6 text-sm font-black uppercase tracking-tight text-gray-400">
            {loading ? 'Loading...' : `${scams.length} blacklisted domains`}
          </p>

          {loading ? (
            <div className="text-center py-12 font-mono text-gray-500">Loading blacklist...</div>
          ) : scams.length === 0 ? (
            <div className="border border-[#283347] bg-black/40 p-8 text-center">
              <p className="text-white font-black uppercase tracking-wide mb-2">Nothing to show</p>
              <p className="text-sm font-mono text-gray-400">{message || 'Blacklist feed unavailable.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scams.map((scam, i) => (
                <div
                  key={i}
                  className="p-4 border border-[#283347] bg-black/40 flex flex-col md:flex-row md:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border"
                        style={{ color: '#ef4444', borderColor: '#ef444440' }}
                      >
                        blacklisted
                      </span>
                      <code className="text-white font-mono text-sm font-bold truncate">{scam.domain}</code>
                    </div>
                    <p className="text-gray-400 text-sm">{scam.classification}</p>
                  </div>
                  <p className="text-xs font-mono text-gray-600 shrink-0">Source: {scam.source}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
