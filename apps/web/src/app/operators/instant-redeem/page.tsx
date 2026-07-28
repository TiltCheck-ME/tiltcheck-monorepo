/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
import Link from 'next/link';

const STEPS = [
  {
    title: 'Get sandbox keys',
    body: 'Sign up at /operators, verify email, copy appId + secret. Same partner auth as RGaaS.',
  },
  {
    title: 'Quote the exit',
    body: 'POST /v1/redeem/quote with playerRef, amount, destination rail. Fee = cost of not waiting soon™.',
  },
  {
    title: 'Execute with RG gates',
    body: 'POST /v1/redeem/execute with quoteId + idempotencyKey. Tilt / self-exclusion markers block. High amounts pend review.',
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
            Wen payout? Now.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-400 leading-relaxed">
            White-label Instant Redeem for licensed cashiers. Operator-sanctioned liquidity desk —
            not a pirate middle wallet. Sandbox quotes and settles mocks today; production float stays
            human-gated.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/operators"
              className="inline-flex items-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2] hover:bg-[#17c3b2]/20"
            >
              Get sandbox keys
            </Link>
            <Link
              href="/operators/pricing"
              className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:border-[#17c3b2]/30"
            >
              Pricing
            </Link>
            <a
              href="/docs/OPERATOR-INSTANT-REDEEM"
              className="inline-flex items-center rounded-xl border border-[#283347] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white"
            >
              API spec
            </a>
          </div>
        </header>

        <section className="rounded-2xl border border-[#17c3b2]/25 bg-[#17c3b2]/5 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">Sandbox default</p>
          <p className="mt-2 text-sm text-gray-200 leading-relaxed">
            Fee: <span className="font-mono text-white">150 bps</span> (1.5%), floor{' '}
            <span className="font-mono text-white">$0.50</span>. ETA mock: ~60s. Standard redeem stays
            free-and-slow. Instant Redeem is paid-and-now.
          </p>
        </section>

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
            Smoke curl
          </p>
          <pre className="whitespace-pre-wrap leading-relaxed">{`curl -X POST "https://api.tiltcheck.me/v1/redeem/quote" \\
  -H "Content-Type: application/json" \\
  -H "X-Requested-With: TiltCheckPartner" \\
  -H "X-TiltCheck-App-Id: sandbox_your_app" \\
  -H "X-TiltCheck-Secret-Key: sk_sandbox_..." \\
  --data '{
    "playerRef": "player_abc",
    "amount": 100,
    "currency": "USD",
    "destination": { "rail": "ach", "accountRef": "acct_****1234" }
  }'`}</pre>
        </section>

        <section className="rounded-2xl border border-[#283347] bg-black/30 p-6 text-sm text-gray-400 leading-relaxed">
          <h2 className="text-lg font-black uppercase tracking-tight text-white">What this is not</h2>
          <p className="mt-2">
            Not a consumer app that jumps casino ToS. Not TiltCheck holding player bankroll. Production
            Instant Redeem only ships under operator contract with float terms — talk{' '}
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
