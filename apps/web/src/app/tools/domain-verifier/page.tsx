/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06 */
"use client";

import React, { useState } from 'react';

export default function DomainVerifierPage() {
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [result, setResult] = useState<{ safe: boolean; message: string } | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setStatus('scanning');
    setResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me';
      const res = await fetch(`${apiUrl}/rgaas/domain-check?domain=${encodeURIComponent(domain.trim())}`);
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      setResult({ safe: data.safe, message: data.message || (data.safe ? 'Domain passed all checks.' : 'Potential threat detected.') });
    } catch {
      setResult({ safe: false, message: 'Could not reach the SusLink API. Do not proceed with an unverified domain.' });
    } finally {
      setStatus('done');
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">LINKGUARD</p>
          <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="ANTI-DRAINER DNS SENTRY">
            ANTI-DRAINER DNS SENTRY
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            Phishing clones and wallet drainers impersonate real casinos. Paste a domain before you connect your wallet. We validate SSL certificates, check contract IDs, and flag known impersonators.
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleScan} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-[#17c3b2] uppercase tracking-[0.2em] block mb-3">
                Paste the domain to verify
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. stake.com or stake-bonus-promo.xyz"
                className="w-full bg-black border border-[#283347] p-4 text-white font-mono text-sm focus:border-[#17c3b2] outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'scanning' || !domain.trim()}
              className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/30 hover:bg-[#17c3b2]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'scanning' ? 'Scanning...' : 'Run DNS + SSL Check'}
            </button>
          </form>

          {result && (
            <div
              className={`mt-8 p-6 border font-mono ${
                result.safe
                  ? 'border-[#17c3b2]/40 bg-[#17c3b2]/5'
                  : 'border-[#ef4444]/40 bg-[#ef4444]/5'
              }`}
            >
              <p className={`text-sm font-black uppercase tracking-widest mb-2 ${result.safe ? 'text-[#17c3b2]' : 'text-[#ef4444]'}`}>
                {result.safe ? 'PASS — No threats detected' : 'WARNING — Threat signals found'}
              </p>
              <p className="text-gray-400 text-sm">{result.message}</p>
            </div>
          )}

          <div className="mt-12 p-6 border border-[#283347] bg-black/40 text-xs text-gray-500 font-mono leading-relaxed">
            <p className="text-gray-400 font-bold uppercase tracking-widest mb-2 text-[10px]">What we check</p>
            <ul className="space-y-1">
              <li>→ SSL certificate validity and issuer trust chain</li>
              <li>→ Domain age and registration anomalies</li>
              <li>→ Known phishing and drainer domain blocklists</li>
              <li>→ Contract ID consistency for crypto casino platforms</li>
              <li>→ Typosquat similarity against verified casino domains</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 border-t border-[#283347] text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-500 text-sm font-mono">
            Powered by SusLink — TiltCheck's link scanning and threat detection module.
            Always verify before connecting a wallet to any platform.
          </p>
        </div>
      </section>
    </main>
  );
}
