// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28
import Link from "next/link";
import OperatorBlock from "@/components/OperatorBlock";
import { SITE_HERO_HEADLINE, SITE_ONE_LINER } from "@/lib/site-copy";

const coreJobs = [
  {
    step: "01",
    title: "Kill the Auto-Pilot",
    description: "Tracks click-speed and bet pacing. Wakes you up when you play like a bot.",
  },
  {
    step: "02",
    title: "Read the Room",
    description: "Flags sus pacing and pressure loops while you are still in the session.",
  },
  {
    step: "03",
    title: "Enforce the Exit",
    description: "Set your line. We enforce it — not passive warnings.",
  },
];

export default function Home() {
  return (
    <main className="landing-page">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">Built for Degens. By Degens.</span>

          <h1 className="landing-hero-title landing-hero-title--centered">
            {SITE_HERO_HEADLINE}
          </h1>

          <p className="landing-hero-subtitle landing-hero-subtitle--centered">
            {SITE_ONE_LINER}
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
              className="hero-actions__secondary-link"
              data-funnel-event="landing_trust_click"
              data-funnel-source="web-home-hero"
              data-funnel-label="Check Casino Trust"
            >
              CHECK CASINO TRUST
            </Link>
          </div>
        </div>
      </section>

      <section className="public-page-section px-4" style={{ paddingTop: "2.5rem", paddingBottom: "0.5rem" }}>
        <div className="landing-shell" style={{ textAlign: "center" }}>
          <p className="brand-eyebrow">Wen payout?</p>
          <p style={{ marginTop: "0.75rem", color: "#9aa8bc", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: "36rem", marginLeft: "auto", marginRight: "auto" }}>
            Instant Redeem is a paid fast cashout at the casino cashier — skip the wait, pay a fee. We badge who offers it so you are not stuck on soon™.
          </p>
          <div className="hero-actions" style={{ marginTop: "1.25rem", justifyContent: "center" }}>
            <Link
              href="/casinos"
              className="btn btn-primary"
              data-funnel-event="cta_click"
              data-funnel-source="web-home-instant-redeem"
              data-funnel-label="See who pays fast"
            >
              SEE WHO PAYS FAST
            </Link>
            <Link
              href="/operators/instant-redeem"
              className="hero-actions__secondary-link"
              data-funnel-event="cta_click"
              data-funnel-source="web-home-instant-redeem"
              data-funnel-label="Enable Instant Redeem"
            >
              ENABLE INSTANT REDEEM
            </Link>
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-section-heading">
            <div>
              <span className="brand-eyebrow">Three jobs</span>
              <h2 className="public-page-section-heading__title">Protect the bankroll.</h2>
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

      <OperatorBlock />

      <section className="public-page-section px-4" style={{ paddingBottom: "2rem" }}>
        <div className="landing-shell" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", color: "#6b7a8d", lineHeight: 1.6 }}>
            Not a casino, not a bank, not financial advice. Problem gambling help:{" "}
            <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer" style={{ color: "#17c3b2" }}>
              NCPG.org
            </a>{" "}
            or <strong style={{ color: "#ffffff" }}>1-800-GAMBLER</strong>.
          </p>
          <p style={{ marginTop: "0.75rem", fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase", color: "#6b7a8d" }}>
            Made for Degens. By Degens.
          </p>
        </div>
      </section>
    </main>
  );
}
