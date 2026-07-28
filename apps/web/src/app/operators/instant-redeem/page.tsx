/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
import Link from 'next/link';

const FLYWHEEL = [
  {
    title: 'Player-visible badge',
    body: 'Public capabilities feed powers Instant Redeem marks on /casinos. Players see who pays now — and who still hides behind soon™.',
  },
  {
    title: 'Processor multiplier',
    body: 'One payment-processor partner enables many casino domains. Stop selling brand-by-brand when one rail covers the book.',
  },
  {
    title: 'Trust score gap',
    body: 'Enablement bumps financialPayouts +5. Operators without the badge look slower. Measurable FOMO, not vibes.',
  },
  {
    title: 'Same-rail RG lock',
    body: 'Settled redeem arms deposit cooloff. Instant exit without instant rebuy — the product reason processors care.',
  },
  {
    title: 'No scam cashouts',
    body: 'Blacklisted and critically low-trust domains are hard-blocked. Instant Redeem is not a payout rail for skem shops.',
  },
  {
    title: 'No canceled redeems',
    body: 'Cancel routes return REDEEM_IRREVOCABLE. Once Instant Redeem executes, the house cannot yank the payout theater-style.',
  },
];

const STEPS = [
  {
    title: 'Get sandbox keys',
    body: 'Sign up at /operators, verify email, copy appId + secret. Same partner auth as RGaaS.',
  },
  {
    title: 'Enable (operator or processor)',
    body: 'POST /v1/redeem/enable. Operators pass one domain. Processors pass coveredDomains[] — one contract, many badges.',
  },
  {
    title: 'Quote + execute + deposit gate',
    body: 'Paid exit, RG gates, then rebuy cooloff on the same rail. Sandbox mocks money; production stays human-gated.',
  },
];

export default function InstantRedeemPage() {
  return (
    <main className="public-page public-page--tight min-h-screen bg-[#0a0c10] px-4 py-16 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-[#17c3b2]">
            Operators / Instant Redeem
          </p>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            Built to scale. Not to beg.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-400 leading-relaxed">
            Instant Redeem does not grow by hoping every casino signs a one-off deal. It grows when
            players see who pays now, processors cover many domains under one rail, and trust scores
            punish slow exits. Operators still matter — they are not the only channel.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/operators"
              className="inline-flex items-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2] hover:bg-[#17c3b2]/20"
              data-funnel-event="cta_click"
              data-funnel-source="operators-instant-redeem"
              data-funnel-label="Get sandbox keys"
            >
              Get sandbox keys
            </Link>
            <Link
              href="/casinos"
              className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:border-[#17c3b2]/30"
              data-funnel-event="cta_click"
              data-funnel-source="operators-instant-redeem"
              data-funnel-label="See public casino badges"
            >
              See public badges
            </Link>
            <a
              href="/docs/OPERATOR-INSTANT-REDEEM-GROWTH"
              className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white"
            >
              Growth architecture
            </a>
            <a
              href="/docs/OPERATOR-INSTANT-REDEEM-PHASE5-PRODUCTION"
              className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white"
            >
              Phase 5 production
            </a>
            <a
              href="/docs/product/instant-redeem-outreach-targets"
              className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white"
            >
              Target list
            </a>
            <a
              href="/docs/product/instant-redeem-partnership-outreach"
              className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white"
            >
              Outreach email templates
            </a>
            <Link
              href="/operators/instant-redeem/readiness"
              className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white"
              data-funnel-event="cta_click"
              data-funnel-source="operators-instant-redeem"
              data-funnel-label="Team readiness"
            >
              Team readiness
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-[#17c3b2]/25 bg-[#17c3b2]/5 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">Pitch</p>
          <p className="mt-2 text-sm text-gray-200 leading-relaxed">
            Wen payout? Now. Instant Redeem turns soon™ into a paid exit — no canceled redeems, no
            scam cashouts, cooloff before the reload. Processors cover many domains. Operators get
            the badge. Fee stays <span className="font-mono text-white">150 bps</span> /{' '}
            <span className="font-mono text-white">$0.50</span> floor in sandbox.
          </p>
        </section>

        <ul className="grid gap-3 sm:grid-cols-2 text-sm">
          {FLYWHEEL.map((item) => (
            <li key={item.title} className="rounded-xl border border-[#283347] bg-black/30 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-white">{item.title}</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ul>

        <ul className="grid gap-3 sm:grid-cols-3 text-sm">
          {STEPS.map((step) => (
            <li key={step.title} className="rounded-xl border border-[#283347] bg-black/30 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-white">{step.title}</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ul>

        <section className="rounded-2xl border border-[#283347] bg-black/40 p-6 font-mono text-xs text-gray-300 overflow-x-auto">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#17c3b2]">
            Processor enable (multi-domain)
          </p>
          <pre className="whitespace-pre-wrap leading-relaxed">{`curl -X POST "https://api.tiltcheck.me/v1/redeem/enable" \\
  -H "Content-Type: application/json" \\
  -H "X-Requested-With: TiltCheckPartner" \\
  -H "X-TiltCheck-App-Id: sandbox_processor" \\
  -H "X-TiltCheck-Secret-Key: sk_sandbox_..." \\
  --data '{
    "partnerType": "processor",
    "coveredDomains": ["alpha.casino", "beta.casino", "gamma.casino"]
  }'`}</pre>
        </section>

        <section className="rounded-2xl border border-[#283347] bg-black/30 p-6 text-sm text-gray-400 leading-relaxed">
          <h2 className="text-lg font-black uppercase tracking-tight text-white">Commercial reality</h2>
          <p className="mt-2">
            Phase 5: processor/operator holds the float. TiltCheck orchestrates quote, RG gates,
            irrevocable settle intent, and rebuy cooloff — not MTL day one. Live rails stay
            human-gated. Talk{' '}
            <a className="text-[#17c3b2] hover:underline" href="mailto:partners@tiltcheck.me">
              partners@tiltcheck.me
            </a>
            .
          </p>
        </section>

        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
          Made for Degens. By Degens.
        </p>
      </div>
    </main>
  );
}
