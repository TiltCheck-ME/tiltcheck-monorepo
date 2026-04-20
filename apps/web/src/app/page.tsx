// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20
import Link from "next/link";

import RtpDriftTicker from "@/components/RtpDriftTicker";
import ToolCard from "@/components/ToolCard";
import ValueProposition from "@/components/ValueProposition";
import { features } from "@/config/features";

const heroSignals = [
  {
    label: "Session watch",
    value: "Live in-tab",
    description: "TiltCheck reads supported casino tabs in real time so the session stops hiding behind vibes.",
  },
  {
    label: "Guardrails armed",
    value: "Targets set",
    description: "Set profit, loss, and cooldown lines so a good session has a clean way to end.",
  },
  {
    label: "Fairness receipts",
    value: "Proof ready",
    description: "Verify seed inputs and keep evidence ready when a casino claim needs receipts.",
  },
];

const trustStats = [
  {
    value: "Read-only",
    label: "extension model",
    description: "TiltCheck watches the session, explains the risk, and does not ask for private keys to do the job.",
  },
  {
    value: "3",
    label: "core jobs",
    description: "Watch the math, flag the risk, and enforce the exit before tilt makes the next move.",
  },
  {
    value: "Player-owned",
    label: "wallet control",
    description: "TiltCheck focuses on evidence and guardrails. Players stay in control of the wallet side.",
  },
  {
    value: "Live + public",
    label: "proof surface",
    description: "Players get session defense. Platforms can earn public trust by proving what they claim.",
  },
];

const storyCards = [
  {
    step: "01",
    title: "Watch the session",
    description: "The extension reads supported casino tabs in real time so bets, RTP drift, and tilt signals stop living in guesswork.",
  },
  {
    step: "02",
    title: "Explain the risk",
    description: "TiltCheck translates raw session data into plain-English fairness checks, trust signals, and evidence you can use.",
  },
  {
    step: "03",
    title: "Protect the bankroll",
    description: "You set the line. TiltCheck helps enforce the cash-out, cooldown, or stop-loss move when the session turns stupid.",
  },
];

const bridgeCards = [
  {
    href: "/how-it-works",
    eyebrow: "Product story",
    title: "Understand what TiltCheck does before you install anything.",
    description: "See the short version of how the extension watches sessions, checks fairness, and enforces exits.",
    cta: "Read how it works",
  },
  {
    href: "/casinos",
    eyebrow: "Casino intel",
    title: "Compare casinos by trust signals instead of marketing copy.",
    description: "Check public trust scores, transparency posture, and payout risk before you decide where money goes.",
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
            <span className="brand-eyebrow">Read-only casino audit and bankroll defense</span>
            <h1 className="landing-hero-title">Catch bad math. Protect your bankroll.</h1>
            <p className="landing-hero-subtitle">
              TiltCheck is a read-only browser extension and public trust layer for casino players. It watches live
              sessions, flags fairness drift, and helps you cash out before tilt feeds the win back into the machine.
            </p>

            <div className="hero-actions">
              <Link href="/how-it-works" className="btn btn-primary" data-text="SEE HOW IT WORKS">
                SEE HOW IT WORKS
              </Link>
              <a href="/beta-tester" className="btn btn-secondary" data-text="GET EARLY ACCESS">
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
                <h2 className="hero-panel__title">What you get in one surface.</h2>
              </div>
              <span className="hero-panel__status">Read only</span>
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
                TiltCheck has one job: show what the casino is doing, show what your session is doing, and make the next
                sane move easier to take.
              </p>
              <Link href="/how-it-works" className="hero-panel__link">
                See how TiltCheck works
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-shell">
          <div className="landing-section-heading landing-section-heading--split">
            <div>
              <span className="brand-eyebrow">What TiltCheck actually does</span>
              <h2 className="landing-section-title">Three jobs. One product. No mystery theater.</h2>
            </div>
            <p className="landing-section-copy">
              If you are new here, start with this: TiltCheck is not a casino, not a wallet, and not a prediction engine.
              It is a read-only system for watching sessions, explaining risk, and helping players keep their money.
            </p>
          </div>

          <div className="landing-trust-grid">
            {storyCards.map((item) => (
              <article key={item.step} className="landing-stat-card">
                <p className="landing-stat-card__value">{item.step}</p>
                <h3 className="landing-stat-card__label">{item.title}</h3>
                <p className="landing-stat-card__description">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-shell">
          <div className="landing-section-heading landing-section-heading--split">
            <div>
              <span className="brand-eyebrow">Trust, without the blind spot</span>
              <h2 className="landing-section-title">Built to stay useful when money is on the line.</h2>
            </div>
            <p className="landing-section-copy">
              No fake badges. No fake urgency. Just the facts that matter when fairness, bankroll protection, and trust
              quality decide whether a session deserves another dollar.
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
              <h2 className="landing-section-title">Start with the tools that explain risk and protect wins.</h2>
            </div>
            <p className="landing-section-copy">
              First-time users usually need three things fast: a way to protect profit, a way to verify claims, and a
              way to spot drift before the session gets expensive.
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
                <h3 className="secondary-tools-title">Extra surfaces that help after the basics make sense.</h3>
              </div>
              <p className="secondary-tools-copy">
                Bonus intel, scam checks, and community surfaces still matter. They just should not bury the core story
                for people trying to understand the product.
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
