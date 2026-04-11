/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11 */
"use client";
import React, { useState } from 'react';

export default function BlogPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24 max-w-4xl mx-auto">
      <section className="w-full mb-12">
        <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">[INTEL_FEED]</p>
        <h1 className="neon neon-main text-4xl md:text-6xl mb-4 font-black uppercase tracking-tighter" data-text="DEGEN INTEL">
          DEGEN INTEL
        </h1>
        <p className="text-gray-400 max-w-2xl border-l-2 border-[#17c3b2] pl-4 py-2 font-mono text-sm">
          Clinical analysis of variance, RTP anomalies, and the mathematical reality of your dopamine addiction.
          No fluff. No apologies. Updated every 72 hours by TiltCheck analysts.
        </p>
      </section>

      <div className="w-full border border-[#283347] bg-black/60 p-10 md:p-16 text-center flex flex-col items-center gap-8">
        <div className="inline-block border border-[#ffd700]/40 bg-[#ffd700]/5 px-4 py-2">
          <span className="text-xs font-black font-mono text-[#ffd700] uppercase tracking-widest">LAUNCHING SOON</span>
        </div>

        <div className="max-w-lg">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
            The intel feed is loading.
          </h2>
          <p className="text-gray-400 font-mono text-sm leading-relaxed">
            We are documenting every RTP anomaly, withdrawal pattern, and house edge manipulation we find.
            When this launches, it will not be a blog. It will be a public record.
          </p>
        </div>

        <div className="w-full max-w-md">
          {submitted ? (
            <div className="p-4 border border-[#17c3b2]/40 bg-[#17c3b2]/10 font-mono text-sm text-[#17c3b2] uppercase tracking-widest">
              Logged. You will be first in.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 bg-black border border-[#283347] px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#17c3b2] transition-colors"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#17c3b2] text-black font-black text-xs uppercase tracking-widest hover:bg-[#48d5c6] transition-colors whitespace-nowrap"
              >
                Notify Me
              </button>
            </form>
          )}
          <p className="text-xs text-gray-600 font-mono mt-3 uppercase tracking-widest">
            No spam. One email when it drops.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center mt-4">
          <a
            href="/tools/session-stats"
            className="text-xs font-black uppercase tracking-widest text-[#17c3b2] hover:underline font-mono"
          >
            Nerf Radar (Live) &rarr;
          </a>
          <a
            href="/tools/house-edge-scanner"
            className="text-xs font-black uppercase tracking-widest text-[#17c3b2] hover:underline font-mono"
          >
            Delta Engine &rarr;
          </a>
          <a
            href="https://discord.gg/gdBsEJfCar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-[#17c3b2] font-mono transition-colors"
          >
            Discord (Degen Intel channel) &rarr;
          </a>
        </div>
      </div>

      <footer className="mt-20 py-8 text-center text-xs text-gray-600 uppercase tracking-[0.3em]">
        Made for Degens. By Degens.
      </footer>
    </main>
  );
}
