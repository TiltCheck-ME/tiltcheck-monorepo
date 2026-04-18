/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
"use client";

import React, { useEffect, useState } from 'react';

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

        const data = await res.json() as ScamFeedResponse;
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
      <section className="border-b border-[#283347] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#ef4444] uppercase tracking-widest mb-4">THREAT INTEL</p>
          <h1 className="text-5xl font-black uppercase tracking-tighter mb-6" data-text="SCAM BLACKLIST">
            SCAM BLACKLIST
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            Repository-backed domain blacklist. If the source file is unavailable or empty, this page says that directly instead of faking a live feed.
          </p>
        </div>
      </section>

      {!loading && (
        <section className="px-4 py-4 border-b border-[#283347] bg-black/30">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm font-mono">
            <p className={availability === 'available' ? 'text-[#17c3b2]' : 'text-[#ffd700]'}>
              {message}
            </p>
            <p className="text-gray-500 uppercase tracking-widest">
              {source ? `Source: ${source}` : 'Source unavailable'}
            </p>
          </div>
        </section>
      )}

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black uppercase tracking-tight">
              {loading ? 'Loading...' : `${scams.length} Blacklisted Domains`}
            </h2>
            <a
              href="/tools/domain-verifier"
              className="text-xs font-black text-[#17c3b2] uppercase tracking-widest hover:underline"
            >
              Check a Domain →
            </a>
          </div>

          {loading ? (
            <div className="text-center py-16 font-mono text-gray-500">Loading blacklist source...</div>
          ) : scams.length === 0 ? (
            <div className="border border-[#283347] bg-black/40 p-8 text-center">
              <p className="text-white font-black uppercase tracking-wide mb-3">No blacklist entries to show</p>
              <p className="text-sm font-mono text-gray-400">
                {message || 'Blacklist feed unavailable.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scams.map((scam, i) => (
                <div key={i} className="p-5 border border-[#283347] bg-black/40 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span
                        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border"
                        style={{ color: '#ef4444', borderColor: '#ef444440' }}
                      >
                        blacklisted
                      </span>
                      <code className="text-white font-mono text-sm font-bold">{scam.domain}</code>
                    </div>
                    <p className="text-gray-400 text-sm">{scam.classification}</p>
                  </div>
                  <div className="text-xs font-mono text-gray-600 whitespace-nowrap">
                    Source: {scam.source}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 px-4 border-t border-[#283347] bg-black/40 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-black uppercase mb-4">Before You Click Anything</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Always verify a casino URL before connecting your wallet. This blacklist is a blunt repo snapshot, not a complete live intel feed.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/tools/domain-verifier" className="btn btn-primary py-3 px-6 font-black">
              Verify a Domain
            </a>
            <a
              href="https://discord.gg/gdBsEJfCar"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary py-3 px-6 font-black"
            >
              Report a Scam
            </a>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-[#283347] text-center text-xs font-mono text-gray-500 uppercase tracking-[0.3em]">
        Made for Degens. By Degens.
      </footer>
    </main>
  );
}
