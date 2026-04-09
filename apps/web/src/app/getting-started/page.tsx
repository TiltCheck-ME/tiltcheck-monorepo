/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
import React from 'react';
import Link from 'next/link';

export default function GettingStartedPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="neon neon-main text-4xl md:text-5xl mb-6" data-text="START HERE">
            START HERE
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Three choices. Pick one. The math doesn't care which you choose — it just cares that you're informed.
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Path 1: Just Wanna Install */}
          <div className="group border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-8 hover:border-[#17c3b2] transition-all">
            <div className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">[ DEPLOY ]</div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-3">
              Just Install & Go
            </h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              You know the drill. Download the extension. Set your limits. Play. That's it.
            </p>
            <Link href="/extension" className="text-[#17c3b2] hover:underline font-bold text-sm uppercase tracking-tight">
              Skip to Extension →
            </Link>
          </div>

          {/* Path 2: I Want to Understand */}
          <div className="group border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-8 hover:border-[#17c3b2] transition-all">
            <div className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">[ AUDIT ]</div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-3">
              Show Me the Math
            </h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              RTP mechanics. Variance. How we detect tilt. The science behind the signals.
            </p>
            <Link href="/how-it-works" className="text-[#17c3b2] hover:underline font-bold text-sm uppercase tracking-tight">
              Read How It Works →
            </Link>
          </div>

          {/* Path 3: I'm in Crisis */}
          <div className="group border border-[#ef4444]/30 bg-[#ef4444]/5 p-8 hover:border-[#ef4444] transition-all">
            <div className="text-xs font-mono text-[#ef4444] uppercase tracking-widest mb-4">[ HELP ]</div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-3">
              Help & Resources
            </h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              If you're spiraling, we can't code your way out. But resources exist. Let's get real.
            </p>
            <Link href="/touch-grass" className="text-[#ef4444] hover:underline font-bold text-sm uppercase tracking-tight">
              Get Real Help →
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-20 px-4 border-t border-[#283347]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-12">
            Quick Start (5 mins)
          </h2>
          
          <div className="space-y-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#17c3b2] text-black font-black text-lg">
                  1
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black uppercase mb-2">Install from Chrome Web Store</h3>
                <p className="text-gray-400">
                  Search "TiltCheck" or visit the link. One click. Requires storage, active tab, and site access — that's what the Audit Layer needs to inspect game telemetry. You own the data.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#17c3b2] text-black font-black text-lg">
                  2
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black uppercase mb-2">Open Your Favorite Casino</h3>
                <p className="text-gray-400">
                  Hit Stake. Rollbit. BC.Game. Whatever. The extension wakes up and starts watching.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#17c3b2] text-black font-black text-lg">
                  3
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black uppercase mb-2">Click the TiltCheck Icon</h3>
                <p className="text-gray-400">
                  Set your profit target. Set your loss limit. Set a tilt threshold. Pick a Guardian.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#17c3b2] text-black font-black text-lg">
                  4
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black uppercase mb-2">Play</h3>
                <p className="text-gray-400">
                  You'll get nudges. Real signals. When you hit a limit? The UI locks. No escape hatch.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#17c3b2] text-black font-black text-lg">
                  5
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black uppercase mb-2">Cash Out or Take the L</h3>
                <p className="text-gray-400">
                  You win = you cash out. You lose limit = you walk. Both happen. The math handles it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20 px-4 border-t border-[#283347] bg-black/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-12">
            What You Actually Get
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 border border-[#283347] bg-black/40">
              <h3 className="text-lg font-black uppercase mb-3 text-[#17c3b2] flex items-center gap-2">
                <span className="w-2 h-2 bg-[#17c3b2]"></span>
                Real-Time Audit Signals
              </h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• RNG verification on every game</li>
                <li>• Variance tracking (is the house cheating or are you just unlucky?)</li>
                <li>• Tilt pattern detection (3 losses in a row = you're in danger)</li>
                <li>• RTP drift alerts (casino's edge just got worse)</li>
              </ul>
            </div>

            <div className="p-6 border border-[#283347] bg-black/40">
              <h3 className="text-lg font-black uppercase mb-3 text-[#17c3b2] flex items-center gap-2">
                <span className="w-2 h-2 bg-[#17c3b2]"></span>
                Automated Profit Protection
              </h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Auto-vault when you hit profit target</li>
                <li>• Mandatory cooldown on loss limits</li>
                <li>• Session lock (uninstall = your choice, but you'll remember)</li>
                <li>• Guardian alerts (your buddy gets a ping)</li>
              </ul>
            </div>

            <div className="p-6 border border-[#283347] bg-black/40">
              <h3 className="text-lg font-black uppercase mb-3 text-[#17c3b2] flex items-center gap-2">
                <span className="w-2 h-2 bg-[#17c3b2]"></span>
                Trust Engine Access
              </h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Casino fairness scores (updated hourly)</li>
                <li>• Scam link detection (SusLink integration)</li>
                <li>• Peer trust data (what other degens are saying)</li>
                <li>• Withdrawal delay alerts</li>
              </ul>
            </div>

            <div className="p-6 border border-[#283347] bg-black/40">
              <h3 className="text-lg font-black uppercase mb-3 text-[#17c3b2] flex items-center gap-2">
                <span className="w-2 h-2 bg-[#17c3b2]"></span>
                Community Tools
              </h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Discord integration for accountability</li>
                <li>• Guardian system (designate who can check on you)</li>
                <li>• Session sharing (transparent stats)</li>
                <li>• Degen Advisor AI (real talk, no BS)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* What You Don't Get */}
      <section className="py-20 px-4 border-t border-[#283347]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-12">
            What You DON'T Get
          </h2>
          
          <div className="p-8 border border-[#ef4444]/20 bg-[#ef4444]/5 space-y-3 text-gray-400">
            <p><strong className="text-white">No Magic.</strong> This isn't a guaranteed win system. The math still favors the house long-term. We just give you better visibility and forced stop points.</p>
            <p><strong className="text-white">No Custody.</strong> We don't hold your money. You do. If you send it to the wrong wallet, it's gone. That's on you.</p>
            <p><strong className="text-white">No Treatment.</strong> If you have a gambling disorder, this is harm reduction, not a cure. Talk to a professional.</p>
            <p><strong className="text-white">No Guarantees.</strong> Casinos can change. Odds shift. Markets move. We audit in real-time, but we're not fortune tellers.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 border-t border-[#283347] text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-6">
            You get one shot at clarity.
          </h2>
          <p className="text-gray-400 mb-8">
            Everything else depends on you. Your discipline. Your honesty. Your willingness to listen when the math says no.
          </p>
          <a href="/extension" className="btn btn-primary py-4 px-8 text-lg font-black">
            Let's Go
          </a>
        </div>
      </section>
    </main>
  );
}
