/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */
import { GRADING_METHODOLOGY_STEPS, TRUST_PILLAR_DEFINITIONS } from '@/lib/casino-trust';

export default function CasinoGradingMethodology() {
  return (
    <section id="grading-methodology" className="public-page-section px-4 scroll-mt-28">
      <div className="landing-shell">
        <div className="rounded-2xl border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-6 md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2] mb-2">
            Show the work
          </p>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-3">
            How grades are built
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed max-w-3xl mb-6">
            Every card on this page shows the same inputs we use before you open the full audit. Letter grade,
            pillar split, license basis, and known issues — live overlay only when the feed actually matches.
          </p>

          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {GRADING_METHODOLOGY_STEPS.map((step, index) => (
              <li key={step.title} className="rounded-xl border border-[#283347] bg-black/30 p-4">
                <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-2">
                  Step {index + 1}
                </p>
                <p className="text-sm font-black uppercase tracking-wide text-white mb-2">{step.title}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3">
              Five pillars on every card
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TRUST_PILLAR_DEFINITIONS.map((pillar) => (
                <li key={pillar.key} className="rounded-lg border border-[#283347] bg-black/25 px-3 py-3">
                  <p className="text-xs font-black uppercase tracking-wide text-white">{pillar.label}</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{pillar.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
