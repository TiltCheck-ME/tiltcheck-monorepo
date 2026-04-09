// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
import ToolCard from "@/components/ToolCard";
import LiveAuditLog from "@/components/LiveAuditLog";
import { features } from "@/config/features";


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-24">
      {/* Hero Section */}
      <section className="hero-surface w-full">
        <div className="hero-content">
          <h1 className="neon neon-main neon-hero-top mb-1" data-text="HOUSE ALWAYS WINS?">
            HOUSE ALWAYS WINS?
          </h1>
          <h2 className="neon neon-main neon-hero-bottom text-red-500 mb-8" data-text="FUCK THAT.">
            FUCK THAT.
          </h2>

          <div className="hero-audit-banner">
            <p className="hero-audit-label">[AUDIT LAYER]: ONLINE AND PISSED</p>
            <p className="hero-audit-body">
              The casino&apos;s RNG is more rigged than your last relationship. We&apos;re not here to judge — we&apos;re here to show you the math before you hemorrhage your rent money. Sniff out the shadow nerfs, catch the RTP drifts, and know when to fold.
            </p>
          </div>

          <div className="hero-actions">
            <a href="/beta-tester" className="btn btn-primary" data-text="DEPLOY THE AUDIT LAYER">
              DEPLOY THE AUDIT LAYER
            </a>
            <a href="#tools" className="btn btn-secondary" data-text="BROWSE THE ARSENAL">
              BROWSE THE ARSENAL
            </a>
          </div>

          {/* Hero body copy — inside hero so there's no gap */}
          <p className="hero-body">
            Casinos don&apos;t win because they&apos;re lucky. They win because you don&apos;t know when to stop. <span className="hero-body-accent">TiltCheck is the forensic audit layer</span> that reads your live session, flags your peak PnL in real-time, and gives you the community-backed signal to lock gains and exit clean. We tell you when the math checks out and when you&apos;re chasing a ghost. Vault your wins before your brain talks you into one more spin.
          </p>
        </div>
      </section>

      {/* Section divider */}
      <div className="section-divider" aria-hidden="true" />

      {/* Tools Section */}
      <section id="tools" className="w-full max-w-7xl mx-auto px-4 py-16">
        <div className="section-heading-block">
          <h2 className="neon neon-header section-heading" data-text="THE HOUSE EDGE NEUTRALIZER">
            THE HOUSE EDGE NEUTRALIZER
          </h2>
          <p className="section-subheading">Nine tools. One audit layer. No cap.</p>
        </div>
        <div className="mt-10 tools-bento-grid">
          <LiveAuditLog />
          {features.map((tool) => (
            <ToolCard key={tool.title} {...tool} />
          ))}
        </div>
      </section>
    </main>
  );
}
