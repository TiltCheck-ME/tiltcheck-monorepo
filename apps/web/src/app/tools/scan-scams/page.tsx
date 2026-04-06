/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06 */
"use client";

import React, { useEffect, useState } from 'react';

interface CasinoFlag {
  name: string;
  flag: string;
  severity: 'high' | 'medium' | 'low';
  detectedAt: string;
}

const FALLBACK_FLAGS: CasinoFlag[] = [
  { name: 'Unnamed Platform A', flag: 'Withdrawal processing > 72 hours (avg)', severity: 'high', detectedAt: '2026-04-05' },
  { name: 'Unnamed Platform B', flag: 'ToS updated silently — bonus terms changed', severity: 'medium', detectedAt: '2026-04-04' },
  { name: 'Unnamed Platform C', flag: 'Account shadow-limited after withdrawal request', severity: 'high', detectedAt: '2026-04-03' },
  { name: 'Unnamed Platform D', flag: 'KYC delay > 14 days post-win', severity: 'medium', detectedAt: '2026-04-02' },
];

function getSeverityColor(severity: CasinoFlag['severity']): string {
  if (severity === 'high') return '#ef4444';
  if (severity === 'medium') return '#ffd700';
  return '#17c3b2';
}

export default function ScanScamsPage() {
  const [flags, setFlags] = useState<CasinoFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me';
        const res = await fetch(`${apiUrl}/rgaas/shadow-bans`);
        if (!res.ok) throw new Error('API unavailable');
        const data = await res.json();
        setFlags(data.flags || FALLBACK_FLAGS);
      } catch {
        setError('Trust Engine offline. Showing cached community reports.');
        setFlags(FALLBACK_FLAGS);
      } finally {
        setLoading(false);
      }
    };
    fetchFlags();
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">TRUST ENGINE</p>
          <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="CASINO SHADOW-BAN TRACKER">
            CASINO SHADOW-BAN TRACKER
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            Public API monitoring of withdrawal delays, silent ToS changes, account restrictions, and regulatory drift. If a platform is slow-rolling degens, this board hears about it first.
          </p>
        </div>
      </section>

      {error && (
        <div className="px-4 py-4 border-b border-[#ffd700]/20 bg-[#ffd700]/5 text-center">
          <p className="text-sm font-mono text-[#ffd700]">{error}</p>
        </div>
      )}

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black uppercase tracking-tight">Active Flags</h2>
            <span className="text-xs font-mono text-gray-500 uppercase">
              {loading ? 'Loading...' : `${flags.length} flags tracked`}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 font-mono text-gray-500">
              Querying Trust Engine...
            </div>
          ) : (
            <div className="space-y-4">
              {flags.map((item, i) => {
                const color = getSeverityColor(item.severity);
                return (
                  <div key={i} className="p-6 border border-[#283347] bg-black/40 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="text-[10px] font-black uppercase tracking-widest px-2 py-1 border"
                          style={{ color, borderColor: color + '40' }}
                        >
                          {item.severity.toUpperCase()}
                        </span>
                        <span className="text-white font-black uppercase tracking-tight">{item.name}</span>
                      </div>
                      <p className="text-gray-400 text-sm font-mono">{item.flag}</p>
                    </div>
                    <div className="text-xs font-mono text-gray-600 whitespace-nowrap">
                      Detected: {item.detectedAt}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-4 border-t border-[#283347] bg-black/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black uppercase mb-8 text-[#17c3b2]">What Gets Flagged</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-400">
            <div className="p-6 border border-[#ef4444]/20">
              <h3 className="font-black uppercase text-[#ef4444] mb-3">High Severity</h3>
              <ul className="space-y-1">
                <li>→ Withdrawal processing exceeding 72 hours</li>
                <li>→ Account restrictions following large wins</li>
                <li>→ KYC demands applied selectively post-win</li>
                <li>→ Platform-wide withdrawal pause</li>
              </ul>
            </div>
            <div className="p-6 border border-[#ffd700]/20">
              <h3 className="font-black uppercase text-[#ffd700] mb-3">Medium Severity</h3>
              <ul className="space-y-1">
                <li>→ Silent ToS updates changing bonus terms</li>
                <li>→ Sudden bet limit reductions for winning players</li>
                <li>→ Community reports of unfair voided wins</li>
                <li>→ License or regulatory status changes</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 border-t border-[#283347] text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black uppercase mb-6">Report a Flag</h2>
          <p className="text-gray-400 mb-8">
            Hit a withdrawal wall or got shadow-banned after a big win? Report it in Discord. Community reports drive this board.
          </p>
          <a
            href="https://discord.gg/gdBsEJfCar"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary py-3 px-6 font-black"
          >
            Report to Discord
          </a>
        </div>
      </section>
    </main>
  );
}
