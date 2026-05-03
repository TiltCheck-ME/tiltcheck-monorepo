// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-15
import Link from "next/link";

const coreJobs = [
  {
    step: "01",
    title: "Kill the Auto-Pilot",
    description:
      "We track click-speed, bet patterns, and session pacing in real time. If you are playing like a bot, we wake you up.",
  },
  {
    step: "02",
    title: "Read the Receipts",
    description:
      "We translate hidden RTP tiers into plain English. If the math is costing you more than advertised, we show the gap.",
  },
  {
    step: "03",
    title: "Enforce the Exit",
    description:
      "We are not a suggestion. Set your line. We enforce it. No passive warnings. No concern theater.",
  },
];

export default function Home() {
  return (
    <main className="landing-page">
      {/* ── Hero ── */}
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">Built for Degens. By Degens.</span>

          <h1 className="landing-hero-title landing-hero-title--centered">
            The House has the math. You have a dopamine problem. We have The Brakes.
          </h1>

          <p className="landing-hero-subtitle landing-hero-subtitle--centered">
            TiltCheck is a read-only browser extension that watches live casino sessions,
            detects Auto-Pilot mode, and forces the exit before The Loop feeds your win
            back to the machine.
          </p>

          <div className="hero-actions">
            <Link
              href="/extension"
              className="btn btn-primary"
              data-funnel-event="landing_install_click"
              data-funnel-source="web-home-hero"
              data-funnel-label="Install the Extension"
            >
              INSTALL THE EXTENSION
            </Link>
            <Link
              href="/casinos"
              className="btn btn-secondary"
              data-funnel-event="landing_trust_click"
              data-funnel-source="web-home-hero"
              data-funnel-label="Check Casino Trust"
            >
              CHECK CASINO TRUST
            </Link>
          </div>
        </div>
      </section>

      {/* ── Three jobs ── */}
      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-section-heading">
            <div>
              <span className="brand-eyebrow">What TiltCheck actually does</span>
              <h2 className="public-page-section-heading__title">Three jobs. Nothing else.</h2>
            </div>
          </div>

          <div className="public-page-grid public-page-grid--3">
            {coreJobs.map((job) => (
              <article key={job.step} className="public-page-card">
                <p className="public-page-card__eyebrow">Step {job.step}</p>
                <h3 className="public-page-card__title">{job.title}</h3>
                <p className="public-page-card__copy">{job.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bridge CTA ── */}
      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-cta-band">
            <p className="public-page-panel__eyebrow">Ready to see it work?</p>
            <h2 className="public-page-cta-band__title">
              Install the extension and let TiltCheck watch your next session.
              Or check casino trust scores before you deposit.
            </h2>
            <div className="public-page-cta-band__actions">
              <Link
                href="/extension"
                className="btn btn-primary"
                data-funnel-event="landing_bottom_install_click"
                data-funnel-source="web-home-bottom-cta"
                data-funnel-label="Install the Extension"
              >
                INSTALL THE EXTENSION
              </Link>
              <Link href="/how-it-works" className="btn btn-secondary">
                SEE HOW IT WORKS
              </Link>
              <Link href="/casinos" className="btn btn-secondary">
                CHECK CASINO TRUST
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Responsible Gaming ── */}
      <section className="public-page-section px-4" style={{ paddingBottom: '2rem' }}>
        <div className="landing-shell" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: '#6b7a8d', lineHeight: 1.6 }}>
            TiltCheck is not a casino, not a bank, and not financial advice. If you or someone you know
            has a gambling problem, contact{' '}
            <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer" style={{ color: '#17c3b2' }}>
              NCPG.org
            </a>{' '}
            or call <strong style={{ color: '#ffffff' }}>1-800-GAMBLER</strong>.
          </p>
        </div>
      </section>
    </main>
  );
}
