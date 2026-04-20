/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20 */
import React from 'react';
import Link from 'next/link';

export default function GettingStartedPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="neon neon-main text-4xl md:text-5xl mb-6" data-text="START IN THE RIGHT ORDER.">
            START IN THE RIGHT ORDER.
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            If you are new to TiltCheck, this page gets you from zero to a first real session without the marketing fog.
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Path 1: Just Wanna Install */}
          <div className="group border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-8 hover:border-[#17c3b2] transition-all">
            <div className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">[ INSTALL ]</div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-3">
              Install the Extension
            </h2>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Start with the actual product. Load the extension, set your rules, and keep TiltCheck in the tab while you play.
            </p>
            <Link href="/extension" className="text-[#17c3b2] hover:underline font-bold text-sm uppercase tracking-tight">
              Open Extension Guide →
            </Link>
          </div>

          {/* Path 2: I Want to Understand */}
          <div className="group border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-8 hover:border-[#17c3b2] transition-all">
            <div className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">[ AUDIT ]</div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-3">
              Understand the Product
            </h2>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Learn what TiltCheck watches, what it can prove, and how the guardrails work before you install.
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
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              If you are spiraling, TiltCheck is not enough on its own. Use the support path now.
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
            Quick Start
          </h2>
          
          <div className="space-y-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#17c3b2] text-black font-black text-lg">
                  1
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black uppercase mb-2">Load the Beta Extension</h3>
                <p className="text-gray-300">
                  Download the beta bundle and load it in your browser. TiltCheck needs storage, active tab, and site
                  access so it can inspect session data without taking direct wallet control.
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
                <h3 className="text-lg font-black uppercase mb-2">Open a Supported Session</h3>
                <p className="text-gray-300">
                  Open a supported session. The extension wakes up in the tab where the action is happening.
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
                <h3 className="text-lg font-black uppercase mb-2">Set Your Session Rules</h3>
                <p className="text-gray-300">
                  Set your profit target, loss limit, cooldown, and any accountability settings you want active.
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
                <h3 className="text-lg font-black uppercase mb-2">Let TiltCheck watch</h3>
                <p className="text-gray-300">
                  TiltCheck reads the session, checks drift and fairness signals, and translates the risk into plain
                  English while you play.
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
                <h3 className="text-lg font-black uppercase mb-2">Act on the signal</h3>
                <p className="text-gray-300">
                  Cash out when you hit the line. Stop when the loss cap hits. The point is not more action. The point
                  is a cleaner exit.
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
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Live session reads while you play</li>
                <li>• RTP drift warnings when numbers look worse than expected</li>
                <li>• Tilt pattern checks that call out risky session behavior</li>
                <li>• Manual bet verification when you have the fairness inputs</li>
              </ul>
            </div>

            <div className="p-6 border border-[#283347] bg-black/40">
              <h3 className="text-lg font-black uppercase mb-3 text-[#17c3b2] flex items-center gap-2">
                <span className="w-2 h-2 bg-[#17c3b2]"></span>
                Automated Profit Protection
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Profit targets and stop-loss guardrails</li>
                <li>• Cooldown prompts when a session runs too hot</li>
                <li>• Vault and cash-out flows designed to protect wins</li>
                <li>• Accountability options when you want backup</li>
              </ul>
            </div>

            <div className="p-6 border border-[#283347] bg-black/40">
              <h3 className="text-lg font-black uppercase mb-3 text-[#17c3b2] flex items-center gap-2">
                <span className="w-2 h-2 bg-[#17c3b2]"></span>
                Trust Engine Access
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Public casino trust scores and reputation signals</li>
                <li>• Scam link and domain checks before you click</li>
                <li>• Withdrawal risk and trust intel</li>
                <li>• Bonus and offer tracking for public surfaces</li>
              </ul>
            </div>

            <div className="p-6 border border-[#283347] bg-black/40">
              <h3 className="text-lg font-black uppercase mb-3 text-[#17c3b2] flex items-center gap-2">
                <span className="w-2 h-2 bg-[#17c3b2]"></span>
                Community Tools
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Discord paths for support and product updates</li>
                <li>• Guardian workflows for accountability</li>
                <li>• Shared session context where the product supports it</li>
                <li>• Public education surfaces that explain the stack</li>
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
          
          <div className="p-8 border border-[#ef4444]/20 bg-[#ef4444]/5 space-y-3 text-gray-300">
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
            This is the tool. You decide what to do with it.
          </h2>
          <p className="text-gray-300 mb-8">
            Everything else depends on whether you listen when the numbers tell you to stop.
          </p>
          <a href="/extension" className="btn btn-primary py-4 px-8 text-lg font-black">
            Install the Extension &rarr;
          </a>
        </div>
      </section>
    </main>
  );
}
