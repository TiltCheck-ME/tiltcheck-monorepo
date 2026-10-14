/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14 */
import Link from "next/link";
import "@/styles/stepper.css";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";
import JsonLd from "@/components/JsonLd";
import { softwareApplicationJsonLd } from "@/lib/structured-data";
import BrandTagline from "@/components/BrandTagline";
import GatedZipCta from "@/components/GatedZipCta";
import { HOME_LAUNCH } from "@/lib/home-launch-copy";

const coreSignals = [
  {
    title: "Session monitoring",
    body: "Read-only signals on supported casino tabs — click pacing, loss-chase heuristics, and tilt patterns before your bankroll pays tuition.",
  },
  {
    title: "Spin lock (Core)",
    body: "Every spin locks the spin button for two seconds. A click during the lock does not spin. Fullscreen Touch Grass (~2 min) is Pro monolith only — not the sideloaded zip.",
  },
  {
    title: "SusLink bounce",
    body: "Critical sus casino URLs can get redirected to a warning page when the API is up. Pair with Cooldown for on-chain locks.",
  },
];

const notThis = [
  "No HUD or sidebar out of the box (that is Pro).",
  "No Discord login required for Core.",
  "No wallet keys. No payments. No Instant Redeem cashout.",
  "Not on the Chrome Web Store. Zip is not public yet — soon™.",
];

export default function ExtensionPage() {
  return (
    <main className="public-page public-page--tight text-white">
      <JsonLd data={softwareApplicationJsonLd()} />
      <PublicPageHero
        compact
        eyebrow="Browser extension // Core"
        title="Session intel in the tab. Two-second spin lock. No nanny overlay."
        description={
          <p>
            Monitors live session behavior on Stake, Roobet, BC.Game, and other supported tabs — tilt detection from click pacing, not wallet custody.
            Zip is not public yet. Store listing later. Account sync is optional; Core will run guest. For wallet-level locks, use{' '}
            <Link href="/cooldown" className="text-[#17c3b2] underline-offset-2 hover:underline">
              Cooldown
            </Link>
            .
          </p>
        }
        actions={
          <>
            <GatedZipCta funnelEvent="extension_download_click" funnelSource="web-extension-hero" />
            <Link href="/casinos" className="btn btn-secondary" data-text="CHECK CASINO TRUST">
              CHECK CASINO TRUST
            </Link>
          </>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-card public-page-card--accent">
            <p className="public-page-card__eyebrow">{HOME_LAUNCH.ctaReady ? 'Install' : 'Install — gated'}</p>
            <h2 className="public-page-card__title">{HOME_LAUNCH.ctaReady ? 'Three steps' : 'Wen zip'}</h2>
            <ol className="public-page-list">
              {HOME_LAUNCH.installSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="public-page-card__copy">{HOME_LAUNCH.installNote}</p>
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader compact eyebrow="Core" title="What it does right now." />
          <div className="public-page-grid public-page-grid--3">
            {coreSignals.map(({ title, body }) => (
              <article key={title} className="public-page-card">
                <h2 className="public-page-card__title">{title}</h2>
                <p className="public-page-card__copy">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader compact eyebrow="Honesty" title="What it does not do." />
          <ul className="public-page-list max-w-2xl text-sm text-gray-400 leading-relaxed">
            {notThis.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-sm text-gray-500 leading-relaxed">
            Pro session HUD is opt-in storage later — do not expect a toolbar panel from Core.
            Instant Redeem badges live on the casino directory; the extension does not cash you out.
          </p>
          <p className="mt-8">
            <BrandTagline />
          </p>
        </div>
      </section>
    </main>
  );
}
