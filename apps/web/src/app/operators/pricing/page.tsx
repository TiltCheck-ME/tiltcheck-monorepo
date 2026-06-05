/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
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
    <main className="public-page public-page--tight min-h-screen bg-[#0a0c10] px-4 py-16 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-[#17c3b2]">RGaaS pricing</p>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Free sandbox. Production by review.</h1>
          <p className="mt-3 text-sm text-gray-400">Validate integration without ops wait — then earn production access.</p>
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

        <section className="rounded-2xl border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-6">
          <h2 className="text-lg font-black uppercase tracking-tight">Production = human review</h2>
          <p className="mt-2 text-sm text-gray-300">
            Request from the keys portal after sandbox smoke tests. partners@tiltcheck.me for commercial terms.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/operators" className="inline-flex items-center rounded-xl bg-[#17c3b2] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-black hover:bg-[#14a99a]">
              Get sandbox keys
            </Link>
            <Link href="/operators/keys" className="inline-flex items-center rounded-xl border border-[#17c3b2]/30 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2] hover:bg-[#17c3b2]/10">
              Key portal
            </Link>
          </div>
        </section>

        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
          Made for Degens. By Degens.
        </p>
      </div>
    </main>
  );
}
