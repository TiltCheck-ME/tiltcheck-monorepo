/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06 */
"use client";

import React, { useEffect, useState } from 'react';

interface ScamEntry {
  domain: string;
  type: string;
  reportedAt: string;
  status: 'confirmed' | 'investigating' | 'cleared';
}

const KNOWN_SCAMS: ScamEntry[] = [
  { domain: 'stake-free-bonus.xyz', type: 'Phishing clone — wallet drainer', reportedAt: '2026-04-01', status: 'confirmed' },
  { domain: 'rollbit-promo.net', type: 'Fake bonus offer — credential harvest', reportedAt: '2026-03-28', status: 'confirmed' },
  { domain: 'bcgame-airdrop.io', type: 'Airdrop scam — seed phrase request', reportedAt: '2026-03-22', status: 'confirmed' },
  { domain: 'stake-cash-promo.com', type: 'Impersonation — fake support page', reportedAt: '2026-03-15', status: 'investigating' },
];

function getStatusColor(status: ScamEntry['status']): string {
  if (status === 'confirmed') return '#ef4444';
  if (status === 'investigating') return '#ffd700';
  return '#17c3b2';
}

export default function ScamsPage() {
  const [scams, setScams] = useState<ScamEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScams = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me';
        const res = await fetch(`${apiUrl}/rgaas/scam-domains`);
        if (!res.ok) throw new Error('API offline');
        const data = await res.json();
        setScams(data.scams || KNOWN_SCAMS);
      } catch {
        setScams(KNOWN_SCAMS);
      } finally {
        setLoading(false);
      }
    };
    fetchScams();
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#ef4444] uppercase tracking-widest mb-4">THREAT INTEL</p>
          <h1 className="text-5xl font-black uppercase tracking-tighter mb-6" data-text="SCAM DATABASE">
            SCAM DATABASE
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            Community-driven, SusLink-verified registry of phishing clones, wallet drainers, and fake bonus sites impersonating real casino platforms.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black uppercase tracking-tight">
              {loading ? 'Loading...' : `${scams.length} Flagged Domains`}
            </h2>
            <a
              href="/tools/domain-verifier"
              className="text-xs font-black text-[#17c3b2] uppercase tracking-widest hover:underline"
            >
              Check a Domain →
            </a>
          </div>

          {loading ? (
            <div className="text-center py-16 font-mono text-gray-500">Querying SusLink database...</div>
          ) : (
            <div className="space-y-3">
              {scams.map((scam, i) => {
                const color = getStatusColor(scam.status);
                return (
                  <div key={i} className="p-5 border border-[#283347] bg-black/40 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span
                          className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border"
                          style={{ color, borderColor: color + '40' }}
                        >
                          {scam.status}
                        </span>
                        <code className="text-white font-mono text-sm font-bold">{scam.domain}</code>
                      </div>
                      <p className="text-gray-400 text-sm">{scam.type}</p>
                    </div>
                    <div className="text-xs font-mono text-gray-600 whitespace-nowrap">
                      Reported: {scam.reportedAt}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 px-4 border-t border-[#283347] bg-black/40 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-black uppercase mb-4">Before You Click Anything</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Always verify a casino URL before connecting your wallet. The DNS Sentry checks SSL certs, contract IDs, and known impersonator patterns.
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
    </main>
  );
}

