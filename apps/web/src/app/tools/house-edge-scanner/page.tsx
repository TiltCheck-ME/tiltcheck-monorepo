/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06 */
import React from 'react';

export default function HouseEdgeScannerPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">RTP FORENSICS</p>
          <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="THE DELTA ENGINE">
            THE DELTA ENGINE
          </h1>
          <div className="inline-block border border-[#ffd700]/40 bg-[#ffd700]/5 px-4 py-2 mb-8">
            <span className="text-xs font-black font-mono text-[#ffd700] uppercase tracking-widest">IN DEVELOPMENT — COMING SOON</span>
          </div>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono">
            The house says it pays 96.5%. Your session is running 88%. The House Edge Scanner finds the gap and surfaces the Greed Premium in real-time, per $100 wagered.
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-12 text-center">How It Will Work</h2>

          <div className="space-y-8">
            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 bg-[#17c3b2] text-black font-black text-lg">
                01
              </div>
              <div>
                <h3 className="text-lg font-black uppercase mb-2 text-[#17c3b2]">Live Session Telemetry</h3>
                <p className="text-gray-400 leading-relaxed">
                  The browser extension captures your spin outcomes in real-time — bet size, result, running balance, game identifier. No screenshots. No manual input. Passive.
                </p>
              </div>
            </div>

            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 bg-[#17c3b2] text-black font-black text-lg">
                02
              </div>
              <div>
                <h3 className="text-lg font-black uppercase mb-2 text-[#17c3b2]">GLI Tier Cross-Reference</h3>
                <p className="text-gray-400 leading-relaxed">
                  Every outcome is compared against the manufacturer-certified RTP tiers from our database — the same numbers GLI and eCOGRA stamp on the game before it ships. We know the max tier. We know the floor.
                </p>
              </div>
            </div>

            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 bg-[#17c3b2] text-black font-black text-lg">
                03
              </div>
              <div>
                <h3 className="text-lg font-black uppercase mb-2 text-[#17c3b2]">Greed Premium Calculation</h3>
                <p className="text-gray-400 leading-relaxed">
                  After a statistically meaningful sample, the engine calculates the delta between your observed return and the certified maximum: the Greed Premium. Expressed in dollars per $100 wagered — a number you can actually understand.
                </p>
                <div className="mt-4 p-4 bg-black border border-[#283347] font-mono text-sm">
                  <span className="text-gray-500">Example: </span>
                  <span className="text-white">Gates of Olympus — Certified 96.5% / Observed 91.8%</span><br />
                  <span className="text-[#ef4444] font-black">Greed Premium: $4.70 per $100 wagered</span>
                </div>
              </div>
            </div>

            <div className="flex gap-8 items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 bg-[#17c3b2] text-black font-black text-lg">
                04
              </div>
              <div>
                <h3 className="text-lg font-black uppercase mb-2 text-[#17c3b2]">Evidence Packet Trigger</h3>
                <p className="text-gray-400 leading-relaxed">
                  Once the community sample across a platform reaches 5,000+ spins, the statistical threshold is met and a Certified Evidence Packet can be generated — binomial z-score, GLI tier proof, and platform metadata pre-formatted for regulatory submission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 border-t border-[#283347] bg-black/40">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-black uppercase mb-6">While You Wait</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            The Nerf Radar is live now. It shows the certified RTP spread for every major slot — the gap a casino can legally exploit per game, sourced from GLI, eCOGRA, and BMM certification data.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/tools/session-stats" className="btn btn-primary py-3 px-6 font-black">
              View the Nerf Radar
            </a>
            <a href="https://discord.gg/gdBsEJfCar" target="_blank" rel="noopener noreferrer" className="btn btn-secondary py-3 px-6 font-black">
              Join Beta Waitlist on Discord
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
