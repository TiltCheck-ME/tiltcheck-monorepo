/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
import Link from 'next/link';
import BrandTagline from '@/components/BrandTagline';

const tiers = [
  {
    name: 'Sandbox',
    price: 'Free',
    eyebrow: 'Build and validate',
    summary: 'For operators and processors integrating RGaaS and Instant Redeem without waiting on manual key issuance.',
    bullets: [
      'Email-verified sandbox app ID and secret key',
      '1,000 requests per rolling 24 hours',
      'Mock responses only, tagged with X-Mode: sandbox',
      'Instant Redeem quote + execute + deposit cooloff stubs',
      'Public capability registry + /casinos badge after enable',
      'No trust-rollup writes from mock settle alone',
    ],
  },
  {
    name: 'Processor',
    price: 'Multi-domain',
    eyebrow: 'Scale channel',
    summary: 'One commercial identity covers many casino domains — the growth path that does not require brand-by-brand BD.',
    bullets: [
      'partnerType: processor with coveredDomains[]',
      'One enable call → many Instant Redeem badges',
      'Same-rail rebuy cooloff across covered merchants',
      'Fee share and float terms scoped per processor book',
      'Primary GTM path before direct casino sales',
    ],
  },
  {
    name: 'Production',
    price: 'Manual review',
    eyebrow: 'Ship after review',
    summary: 'Phase 5 grant path: float desk terms signed, then production credentials can hit Instant Redeem.',
    bullets: [
      'POST /v1/redeem/production/request with processor|operator float caps',
      'Internal approve — grant approved still != live settlement flag',
      'Processor holds float; TiltCheck orchestrates only (no MTL day one)',
      'Quota and commercial terms scoped per partner',
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
          <p className="mt-3 text-sm text-gray-400">
            Validate trust signals and Instant Redeem without ops wait — then earn production access.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
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
          <h2 className="text-lg font-black uppercase tracking-tight">Instant Redeem fee (sandbox default)</h2>
          <p className="mt-2 text-sm text-gray-300">
            150 bps (1.5%), $0.50 floor. That fee is the cost of not waiting soon™. Production float and
            fee share stay contract-scoped via partners@tiltcheck.me.
          </p>
          <p className="mt-3 text-sm text-gray-400 leading-relaxed">
            Phase 5 custody: processor or operator holds the float. TiltCheck orchestrates quote, RG gates,
            irrevocable settle intent, and rebuy cooloff — not MTL day one. Approve grant != live money.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/operators/instant-redeem" className="inline-flex items-center rounded-xl bg-[#17c3b2] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-black hover:bg-[#14a99a]">
              Instant Redeem
            </Link>
            <a href="/docs/OPERATOR-INSTANT-REDEEM-PHASE5-PRODUCTION" className="inline-flex items-center rounded-xl border border-[#17c3b2]/30 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2] hover:bg-[#17c3b2]/10">
              Phase 5 contract
            </a>
            <a href="/docs/product/instant-redeem-partnership-outreach" className="inline-flex items-center rounded-xl border border-[#17c3b2]/30 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2] hover:bg-[#17c3b2]/10">
              Outreach templates
            </a>
            <Link href="/operators" className="inline-flex items-center rounded-xl border border-[#17c3b2]/30 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2] hover:bg-[#17c3b2]/10">
              Get sandbox keys
            </Link>
          </div>
        </section>

        <p className="text-center text-gray-500">
          <BrandTagline compact />
        </p>
      </div>
    </main>
  );
}
