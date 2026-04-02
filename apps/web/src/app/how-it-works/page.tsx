/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
import React from 'react';

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="HOW WE TIP THE SCALE">
            HOW WE TIP THE SCALE
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            The house wins because they have 24/7, the math, and your dopamine receptors. TiltCheck levels the field with real-time audit signals, trust scores, and one brutal truth: <span className="text-[#17c3b2] font-bold">we can count too.</span>
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-16">
            {/* Step 1 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-16 w-16 rounded-none bg-[#17c3b2] text-black font-black text-xl">
                  01
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-[#17c3b2]">
                  INSTALL THE EXTENSION
                </h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  The Chrome extension is a read-only audit layer. It doesn't ask for your seed phrase, your wallet keys, or your mama's maiden name. It just monitors what's happening on your screen in real-time.
                </p>
                <div className="p-4 bg-[#17c3b2]/5 border border-[#17c3b2]/20 text-sm text-gray-300 font-mono">
                  → Install from Chrome Web Store. No BS, no sketchy permissions.
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-16 w-16 rounded-none bg-[#17c3b2] text-black font-black text-xl">
                  02
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-[#17c3b2]">
                  SET YOUR TARGETS
                </h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Define your session exit points before you play. Profit target? Tilt limit? Loss ceiling? The system watches for you. When you hit your line, the UI locks. No wiggle room. No "just one more bet."
                </p>
                <div className="p-4 bg-[#ffd700]/5 border border-[#ffd700]/20 text-sm text-gray-300 font-mono">
                  → Example: "Lock me out if I'm down $200 OR I've won $100."
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-16 w-16 rounded-none bg-[#17c3b2] text-black font-black text-xl">
                  03
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-[#17c3b2]">
                  GET REAL-TIME SIGNALS
                </h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Your session feeds into our audit engine. We check RNG signatures. We track variance. We spot tilt patterns. If the math looks wrong or your behavior does, you get a nudge — not a lecture. Just the data.
                </p>
                <div className="p-4 bg-[#ef4444]/5 border border-[#ef4444]/20 text-sm text-gray-300 font-mono">
                  → Real example: "3 losses in a row. The house loves this momentum."
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-16 w-16 rounded-none bg-[#17c3b2] text-black font-black text-xl">
                  04
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-[#17c3b2]">
                  LOCK YOUR WINS / TAKE THE L
                </h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  When your profit target hits, you get one chance to cash out before the lock engages. If you blow past it? The site is frozen. You can't bet. Can't chase. Can't spiral. You've got a mandatory break.
                </p>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Or you hit your loss limit. Same deal. Out. The money you have left is protected.
                </p>
                <div className="p-4 bg-[#17c3b2]/5 border border-[#17c3b2]/20 text-sm text-gray-300 font-mono">
                  → This is not a suggestion. The UI goes dark. Go touch grass.
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-16 w-16 rounded-none bg-[#17c3b2] text-black font-black text-xl">
                  05
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-[#17c3b2]">
                  REJOIN THE COMMUNITY
                </h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Use our Discord for accountability. Invite a Guardian (trusted friend). Get alerts when you're heading into danger. Share wins. Call out the bullshit. The whole point is that you're not alone in this.
                </p>
                <div className="p-4 bg-[#17c3b2]/5 border border-[#17c3b2]/20 text-sm text-gray-300 font-mono">
                  → Community = your firewall against tilt.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 border-t border-[#283347] bg-black/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black uppercase tracking-tight mb-12 text-center">
            COMMON FEARS
          </h2>
          
          <div className="space-y-6">
            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between p-6 bg-[#17c3b2]/5 border border-[#17c3b2]/20 hover:bg-[#17c3b2]/10 transition-all">
                <span className="font-black uppercase tracking-tight">Do you see my wallet key?</span>
                <span className="text-[#17c3b2] group-open:rotate-180 transition-transform">+</span>
              </summary>
              <div className="p-6 bg-black border border-[#283347] border-t-0 text-gray-400">
                No. We never ask for it. We don't want it. We don't store it. The extension reads your browser's activity on gambling sites — nothing else. Your keys are yours.
              </div>
            </details>

            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between p-6 bg-[#17c3b2]/5 border border-[#17c3b2]/20 hover:bg-[#17c3b2]/10 transition-all">
                <span className="font-black uppercase tracking-tight">Can I bypass the lock?</span>
                <span className="text-[#17c3b2] group-open:rotate-180 transition-transform">+</span>
              </summary>
              <div className="p-6 bg-black border border-[#283347] border-t-0 text-gray-400">
                Technically? Yes. You can uninstall the extension. But if you're thinking about that, you've already lost. The lock isn't meant to be bulletproof — it's meant to give you a second to think.
              </div>
            </details>

            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between p-6 bg-[#17c3b2]/5 border border-[#17c3b2]/20 hover:bg-[#17c3b2]/10 transition-all">
                <span className="font-black uppercase tracking-tight">Does this work on mobile?</span>
                <span className="text-[#17c3b2] group-open:rotate-180 transition-transform">+</span>
              </summary>
              <div className="p-6 bg-black border border-[#283347] border-t-0 text-gray-400">
                Not yet. Chrome extension is desktop-only. Mobile version is in progress. For now, set your loss limit on desktop before you gamble on mobile.
              </div>
            </details>

            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between p-6 bg-[#17c3b2]/5 border border-[#17c3b2]/20 hover:bg-[#17c3b2]/10 transition-all">
                <span className="font-black uppercase tracking-tight">What if I'm already in crisis?</span>
                <span className="text-[#17c3b2] group-open:rotate-180 transition-transform">+</span>
              </summary>
              <div className="p-6 bg-black border border-[#283347] border-t-0 text-gray-400">
                This tool is harm reduction, not treatment. If you've lost money you can't afford to lose, reach out to the National Council on Problem Gambling (1-800-GAMBLER) or visit <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer" className="text-[#17c3b2] hover:underline">ncpg.org</a>. Real talk: get help.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 text-center border-t border-[#283347]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-6">
            Ready to tip the scale?
          </h2>
          <p className="text-gray-400 mb-8">
            Install the extension. Set your limits. Get signals. Keep your wins. It's that simple.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/extension" className="btn btn-primary py-3 px-6 font-black">
              Get the Extension
            </a>
            <a href="#" className="btn btn-secondary py-3 px-6 font-black">
              Join Discord
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
