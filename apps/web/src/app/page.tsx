// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import BrandTagline from '@/components/BrandTagline';
import { HOME_LAUNCH } from '@/lib/home-launch-copy';

export default function Home() {
  return (
    <main className="landing-page">
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

          <p className="landing-hero-subtitle landing-hero-subtitle--centered">{HOME_LAUNCH.kicker[0]}</p>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered">{HOME_LAUNCH.kicker[1]}</p>

          <p className="landing-hero-subtitle landing-hero-subtitle--centered">{HOME_LAUNCH.lede}</p>

          <div className="hero-actions">
            <a
              href={HOME_LAUNCH.ctaHref}
              download
              className="btn btn-primary"
              data-funnel-event="landing_install_click"
              data-funnel-source="web-home-hero"
              data-funnel-label="Download the zip"
            >
              {HOME_LAUNCH.ctaLabel}
            </a>
          </div>

          <p className="landing-hero-subtitle landing-hero-subtitle--centered">{HOME_LAUNCH.privacy}</p>
        </div>
      </section>

      <section id="install" className="public-page-section px-4">
        <div className="landing-shell">
          <article className="public-page-card">
            <p className="public-page-card__eyebrow">Install</p>
            <h2 className="public-page-card__title">Three steps</h2>
            <ol className="public-page-list">
              {HOME_LAUNCH.installSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="public-page-card__copy">{HOME_LAUNCH.installNote}</p>
          </article>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-grid public-page-grid--3">
            {HOME_LAUNCH.cards.map((card) => (
              <article key={card.step} className="public-page-card">
                <p className="public-page-card__eyebrow">Step {card.step}</p>
                <h3 className="public-page-card__title">{card.title}</h3>
                <p className="public-page-card__copy">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <article className="public-page-card">
            <p className="public-page-card__eyebrow">{HOME_LAUNCH.mock.status}</p>
            <h2 className="public-page-card__title">{HOME_LAUNCH.mock.signal}</h2>
            <p className="public-page-card__copy">{HOME_LAUNCH.mock.footer}</p>
            <p className="public-page-card__copy">{HOME_LAUNCH.mock.chip}</p>
          </article>
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
