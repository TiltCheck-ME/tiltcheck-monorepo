/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
import React from 'react';

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="neon neon-main text-4xl md:text-5xl mb-6" data-text="HOW WE ENFORCE THE MATH">
            HOW WE ENFORCE THE MATH
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            The house wins because they control the math. TiltCheck is the forensic layer that cross-references every spin against GLI-certified manufacturer RTP tiers. We don't monitor you. <span className="text-[#17c3b2] font-bold">We prosecute them.</span>
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
                  DEPLOY
                </h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Install the extension and sync your forensic node. It requires storage, active tab access, and site permissions — the minimum needed for the Audit Layer to inspect game telemetry and sync session state without phoning home. Your seed phrase stays yours, your keys stay yours, and the casino gets zero warning it's being audited.
                </p>
                <div className="p-4 bg-[#17c3b2]/5 border border-[#17c3b2]/20 text-sm text-gray-300 font-mono">
                  → One install. Zero custody. A forensic layer between you and the shadow-nerfed math.
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
                  THE LIVE AUDIT
                </h2>
                <p className="text-gray-400 leading-relaxed mb-2">
                  We don't just monitor you. Every spin is cross-referenced in real-time against our database of <span className="text-white font-bold">GLI-certified manufacturer RTP tiers</span> — the gold standard that slot providers certify before a game ships.
                </p>
                <p className="text-gray-400 leading-relaxed mb-4">
                  When the casino deploys the "Greedy" version of your slot (88% instead of the certified 96.5%), the Delta Engine flags it immediately and surfaces the Greed Premium you're paying per $100 wagered.
                </p>
                <div className="p-4 bg-[#17c3b2]/5 border border-[#17c3b2]/20 text-sm text-gray-300 font-mono">
                  → Live example: "Gates of Olympus — certified 96.5% / platform running 92.0%. Greed Premium: $4.50 per $100 wagered."
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
                  ENFORCE
                </h2>
                <p className="text-gray-400 leading-relaxed mb-2">
                  When the math breaks, we don't just alert you. The "Generate Evidence" trigger stays locked until the community sample reaches 5,000+ spins — enough for a statistically valid binomial z-test.
                </p>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Once unlocked, the system generates a <span className="text-white font-bold">Certified Evidence Packet</span> — binomial z-score, GLI tier proof, and scraped casino metadata — pre-formatted for direct upload to the Malta Gaming Authority or Curacao eGaming complaint portals. Your bag is locked simultaneously before the tilt-tax takes the rest.
                </p>
                <div className="p-4 bg-[#ef4444]/5 border border-[#ef4444]/20 text-sm text-gray-300 font-mono">
                  → When the math breaks, we generate the receipts and lock your bag. They picked the wrong degens to nerf.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 border-t border-[#283347] bg-black/40">
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-12 text-center">
            COMMON FEARS
          </h2>
          
          <div className="space-y-6">
            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between p-6 bg-[#17c3b2]/5 border border-[#17c3b2]/20 hover:bg-[#17c3b2]/10 transition-all">
                <span className="font-black uppercase tracking-tight">Do you see my wallet key?</span>
                <span className="text-[#17c3b2] group-open:rotate-180 transition-transform">+</span>
              </summary>
              <div className="p-6 bg-black border border-[#283347] border-t-0 text-gray-400">
                No. We never ask for it. We don't want it. We don't store it. The forensic node reads your browser's activity on gambling sites — nothing else. Your keys are yours.
              </div>
            </details>

            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between p-6 bg-[#17c3b2]/5 border border-[#17c3b2]/20 hover:bg-[#17c3b2]/10 transition-all">
                <span className="font-black uppercase tracking-tight">What is a "Greed Premium"?</span>
                <span className="text-[#17c3b2] group-open:rotate-180 transition-transform">+</span>
              </summary>
              <div className="p-6 bg-black border border-[#283347] border-t-0 text-gray-400">
                Slot providers certify their games at multiple RTP tiers. A game certified at 96.5% can be legally deployed by a casino at 88%. That 8.5% gap is the Greed Premium — money extracted from you above and beyond the already unfavorable base odds. The Delta Engine shows you this number in real-time, per $100 wagered.
              </div>
            </details>

            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between p-6 bg-[#17c3b2]/5 border border-[#17c3b2]/20 hover:bg-[#17c3b2]/10 transition-all">
                <span className="font-black uppercase tracking-tight">How does the Evidence Packet work?</span>
                <span className="text-[#17c3b2] group-open:rotate-180 transition-transform">+</span>
              </summary>
              <div className="p-6 bg-black border border-[#283347] border-t-0 text-gray-400">
                <p className="mb-2">The trigger stays locked until the community sample hits 5,000+ spins — the minimum for a statistically valid binomial z-test. Below that, it stays locked. We will not send you to a regulator with junk data.</p>
                <p>When it unlocks, the packet is pre-filled for direct upload to the Malta Gaming Authority or Curacao eGaming complaint portals.</p>
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
            <h2 className="text-2xl font-black uppercase tracking-tight mb-6">
            READY TO SEE WHAT THE CASINO DOESN&apos;T WANT YOU TO SEE?
          </h2>
          <p className="text-gray-400 mb-8">
            Install the forensic node. The Delta Engine (our live RTP cross-reference layer) does the rest. They picked the wrong degens to nerf.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/extension" className="btn btn-primary py-3 px-6 font-black">
              Install the Extension →
            </a>
            <a href="https://discord.gg/gdBsEJfCar" target="_blank" rel="noopener noreferrer" className="btn btn-secondary py-3 px-6 font-black">
              Join Discord
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
