/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
"use client";

import React, { useEffect, useState } from 'react';

interface CasinoFlag {
  name: string;
  flag: string;
  severity: 'high' | 'medium' | 'low';
  detectedAt: string;
  source?: string;
}

interface ShadowBanFeedResponse {
  availability?: 'available' | 'unavailable';
  coverage?: 'partial';
  supportedSignals?: string[];
  unavailableSignals?: string[];
  message?: string;
  flags?: CasinoFlag[];
}

function getSeverityColor(severity: CasinoFlag['severity']): string {
  if (severity === 'high') return '#ef4444';
  if (severity === 'medium') return '#ffd700';
  return '#17c3b2';
}

export default function ScanScamsPage() {
  const [flags, setFlags] = useState<CasinoFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportedSignals, setSupportedSignals] = useState<string[]>([]);
  const [unavailableSignals, setUnavailableSignals] = useState<string[]>([]);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me';
        const res = await fetch(`${apiUrl}/rgaas/shadow-bans`);
        if (!res.ok) throw new Error('Trust Engine feed unavailable');

        const data = await res.json() as ShadowBanFeedResponse;
        setFlags(Array.isArray(data.flags) ? data.flags : []);
        setSupportedSignals(Array.isArray(data.supportedSignals) ? data.supportedSignals : []);
        setUnavailableSignals(Array.isArray(data.unavailableSignals) ? data.unavailableSignals : []);
        setError(data.message || null);
      } catch {
        setError('Trust Engine feed unavailable. No fallback sample data is shown.');
        setFlags([]);
        setSupportedSignals([]);
        setUnavailableSignals([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchFlags();
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">TRUST ENGINE</p>
          <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="PAYOUT DELAY SIGNALS">
            PAYOUT DELAY SIGNALS
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            Live trust-engine feed for payout friction and ToS volatility only.
            Account locks and Discord anecdotes are not shown here unless the backend actually supports them.
          </p>
          <p className="text-xs font-mono text-gray-600 mt-3 uppercase tracking-widest">
            No fake fallback intel. Unsupported signal classes stay blank.
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
          ) : flags.length === 0 ? (
            <div className="border border-[#283347] bg-black/40 p-8 text-center">
              <p className="text-white font-black uppercase tracking-wide mb-3">No live signals in scope</p>
              <p className="text-sm font-mono text-gray-400">
                {error || 'This feed only covers trust-engine payout and ToS events.'}
              </p>
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
                      {new Date(item.detectedAt).toLocaleString()}
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
          <h2 className="text-2xl font-black uppercase mb-8 text-[#17c3b2]">Current Feed Coverage</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-400">
            <div className="p-6 border border-[#17c3b2]/20">
              <h3 className="font-black uppercase text-[#17c3b2] mb-3">Supported Right Now</h3>
              <ul className="space-y-1">
                {(supportedSignals.length > 0 ? supportedSignals : ['No supported signal metadata returned.']).map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
            <div className="p-6 border border-[#ffd700]/20">
              <h3 className="font-black uppercase text-[#ffd700] mb-3">Not In This Feed</h3>
              <ul className="space-y-1">
                {(unavailableSignals.length > 0 ? unavailableSignals : ['No unavailable signal metadata returned.']).map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 border-t border-[#283347] text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black uppercase mb-6">Report a Flag</h2>
          <p className="text-gray-400 mb-8">
            Hit a withdrawal wall? Report it in Discord. That does not automatically become live feed data until the backend has a real source wired in.
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

      <footer className="py-8 px-4 border-t border-[#283347] text-center text-xs font-mono text-gray-500 uppercase tracking-[0.3em]">
        Made for Degens. By Degens.
      </footer>
    </main>
  );
}
