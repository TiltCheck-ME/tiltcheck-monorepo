// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19
import Link from "next/link";

import RtpDriftTicker from "@/components/RtpDriftTicker";
import ToolCard from "@/components/ToolCard";
import ValueProposition from "@/components/ValueProposition";
import { features } from "@/config/features";

const heroSignals = [
  {
    label: "Greed premium watch",
    value: "-4.7% RTP",
    description: "Catch tier-shifted slots before the house quietly taxes your session.",
  },
  {
    label: "Auto Vault armed",
    value: "Cold exit ready",
    description: "Lock profit out of reach before tilt turns one more spin into a donation.",
  },
  {
    label: "Seed receipts",
    value: "HMAC verified",
    description: "When provably fair gets sloppy, you get the math instead of the excuse.",
  },
];

const trustStats = [
  {
    value: "9",
    label: "live tools",
    description: "Audits, bankroll defense, and scam intel in one surface.",
  },
  {
    value: "24/7",
    label: "signal layer",
    description: "RTP drift, trust signals, and session telemetry without the blind spots.",
  },
  {
    value: "0",
    label: "custodial risk",
    description: "Your keys stay yours. TiltCheck handles guardrails, not your wallet.",
  },
  {
    value: "2-sided",
    label: "trust model",
    description: "Players verify. Platforms prove. Everyone gets less room for bullshit.",
  },
];

const bridgeCards = [
  {
    href: "/how-it-works",
    eyebrow: "Audit flow",
    title: "See how the stack catches drift, verifies fairness, and hard-locks wins.",
    description: "Start with the mechanics. No marketing fog. Just the path from session data to hard evidence.",
    cta: "Read how it works",
  },
  {
    href: "/casinos",
    eyebrow: "Trust scores",
    title: "Check which platforms earn trust and which ones are farming your bankroll.",
    description: "Compare trust scores, transparency posture, and the behavior casinos hope you never line up side by side.",
    cta: "Review trust scores",
  },
];

const flagshipToolHrefs = new Set([
  "/tools/auto-vault",
  "/tools/verify",
  "/tools/session-stats",
  "/tools/house-edge-scanner",
]);

const flagshipTools = features.filter(({ href }) => flagshipToolHrefs.has(href));
const secondaryTools = features.filter(({ href }) => !flagshipToolHrefs.has(href));

export default function Home() {
  return (
    <main className="landing-page">
      <section className="hero-surface">
        <div className="landing-shell landing-shell--hero">
          <div className="hero-copy">
            <span className="brand-eyebrow">The degen audit layer</span>
            <h1 className="landing-hero-title">The house always wins? Fuck that.</h1>
            <p className="landing-hero-subtitle">
              TiltCheck tracks live sessions, audits casino fairness, and locks profit before one bad impulse feeds it
              back into the machine.
            </p>

            <div className="hero-actions">
              <a href="/beta-tester" className="btn btn-primary" data-text="GET EARLY ACCESS">
                GET EARLY ACCESS
              </a>
              <a href="#tools" className="btn btn-secondary" data-text="SEE THE TOOLS">
                SEE THE TOOLS
              </a>
            </div>

            <ul className="hero-proof-list" aria-label="TiltCheck proof points">
              {trustStats.slice(0, 3).map((item) => (
                <li key={item.label} className="hero-proof-item">
                  <span className="hero-proof-value">{item.value}</span>
                  <div>
                    <p className="hero-proof-label">{item.label}</p>
                    <p className="hero-proof-description">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="hero-panel" aria-label="TiltCheck signal board">
            <div className="hero-panel__header">
              <div>
                <p className="hero-panel__eyebrow">Signal board</p>
                <h2 className="hero-panel__title">One glance. Plenty of signal.</h2>
              </div>
              <span className="hero-panel__status">24/7 watch</span>
            </div>

            <div className="hero-panel__stack">
              {heroSignals.map((signal) => (
                <article key={signal.label} className="hero-signal-card">
                  <p className="hero-signal-card__label">{signal.label}</p>
                  <p className="hero-signal-card__value">{signal.value}</p>
                  <p className="hero-signal-card__description">{signal.description}</p>
                </article>
              ))}
            </div>

            <div className="hero-panel__footer">
              <p className="hero-panel__footer-copy">
                Zero custody. Live drift watch. Seed receipts on demand. The surface stays sharp because it has a job.
              </p>
              <Link href="/how-it-works" className="hero-panel__link">
                See how the stack works
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-shell">
          <div className="landing-section-heading landing-section-heading--split">
            <div>
              <span className="brand-eyebrow">Trust, minus the blind part</span>
              <h2 className="landing-section-title">Built on hard edges, not soft promises.</h2>
            </div>
            <p className="landing-section-copy">
              No fake badges. No fake urgency. Just the facts that matter when fairness, bankroll protection, and signal
              quality decide whether a session stays profitable.
            </p>
          </div>

          <div className="landing-trust-grid">
            {trustStats.map((item) => (
              <article key={item.label} className="landing-stat-card">
                <p className="landing-stat-card__value">{item.value}</p>
                <h3 className="landing-stat-card__label">{item.label}</h3>
                <p className="landing-stat-card__description">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="tools" className="landing-section">
        <div className="landing-shell">
          <div className="landing-section-heading landing-section-heading--split">
            <div>
              <span className="brand-eyebrow">Flagship tools</span>
              <h2 className="landing-section-title">Start with the tools that move money and expose drift.</h2>
            </div>
            <p className="landing-section-copy">
              Promote the core stack first: lock profit, verify the receipts, and surface RTP drift before it chews
              through another bankroll.
            </p>
          </div>

          <div className="flagship-tools-grid">
            {flagshipTools.map((tool, index) => (
              <div key={tool.href} className={`flagship-tools-slot flagship-tools-slot--${index + 1}`}>
                <ToolCard {...tool} variant={index === 0 ? "hero" : "flagship"} />
              </div>
            ))}
          </div>

          <div className="secondary-tools-block">
            <div className="secondary-tools-header">
              <div>
                <span className="brand-eyebrow">Secondary edges</span>
                <h3 className="secondary-tools-title">Support tools that stay useful without hijacking the page.</h3>
              </div>
              <p className="secondary-tools-copy">
                Bonus intel, community feeds, scam checks, and utility surfaces still matter. They just do not need to
                scream over the money tools.
              </p>
            </div>

            <div className="secondary-tools-grid">
              {secondaryTools.map((tool) => (
                <ToolCard key={tool.href} {...tool} variant="supporting" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <RtpDriftTicker />

      <ValueProposition />

      <section className="landing-section landing-section--bridge">
        <div className="landing-shell">
          <div className="landing-section-heading landing-section-heading--split">
            <div>
              <span className="brand-eyebrow">Go deeper</span>
              <h2 className="landing-section-title">Need proof before you commit? Good.</h2>
            </div>
            <p className="landing-section-copy">
              The right next step depends on whether you want the system explained or the casino landscape mapped. Both
              paths are here. Neither wastes your time.
            </p>
          </div>

          <div className="landing-bridge-grid">
            {bridgeCards.map((card) => (
              <Link key={card.href} href={card.href} className="landing-bridge-card">
                <span className="landing-bridge-card__eyebrow">{card.eyebrow}</span>
                <h3 className="landing-bridge-card__title">{card.title}</h3>
                <p className="landing-bridge-card__description">{card.description}</p>
                <span className="landing-bridge-card__cta">{card.cta}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
