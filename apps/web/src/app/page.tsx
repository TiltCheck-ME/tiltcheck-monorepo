// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14
import Link from 'next/link';
import BrandTagline from '@/components/BrandTagline';
import JsonLd from '@/components/JsonLd';
import GatedZipCta from '@/components/GatedZipCta';
import { HOME_LAUNCH } from '@/lib/home-launch-copy';
import { webPageJsonLd } from '@/lib/structured-data';
import { SITE_ONE_LINER, SITE_SEO_TITLE } from '@/lib/site-copy';

export default function Home() {
  return (
    <main className="landing-page">
      <JsonLd
        data={webPageJsonLd(SITE_SEO_TITLE, SITE_ONE_LINER, '/')}
      />
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">
            <BrandTagline compact />
          </span>

          <h1 className="landing-hero-title landing-hero-title--centered">
            {HOME_LAUNCH.h1[0]}
            <br />
            {HOME_LAUNCH.h1[1]}
          </h1>

          <div className="landing-hero-stack">
            <p className="landing-hero-subtitle">{HOME_LAUNCH.kicker[0]}</p>
            <p className="landing-hero-retort">{HOME_LAUNCH.kicker[1]}</p>
            <p className="landing-hero-wen">{HOME_LAUNCH.kicker[2]}</p>
          </div>
          <div className="hero-actions">
            <Link href="/cooldown" className="btn btn-primary" data-funnel-event="landing_secondary_click" data-funnel-source="web-home-hero" data-funnel-label="SET A COOLDOWN LOCK">
              SET A COOLDOWN LOCK
            </Link>
            <Link href="/extension" className="btn btn-secondary" data-funnel-event="landing_secondary_click" data-funnel-source="web-home-hero" data-funnel-label="EXTENSION DETAILS">
              EXTENSION DETAILS
            </Link>
          </div>
          <p className="landing-hero-privacy">{HOME_LAUNCH.privacy}</p>
        </div>
      </section>

      <section id="install" className="public-page-section px-4">
        <div className="landing-shell">
          <article className="public-page-card">
            <p className="public-page-card__eyebrow">{HOME_LAUNCH.ctaReady ? 'Install' : 'Phase 2 — coming soon'}</p>
            <h2 className="public-page-card__title">{HOME_LAUNCH.ctaReady ? 'Three steps' : 'Wen zip'}</h2>
            <ol className="public-page-list">
              {HOME_LAUNCH.installSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {HOME_LAUNCH.ctaReady ? null : (
              <GatedZipCta funnelEvent="landing_install_click" funnelSource="web-home-install" />
            )}
          </article>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-grid public-page-grid--3">
            {HOME_LAUNCH.cards.map((card) => (
              <article key={card.step} className="public-page-card">
                <p className="public-page-card__eyebrow">{card.step}</p>
                <h3 className="public-page-card__title">{card.title}</h3>
                <p className="public-page-card__copy">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <ul className="public-page-list">
            {HOME_LAUNCH.honesty.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
