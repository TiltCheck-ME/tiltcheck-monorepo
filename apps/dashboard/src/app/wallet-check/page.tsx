/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function WalletCheckPage() {
  const [address, setAddress] = useState('');
  const [scanning, setScanning] = useState(false);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    setScanning(true);
    setTimeout(() => setScanning(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#0E0E0F] pt-12 pb-20">
      <div className="container mx-auto px-6">
        <header className="mb-12 text-center">
          <Link href="/" className="text-[#00FFC6] text-xs font-bold tracking-widest hover:underline mb-4 inline-block">← RETURN TO HUB</Link>
          <div className="flex flex-col items-center gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-black font-space text-white tracking-tight">
              WALLET CHECK
            </h1>
          </div>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            Check yourself before you wreck yourself. Instant security scanning for the modern degen.
          </p>
        </header>

        <div className="bg-[#1A1F24] p-10 rounded-2xl border-2 border-[#00FFC6]/20 shadow-2xl mb-16 max-w-4xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#00FFC6]/10" />
          <form onSubmit={handleScan} className="relative z-10">
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ENTER SOLANA OR ETHEREUM ADDRESS..."
                className="flex-grow bg-[#0E0E0F] border border-[#00FFC6]/20 rounded px-6 py-4 text-white focus:outline-none focus:border-[#00FFC6] text-lg font-space tracking-tight transition-all"
              />
              <button 
                type="submit"
                disabled={scanning || !address}
                className="px-10 py-4 bg-[#00FFC6] text-[#0E0E0F] disabled:opacity-50 rounded font-black text-lg tracking-tighter transition-all hover:opacity-90 shadow-[0_0_20px_rgba(0,255,198,0.2)] uppercase"
              >
                {scanning ? 'SCANNING...' : 'SCAN NOW'}
              </button>
            </div>
            {scanning && (
              <div className="mt-6 h-1 w-full bg-[#0E0E0F] rounded-full overflow-hidden">
                <div className="h-full bg-[#00FFC6] animate-progress" style={{ width: '40%' }} />
              </div>
            )}
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <section className="bg-[#1A1F24] p-8 rounded-xl border border-[#00FFC6]/10">
            <h2 className="text-sm font-black font-space tracking-[0.2em] mb-6 text-[#ef4444] uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-[#ef4444] rounded-full animate-pulse" />
              THREAT DETECTION CAPABILITIES
            </h2>
            <ul className="space-y-4 text-sm font-bold tracking-wide text-[#B8C4CE]">
              <li className="flex items-center gap-3">
                <span className="text-[#00FFC6]">SCAN:</span> EIP7702 DELEGATION ATTACKS
              </li>
              <li className="flex items-center gap-3">
                <span className="text-[#00FFC6]">SCAN:</span> MALICIOUS TOKEN APPROVALS
              </li>
              <li className="flex items-center gap-3">
                <span className="text-[#00FFC6]">SCAN:</span> SWEEPER BOT ACTIVITY
              </li>
              <li className="flex items-center gap-3">
                <span className="text-[#00FFC6]">SCAN:</span> PHISHING CONTRACT ANALYSIS
              </li>
            </ul>
          </section>

          <section className="bg-[#1A1F24] p-8 rounded-xl border border-[#00FFC6]/10">
            <h2 className="text-sm font-black font-space tracking-[0.2em] mb-6 text-[#00FFC6] uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00FFC6] rounded-full" />
              WHY SCAN?
            </h2>
            <p className="text-[#6B7280] leading-relaxed text-sm font-medium">
              One wrong click can cost thousands. Wallet Check analyzes the blockchain 
              to find hidden vulnerabilities in your account before they are exploited. 
              Our engine is updated daily with the latest threat signatures.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

