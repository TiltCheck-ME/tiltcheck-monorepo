/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
import Link from 'next/link';
import { GRADING_METHODOLOGY_STEPS, TRUST_PILLAR_DEFINITIONS } from '@/lib/casino-trust';

export default function CasinoGradingMethodology() {
  return (
    <section id="grading-methodology" className="public-page-section px-4 scroll-mt-28">
      <div className="landing-shell">
        <details className="rounded-2xl border border-[#283347] bg-black/25 group">
          <summary className="cursor-pointer list-none px-5 py-4 md:px-6 md:py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2] mb-1">
                  Grading method
                </p>
                <p className="text-sm font-black uppercase tracking-tight text-white">
                  How letter grades are built
                </p>
              </div>
              <span className="text-[#17c3b2] text-lg font-black transition-transform group-open:rotate-45">+</span>
            </div>
          </summary>

          <div className="border-t border-[#283347] px-5 py-5 md:px-6 md:pb-6">
            <p className="text-sm text-gray-400 leading-relaxed max-w-3xl mb-6">
              Every card shows grade, pillars, license basis, and known issues. Live overlay only when the feed matches.
            </p>

            <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-6">
              {GRADING_METHODOLOGY_STEPS.map((step, index) => (
                <li key={step.title} className="rounded-xl border border-[#283347] bg-black/30 p-4">
                  <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-1">
                    Step {index + 1}
                  </p>
                  <p className="text-sm font-black uppercase tracking-wide text-white mb-1">{step.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>

            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TRUST_PILLAR_DEFINITIONS.map((pillar) => (
                <li key={pillar.key} className="rounded-lg border border-[#283347] bg-black/25 px-3 py-2">
                  <p className="text-xs font-black uppercase tracking-wide text-white">{pillar.label}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500 leading-relaxed">{pillar.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </details>

        <p className="mt-3 text-center text-[11px] text-gray-500">
          Full audit per casino:{' '}
          <Link href="/casinos" className="text-[#17c3b2] hover:underline">
            open any card
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
