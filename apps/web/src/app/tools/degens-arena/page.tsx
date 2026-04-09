/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06 */
import React from 'react';

export default function DegensArenaPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">DEGENS AGAINST DECENCY</p>
          <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="DEGEN TRIVIA">
            DEGEN TRIVIA
          </h1>
          <div className="inline-block border border-[#ffd700]/40 bg-[#ffd700]/5 px-4 py-2 mb-8">
            <span className="text-xs font-black font-mono text-[#ffd700] uppercase tracking-widest">WEB ARENA — COMING SOON</span>
          </div>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            The web-based trivia arena. Battle up to 10,000 concurrent players for SOL prize drops while you cool down between sessions. Skill only — no house edge, no slots, no variance.
          </p>
          <p className="text-sm text-gray-500 font-mono mt-4 max-w-xl mx-auto">
            Live trivia drops are already available in the TiltCheck Discord via <span className="text-[#17c3b2]">/triviadrop</span>. This page is the in-development web version.
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-12 text-center">What's Being Built</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 border border-[#17c3b2]/20 bg-[#17c3b2]/5">
              <h3 className="text-lg font-black uppercase mb-4 text-[#17c3b2]">Live Trivia Drops</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Scheduled and instant trivia rounds across gambling strategy, crypto, math, and degen culture. Answer fastest. Win drops. No house edge — skill only.
              </p>
            </div>

            <div className="p-8 border border-[#17c3b2]/20 bg-[#17c3b2]/5">
              <h3 className="text-lg font-black uppercase mb-4 text-[#17c3b2]">Tilt Cooldown Mechanic</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                When the extension locks your session, the Arena activates automatically. Redirect the competitive energy somewhere that doesn't cost you money. The tilt gets absorbed here instead of in your bankroll.
              </p>
            </div>

            <div className="p-8 border border-[#17c3b2]/20 bg-[#17c3b2]/5">
              <h3 className="text-lg font-black uppercase mb-4 text-[#17c3b2]">WebSocket Real-Time Engine</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Built on Socket.io with the game-arena service. Up to 10,000 concurrent players per room. Leaderboards update live. No refresh required.
              </p>
            </div>

            <div className="p-8 border border-[#17c3b2]/20 bg-[#17c3b2]/5">
              <h3 className="text-lg font-black uppercase mb-4 text-[#17c3b2]">Community Drops</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Top performers earn community drops redeemable within the TiltCheck ecosystem. Discord rank upgrades, feature unlocks, and early access slots.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 border-t border-[#283347] bg-black/40 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black uppercase mb-6">Get In Before Launch</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Beta access drops first in the Discord. Join the server, claim your Genesis role, and you'll get early access to Arena matches before public launch.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="https://discord.gg/gdBsEJfCar"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary py-3 px-6 font-black"
            >
              Join Discord for Early Access
            </a>
            <a href="/beta-tester" className="btn btn-secondary py-3 px-6 font-black">
              Apply for Beta
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
