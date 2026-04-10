/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10 */
import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 text-white">
      <div className="max-w-xl w-full text-center flex flex-col gap-10 animate-in fade-in duration-500">
        <header>
          <h1
            className="neon neon-main neon-hero-bottom text-7xl font-black uppercase tracking-tighter mb-2"
            data-text="FUCK."
          >
            FUCK.
          </h1>
          <div className="inline-block bg-red-600/10 border border-red-600/20 px-3 py-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-red-500">
              CRITICAL_FAILURE: ARCHITECTURAL_JUDGMENT_NOT_FOUND
            </p>
          </div>
        </header>

        <section className="relative p-10 border-l-2 border-[#17c3b2]/30 bg-white/[0.02] text-left">
          <p className="font-mono text-sm text-gray-300 mb-6 leading-relaxed">
            The page you are looking for has been scrubbed, relocated, or Jme simply pushed broken code to production while distracted by a high-multiplier Plinko run.
          </p>

          <p className="text-xs text-[#17c3b2] font-mono italic mb-10 border-b border-white/5 pb-6">
            &quot;The house takes your money. Jme takes your uptime. Neither of them are sorry.&quot;
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/"
              className="px-6 py-4 bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/20 uppercase text-[10px] font-black tracking-widest hover:bg-[#17c3b2]/20 transition-all text-center"
            >
              &gt; BACK_TO_SAFETY
            </Link>

            <Link
              href="https://discord.gg/gdBsEJfCar"
              className="px-6 py-4 border border-white/10 text-gray-500 uppercase text-[10px] font-black tracking-widest hover:text-red-500 hover:border-red-500/30 transition-all text-center"
            >
              &gt; HARASS_THE_DEV
            </Link>
          </div>
        </section>

        <p className="text-[9px] text-gray-700 font-mono uppercase tracking-[0.4em] opacity-50">
          TILTCHECK ECOSYSTEM // ERR-404-JME
        </p>
      </div>
    </main>
  );
}
