'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-[#0E0E0F] pt-12 pb-20">
      <div className="container mx-auto px-6">
        <header className="mb-12">
          <Link href="/" className="text-[#00FFC6] text-xs font-bold tracking-widest hover:underline mb-4 inline-block">← RETURN TO HUB</Link>
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-black font-space text-white tracking-tight">
              TILTGUARD SAFETY
            </h1>
          </div>
          <p className="text-lg text-[#6B7280] max-w-2xl">
            Real-time protection from malicious links, phishing, and tilt-induced losses. The thin neon line between you and a zero balance.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-sm font-black font-space tracking-[0.2em] mb-6 text-white uppercase flex items-center gap-3">
              <span className="w-2 h-6 bg-[#7c3aed]" />
              CHROME EXTENSION
            </h2>
            <div className="bg-gradient-to-br from-[#1e1b4b] to-[#1e1b4b]/50 p-10 rounded-2xl border border-[#7c3aed]/30 shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-2xl font-black font-space mb-2 text-white italic tracking-tighter">TILTGUARD PRO</h3>
                <p className="text-[#B8C4CE] mb-8 text-sm leading-relaxed">
                  Automatically blocks known scam links and alerts you when your betting patterns suggest you're tilting.
                </p>
                <ul className="space-y-4 mb-10 text-[11px] font-bold tracking-widest text-[#B8C4CE]">
                  <li className="flex items-center gap-3 text-[#7c3aed]">
                    LINK SCAN 3.0 INTEGRATION
                  </li>
                  <li className="flex items-center gap-3 text-[#7c3aed]">
                    BIOMETRIC TILT DETECTION
                  </li>
                  <li className="flex items-center gap-3 text-[#7c3aed]">
                    AUTO-COOL-OFF FOR CASINOS
                  </li>
                </ul>
                <button className="w-full py-4 bg-[#7c3aed] text-white font-black text-xs tracking-[0.2em] rounded hover:opacity-90 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] uppercase">
                  INSTALL FROM WEB STORE
                </button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black font-space tracking-[0.2em] mb-6 text-white uppercase flex items-center gap-3">
              <span className="w-2 h-6 bg-[#00FFC6]" />
              DISCORD BOT SAFETY
            </h2>
            <div className="bg-[#1A1F24] p-10 rounded-2xl border border-[#00FFC6]/10 shadow-xl h-full flex flex-col">
              <h3 className="text-xl font-black font-space text-white mb-2 tracking-tight">TILTCHECK BOT</h3>
              <p className="text-[#6B7280] mb-8 flex-grow text-sm leading-relaxed">
                Invite TiltCheck to your Discord server to protect your community from scam links and malicious users.
              </p>
              <div className="space-y-4 mb-10">
                <div className="flex items-center justify-between p-4 bg-[#0E0E0F] rounded border border-[#00FFC6]/10">
                  <span className="font-mono text-xs text-[#00FFC6]">/scan-link [URL]</span>
                  <span className="text-[9px] font-black bg-[#00FFC6]/10 text-[#00FFC6] px-2 py-1 rounded border border-[#00FFC6]/20 tracking-widest uppercase">TRY IT</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#0E0E0F] rounded border border-[#00FFC6]/10">
                  <span className="font-mono text-xs text-[#00FFC6]">/safety-score [USER]</span>
                  <span className="text-[9px] font-black bg-[#00FFC6]/10 text-[#00FFC6] px-2 py-1 rounded border border-[#00FFC6]/20 tracking-widest uppercase">TRY IT</span>
                </div>
              </div>
              <button className="w-full py-4 bg-[#0E0E0F] border border-[#00FFC6]/30 text-[#00FFC6] font-black text-xs tracking-[0.2em] rounded hover:bg-[#00FFC6]/5 transition-all uppercase">
                ADD TO DISCORD
              </button>
            </div>
          </div>
        </div>

        <section className="bg-[#ef4444]/5 border border-[#ef4444]/20 p-10 rounded-xl text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black font-space mb-4 text-[#ef4444] tracking-tight">IS YOUR COMMUNITY SAFE?</h2>
            <p className="text-[#B8C4CE] max-w-2xl mx-auto mb-10 text-sm font-medium leading-relaxed">
              The **SusLink** engine has indexed over 1.2M malicious domains in the crypto space. 
              Protect your assets and your community with TiltGuard today.
            </p>
            <div className="inline-flex flex-wrap justify-center gap-12">
              <div className="text-center">
                <div className="text-4xl font-black font-space text-white mb-1">1.2M+</div>
                <div className="text-[9px] text-[#6B7280] uppercase tracking-[0.2em] font-black">Domains Blocked</div>
              </div>
              <div className="text-center border-l border-[#ef4444]/20 pl-12">
                <div className="text-4xl font-black font-space text-white mb-1">450K+</div>
                <div className="text-[9px] text-[#6B7280] uppercase tracking-[0.2em] font-black">Users Protected</div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ef4444]/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        </section>
      </div>
    </main>
  );
}
