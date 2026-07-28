// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28

import Link from 'next/link';

const operatorBullets = [
  'Instant Redeem lets players pay a fee to cash out faster at your casino cashier — skip the standard withdrawal wait.',
  'Processors: one integration covers many casino domains. You hold the funds; TiltCheck orchestrates quote, gates, and settlement.',
  'Scam and low-trust domains stay blocked. Casinos that enable get a public badge and a trust score bump.',
  'Same partner auth as RGaaS. Free sandbox. Production needs a float-desk grant — no MTL on day one.',
];

export default function OperatorBlock() {
  return (
    <section className="public-page-section px-4 vp-section">
      <div className="landing-shell">
        <div className="vp-column vp-column--platform public-page-card">
          <span className="brand-eyebrow">For processors / operators</span>
          <h2 className="public-page-section-heading__title">
            Instant Redeem — fast player cashouts for processors and operators.
          </h2>
          <ul className="public-page-card__copy" style={{ textAlign: 'left', marginTop: '1rem' }}>
            {operatorBullets.map((bullet) => (
              <li key={bullet} style={{ marginBottom: '0.5rem' }}>
                {bullet}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link
              href="/operators/instant-redeem"
              className="btn btn-primary"
              data-funnel-event="cta_click"
              data-funnel-source="web-home-operator-block"
              data-funnel-label="Enable Instant Redeem"
            >
              ENABLE INSTANT REDEEM
            </Link>
            <Link
              href="/operators"
              className="btn"
              style={{
                border: '1px solid rgba(23, 195, 178, 0.35)',
                color: '#17c3b2',
                background: 'transparent',
              }}
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
