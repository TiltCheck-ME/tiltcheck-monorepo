// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
import ToolCard from "@/components/ToolCard";
import CommunityVaultStrip from "@/components/CommunityVaultStrip";
import RtpDriftTicker from "@/components/RtpDriftTicker";

import { features } from "@/config/features";


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-8 md:pt-0 overflow-x-hidden w-full">
      {/* Hero Section */}
      <section className="hero-surface w-full">
        <div className="hero-content">
          <h1 className="neon neon-main neon-hero-top mb-1" data-text="HOUSE ALWAYS WINS?">
            HOUSE ALWAYS WINS?
          </h1>
          <h2 className="neon neon-main neon-hero-bottom mb-6" data-text="FUCK THAT.">
            FUCK THAT.
          </h2>

          <p className="hero-tagline">
            TiltCheck tracks your live session, audits casino fairness, and <strong>locks your wins before your brain gives them back.</strong>
          </p>

          <div className="hero-stats-strip" role="list" aria-label="TiltCheck capabilities">
            <div className="hero-stat" role="listitem">
              <span className="hero-stat-value">LIVE</span>
              <span className="hero-stat-label">Tilt Monitor</span>
            </div>
            <div className="hero-stat" role="listitem">
              <span className="hero-stat-value">AUTO-LOCK</span>
              <span className="hero-stat-label">Win Vault</span>
            </div>
            <div className="hero-stat" role="listitem">
              <span className="hero-stat-value">GREED TAX</span>
              <span className="hero-stat-label">Per $100 Wagered</span>
            </div>
            <div className="hero-stat" role="listitem">
              <span className="hero-stat-value">9 TOOLS</span>
              <span className="hero-stat-label">One Audit Layer</span>
            </div>
          </div>

          <div className="hero-actions">
            <a href="/beta-tester" className="btn btn-primary" data-text="GET EARLY ACCESS">
              GET EARLY ACCESS
            </a>
            <a href="#tools" className="btn btn-secondary" data-text="SEE THE TOOLS">
              SEE THE TOOLS
            </a>
          </div>

          {/* Hero body copy — inside hero so there's no gap */}
          <p className="hero-body">
            Casinos win because you don&apos;t know when to stop. <span className="hero-body-accent">TiltCheck fixes that.</span> Real-time session monitoring, provably fair audits, and a vault that locks your wins before your brain loses them back. Community-scored. No trust required.
          </p>
        </div>
      </section>

      {/* Section divider */}
      <div className="section-divider" aria-hidden="true" />

      {/* Community Vault Strip — social proof */}
      <CommunityVaultStrip />

      {/* RTP Drift Live Feed */}
      <RtpDriftTicker />

      {/* Tools Section */}
      <section id="tools" className="w-full max-w-7xl mx-auto pt-8 pb-16">
        <div className="section-heading-block">
          <h2 className="neon neon-header section-heading" data-text="BUILT FOR THE PLAYERS. NOT THE HOUSE.">
            BUILT FOR THE PLAYERS. NOT THE HOUSE.
          </h2>
          <p className="section-subheading">Nine tools. One audit layer. No trust required.</p>
        </div>
        <div className="mt-8 tools-bento-grid">
          {features.map((tool) => (
            <ToolCard key={tool.title} {...tool} />
          ))}
        </div>
      </section>
    </main>
  );
}
