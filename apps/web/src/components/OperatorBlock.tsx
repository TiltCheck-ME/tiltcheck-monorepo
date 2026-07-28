// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28

import Link from 'next/link';

const operatorBullets = [
  'B2B Instant Redeem API: quote, RG gates, irrevocable settle intent, same-rail deposit cooloff.',
  'Processors: one integration covers many casino domains. You hold the float; TiltCheck orchestrates.',
  'Sandbox mocks money. Production needs a Phase 5 float-desk grant. Live settlement stays flag-gated off.',
  'Scam and critically low-trust domains stay hard-blocked. Enablement can earn a public badge + trust bump.',
];

export default function OperatorBlock() {
  return (
    <section className="public-page-section px-4 vp-section">
      <div className="landing-shell">
        <div className="vp-column vp-column--platform public-page-card public-page-card--partner">
          <span className="brand-eyebrow brand-eyebrow--partner">For processors / operators — sandbox API</span>
          <h2 className="public-page-section-heading__title">
            Instant Redeem orchestration — not a TiltCheck payout wallet.
          </h2>
          <ul className="public-page-card__copy" style={{ textAlign: 'left', marginTop: '1rem', listStyle: 'none', padding: 0 }}>
            {operatorBullets.map((bullet) => (
              <li key={bullet} style={{ marginBottom: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid rgba(255, 176, 32, 0.35)' }}>
                {bullet}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link
              href="/operators/instant-redeem"
              className="btn btn-partner"
              data-funnel-event="cta_click"
              data-funnel-source="web-home-operator-block"
              data-funnel-label="Instant Redeem partner page"
            >
              PARTNER DOCS
            </Link>
            <Link
              href="/operators"
              className="btn btn-outline-partner"
              data-funnel-event="cta_click"
              data-funnel-source="web-home-operator-block"
              data-funnel-label="Sandbox keys"
            >
              GET SANDBOX KEYS
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
