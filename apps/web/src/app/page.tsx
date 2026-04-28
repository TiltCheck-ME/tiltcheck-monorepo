// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-24
import Link from "next/link";

import RtpDriftTicker from "@/components/RtpDriftTicker";
import ToolCard from "@/components/ToolCard";
import ValueProposition from "@/components/ValueProposition";
import { features } from "@/config/features";

const heroSignals = [
  {
    label: "Auto-Pilot detection",
    value: "Live in-tab",
    description: "TiltCheck tracks your click speed and betting loops in real time. If you're playing like a bot, we wake you up.",
  },
  {
    label: "Guardrails armed",
    value: "Kryptonite mode",
    description: "Block specific games that are your weak spot. Not all-or-nothing. Surgical. Chicken? Blocked. Slots? Your call.",
  },
  {
    label: "Fairness receipts",
    value: "Proof ready",
    description: "Translate casino 'hidden tier' math into plain English. If the RTP is drifting, you see the cost.",
  },
];

const trustStats = [
  {
    value: "Read-only",
    label: "extension model",
    description: "TiltCheck watches the session from the outside. No private keys. No custody. Just the facts your brain skips when you're in The Loop.",
  },
  {
    value: "3",
    label: "core jobs",
    description: "Kill the Auto-Pilot. Read the Receipts. Enforce the Exit. That's the product. Nothing else.",
  },
  {
    value: "Surgical",
    label: "self-exclusion",
    description: "Block the exact game that's your kryptonite — Chicken, Crash, Pump — without losing access to everything else.",
  },
  {
    value: "Live + public",
    label: "proof surface",
    description: "Players get session defense and a Safety Resume. Platforms earn trust by proving what they claim.",
  },
];

const storyCards = [
  {
    step: "01",
    title: "Kill the Auto-Pilot",
    description: "We track your click-speed and betting loops in real time. If you're playing like a bot — same bet, same speed, same blank stare — we wake you up.",
  },
  {
    step: "02",
    title: "Read the Receipts",
    description: "We translate the casino's hidden RTP tiers into plain English. If the math is working against you more than advertised, we show you the gap and the cost.",
  },
  {
    step: "03",
    title: "Enforce the Exit",
    description: "We are not a suggestion. We are a circuit breaker. Set your line. We make sure you actually walk away when it hits.",
  },
];

const bridgeCards = [
  {
    href: "/extension",
    eyebrow: "Install path",
    title: "Ready to run it live? Start with the extension install flow.",
    description: "Install the extension. Load a supported session. Find out what you've been missing while playing in Auto-Pilot mode.",
    cta: "Open install steps",
  },
  {
    href: "/casinos",
    eyebrow: "Casino intel",
    title: "Know which casinos are running the weaker RTP tier before you deposit.",
    description: "Check public trust scores, RTP transparency posture, and payout risk. Sharp players don't guess — they read the receipts first.",
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
            <span className="brand-eyebrow">Built for Degens. By Degens. To save you from yourself.</span>
            <h1 className="landing-hero-title">The House has the Math. You have a Dopamine Problem. We have the Brakes.</h1>
            <p className="landing-hero-subtitle">
              TiltCheck is a read-only browser extension and behavioral circuit breaker for casino players. It watches live
              sessions, detects when you've hit Auto-Pilot, and forces the exit before The Loop feeds your win back into the machine.
            </p>

            <div className="hero-actions">
              <Link
                href="/extension"
                className="btn btn-primary"
                data-text="INSTALL THE EXTENSION"
                data-funnel-event="landing_install_click"
                data-funnel-source="web-home-hero"
                data-funnel-label="Install the Extension"
              >
                INSTALL THE EXTENSION
              </Link>
              <Link
                href="/casinos"
                className="btn btn-secondary"
                data-text="CHECK CASINO TRUST"
                data-funnel-event="landing_trust_click"
                data-funnel-source="web-home-hero"
                data-funnel-label="Check Casino Trust"
              >
                CHECK CASINO TRUST
              </Link>
              <Link href="/how-it-works" className="btn btn-secondary" data-text="SEE HOW IT WORKS">
                SEE HOW IT WORKS
              </Link>
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
              <Link
                href="/extension"
                className="hero-panel__link"
                data-funnel-event="landing_install_click"
                data-funnel-source="web-home-signal-board"
                data-funnel-label="Open the install flow"
              >
                Open the install flow
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
              <h2 className="landing-section-title">Three jobs. Zero corporate fluff.</h2>
            </div>
            <p className="landing-section-copy">
              If you are new here, start with this: TiltCheck is not a casino, not a wallet, and not a prediction engine.
              It is a read-only circuit breaker for watching sessions, reading receipts, and making sure you actually use the exit when the session turns stupid.
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
              <span className="brand-eyebrow">The house always wins?</span>
              <h2 className="landing-section-title">They just wait for you to hit Auto-Pilot. We break the Loop.</h2>
            </div>
            <p className="landing-section-copy">
              No fake badges. No fake urgency. Just the facts that matter when fairness, bankroll protection, and the actual math decide whether the session deserves another dollar.
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
              <Link
                key={card.href}
                href={card.href}
                className="landing-bridge-card"
                data-funnel-event={card.href === '/extension' ? 'bridge_install_click' : 'bridge_trust_click'}
                data-funnel-source="web-home-bridge"
                data-funnel-label={card.cta}
              >
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
