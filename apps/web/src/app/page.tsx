// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
import ToolCard from "@/components/ToolCard";

import { features } from "@/config/features";


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-8">
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

          <div className="hero-audit-banner">
            <p className="hero-audit-label">WHAT THE CASINO DOESN&apos;T WANT INSTALLED</p>
            <p className="hero-audit-body">
              Live session tracking &rarr; RTP drift detection &rarr; <strong>Greed Premium</strong> surfaced per $100 wagered &rarr; provably fair verification &rarr; win-locking vault &rarr; phishing shield. Nine tools. One layer. No trust required.
            </p>
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
            Casinos don&apos;t win because they&apos;re lucky. They win because you don&apos;t know when to stop. <span className="hero-body-accent">TiltCheck monitors your session in real-time</span>, flags your peak PnL, and gives you the signal to lock gains and exit clean — before your brain talks you into one more spin. Community-backed trust scores. Provably fair audits. No copium, just the math.
          </p>
        </div>
      </section>

      {/* Section divider */}
      <div className="section-divider" aria-hidden="true" />

      {/* Tools Section */}
      <section id="tools" className="w-full max-w-7xl mx-auto pt-8 pb-16">
        <div className="section-heading-block">
          <h2 className="neon neon-header section-heading" data-text="WHAT THE CASINO DOESN'T WANT INSTALLED">
            WHAT THE CASINO DOESN&apos;T WANT INSTALLED
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
