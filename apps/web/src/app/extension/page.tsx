/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14 */
import Link from "next/link";
import PublicPageHero from "@/components/PublicPageHero";
import JsonLd from "@/components/JsonLd";
import { softwareApplicationJsonLd } from "@/lib/structured-data";
import BrandTagline from "@/components/BrandTagline";
import GatedZipCta from "@/components/GatedZipCta";
import { EXTENSION_PAGE, HOME_LAUNCH } from "@/lib/home-launch-copy";

export default function ExtensionPage() {
  return (
    <main className="public-page public-page--tight text-white">
      <JsonLd data={softwareApplicationJsonLd()} />
      <PublicPageHero
        compact
        eyebrow={EXTENSION_PAGE.eyebrow}
        title={EXTENSION_PAGE.title}
        description={
          <p>
            {EXTENSION_PAGE.beats[0].body}
          </p>
        }
        actions={
          <>
            <GatedZipCta funnelEvent="extension_download_click" funnelSource="web-extension-hero" />
            <Link href="/cooldown" className="hero-actions__secondary-link">
              Set a Cooldown lock
            </Link>
          </>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <article className="public-page-card">
            <p className="public-page-card__eyebrow">{HOME_LAUNCH.ctaReady ? "Install" : "Phase 2 — coming soon"}</p>
            <h2 className="public-page-card__title">{HOME_LAUNCH.ctaReady ? "Three steps" : "Wen zip"}</h2>
            <ol className="public-page-list">
              {HOME_LAUNCH.installSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-grid public-page-grid--3">
            {EXTENSION_PAGE.beats.map((beat) => (
              <article key={beat.title} className="public-page-card">
                <h2 className="public-page-card__title">{beat.title}</h2>
                <p className="public-page-card__copy">{beat.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <ul className="public-page-list">
            {EXTENSION_PAGE.honesty.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-8">
            <BrandTagline />
          </p>
        </div>
      </section>
    </main>
  );
}
