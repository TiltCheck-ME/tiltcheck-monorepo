// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04
import Link from 'next/link';
import BrandTagline from '@/components/BrandTagline';
import JsonLd from '@/components/JsonLd';
import { HOME_LAUNCH, CORE_BRAKES, WHY_NO_BOT } from '@/lib/home-launch-copy';
import { webPageJsonLd } from '@/lib/structured-data';
import { SITE_ONE_LINER, SITE_SEO_TITLE } from '@/lib/site-copy';

export default function Home() {
  return (
    <main className="landing-page">
      <JsonLd data={webPageJsonLd(SITE_SEO_TITLE, SITE_ONE_LINER, '/')} />
      <section className="landing-hero" aria-label="TiltCheck">
        <div className="landing-hero__copy">
          <span className="brand-eyebrow">
            <BrandTagline compact />
          </span>
          <h1 className="landing-hero__title">
            <span className="landing-hero__title-q">{HOME_LAUNCH.h1[0]}</span>
            <span className="landing-hero__title-a">{HOME_LAUNCH.h1[1]}</span>
          </h1>
          <p className="landing-hero__dopamine">{HOME_LAUNCH.dopamine}</p>
          <p className="landing-hero__kicker">{HOME_LAUNCH.kicker}</p>
          <p className="landing-hero__lede">{HOME_LAUNCH.lede}</p>
          <div className="hero-actions landing-hero__actions">
            {HOME_LAUNCH.secondaryCtas.map((cta) => (
              <Link
                key={cta.href}
                href={cta.href}
                className={cta.href === '/cooldown' ? 'btn btn-primary' : 'btn btn-secondary'}
                data-funnel-event={
                  cta.href === '/cooldown' ? 'landing_cooldown_click' : 'landing_secondary_click'
                }
                data-funnel-source="web-home-hero"
                data-funnel-label={cta.label}
              >
                {cta.label}
              </Link>
            ))}
          </div>
          <Link
            href={HOME_LAUNCH.tertiaryLink.href}
            className="hero-actions__secondary-link"
            data-funnel-event="landing_extension_click"
            data-funnel-source="web-home-hero"
            data-funnel-label={HOME_LAUNCH.tertiaryLink.label}
          >
            {HOME_LAUNCH.tertiaryLink.label}
          </Link>
          <p className="landing-hero__privacy">{HOME_LAUNCH.privacy}</p>
        </div>
      </section>
      <section id="install" className="landing-moves" aria-label="How it works">
        <p className="landing-moves__eyebrow">{HOME_LAUNCH.installEyebrow}</p>
        <h2 className="landing-moves__title">{HOME_LAUNCH.installTitle}</h2>
        <ol className="landing-moves__list">
          {HOME_LAUNCH.installMoves.map((move, index) => (
            <li key={move.title} className="landing-move">
              <span className="landing-move__num">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="landing-move__title">{move.title}</h3>
              <p>{move.body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="landing-brakes" aria-label="The 4 In-Session Brakes">
        <p className="landing-brakes__eyebrow">ACTIVE IN-SESSION DEFENSE</p>
        <h2 className="landing-brakes__title">THE 4 IN-SESSION BRAKES</h2>
        <ul className="landing-brakes__list">
          {CORE_BRAKES.map((b) => (
            <li key={b.num} className="landing-brake">
              <span className="landing-brake__num">{b.num}</span>
              <h3 className="landing-brake__title">{b.title}</h3>
              <p className="landing-brake__body">{b.body}</p>
              <span className="landing-brake__status">{b.status}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="landing-why-no-bot" aria-label="Why No Discord Bot">
        <p className="landing-why-no-bot__eyebrow">{WHY_NO_BOT.eyebrow}</p>
        <h2 className="landing-why-no-bot__title">{WHY_NO_BOT.title}</h2>
        <div className="landing-why-no-bot__grid">
          <div className="landing-why-no-bot__card landing-why-no-bot__card--bot">
            <div className="landing-why-no-bot__header">
              <h3 className="landing-why-no-bot__card-title">The Discord Bot Problem</h3>
              <span className="landing-why-no-bot__tag landing-why-no-bot__tag--bad">TOO LATE</span>
            </div>
            <ul className="landing-why-no-bot__list">
              {WHY_NO_BOT.botFlaws.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div className="landing-why-no-bot__card landing-why-no-bot__card--spotter">
            <div className="landing-why-no-bot__header">
              <h3 className="landing-why-no-bot__card-title">The Browser Extension Spotter</h3>
              <span className="landing-why-no-bot__tag landing-why-no-bot__tag--good">INTERCEPTS THE TRIGGER</span>
            </div>
            <ul className="landing-why-no-bot__list">
              {WHY_NO_BOT.spotterStrengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="landing-why-no-bot__verdict">{WHY_NO_BOT.verdict}</p>
      </section>
      <section className="landing-vault" aria-label="AutoVault">
        <h2 className="landing-vault__title">{HOME_LAUNCH.vault.title}</h2>
        <p className="landing-vault__body">{HOME_LAUNCH.vault.body}</p>
        <Link href={HOME_LAUNCH.vault.href} className="btn btn-secondary">
          {HOME_LAUNCH.vault.ctaLabel}
        </Link>
      </section>
      <section className="landing-tape" aria-label="Honesty">
        <p className="landing-tape__label">THE FINE PRINT</p>
        <ul className="landing-tape__list">
          {HOME_LAUNCH.honesty.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
