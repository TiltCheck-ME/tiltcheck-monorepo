/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
import Link from 'next/link';

const tiers = [
  {
    name: 'Sandbox',
    price: 'Free',
    eyebrow: 'Build and validate',
    summary: 'For operators integrating RGaaS without waiting on manual key issuance.',
    bullets: [
      'Email-verified sandbox app ID and secret key',
      '1,000 requests per rolling 24 hours',
      'Mock responses only, tagged with X-Mode: sandbox',
      'No trust-rollup writes while you are still testing',
    ],
  },
  {
    name: 'Production',
    price: 'Manual review',
    eyebrow: 'Ship after review',
    summary: 'For operators moving from mocked integration smoke tests to live rollout planning.',
    bullets: [
      'Admin-issued production credentials stay separate',
      'Manual compliance and abuse review before approval',
      'Quota and commercial terms scoped per operator',
      'Support contact through partners@tiltcheck.me',
    ],
  },
];

export default function OperatorPricingPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] px-4 py-24 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <header className="max-w-4xl">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-[#17c3b2]">
            RGaaS pricing and limits
          </p>
          <h1 className="text-4xl font-black uppercase tracking-tighter md:text-6xl">
            Free sandbox first.
            <br />
            Production still gets human review.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-gray-400">
            The goal is simple: let operators validate the integration path without waiting on ops, then force the real
            review gate before anything touches production. No cap, that is the whole point of a sandbox.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          {tiers.map((tier) => (
            <article key={tier.name} className="rounded-3xl border border-[#283347] bg-black/30 p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">{tier.eyebrow}</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <h2 className="text-3xl font-black uppercase tracking-tight">{tier.name}</h2>
                <p className="text-sm font-mono uppercase tracking-[0.2em] text-gray-400">{tier.price}</p>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-400">{tier.summary}</p>
              <ul className="mt-6 space-y-3 text-sm text-gray-200">
                {tier.bullets.map((bullet) => (
                  <li key={bullet} className="rounded-2xl border border-[#1d2635] bg-[#0f141d] px-4 py-3">
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-8">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">Promotion gate</p>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">Sandbox is instant. Production is earned.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-300">
                Verified operators can request production access from the keys portal. That records the intent in the
                funnel, but a human still reviews usage, compliance posture, and whether the integration looks less sus
                than a “trust us bro” launch checklist.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/operators"
                className="inline-flex items-center justify-center rounded-2xl bg-[#17c3b2] px-5 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-black transition hover:bg-[#14a99a]"
              >
                Get sandbox keys
              </Link>
              <Link
                href="/operators/keys"
                className="inline-flex items-center justify-center rounded-2xl border border-[#17c3b2]/30 px-5 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-[#17c3b2] transition hover:bg-[#17c3b2]/10"
              >
                Open operator portal
              </Link>
            </div>
          </div>
        </section>

        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
          Made for Degens. By Degens.
        </p>
      </div>
    </main>
  );
}
