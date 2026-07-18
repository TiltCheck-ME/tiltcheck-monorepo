// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17

import Link from 'next/link';

const operatorBullets = [
  'Trust scoring as a service — non-affiliated, evidence-backed.',
  'RGaaS API for session guardrails without custodial flows.',
  'Sandbox access for operators who want tilt signals, not affiliate spam.',
];

export default function OperatorBlock() {
  return (
    <section className="public-page-section px-4 vp-section">
      <div className="landing-shell">
        <div className="vp-column vp-column--platform public-page-card">
          <span className="brand-eyebrow">For platforms / operators</span>
          <h2 className="public-page-section-heading__title">
            Trust scoring as a service. Non-affiliated. RGaaS API.
          </h2>
          <ul className="public-page-card__copy" style={{ textAlign: 'left', marginTop: '1rem' }}>
            {operatorBullets.map((bullet) => (
              <li key={bullet} style={{ marginBottom: '0.5rem' }}>
                {bullet}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/operators" className="btn btn-primary">
              GET SANDBOX ACCESS
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
