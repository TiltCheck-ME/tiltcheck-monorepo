/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */
import Link from "next/link";
import "@/styles/stepper.css";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";
import JsonLd from "@/components/JsonLd";
import { softwareApplicationJsonLd } from "@/lib/structured-data";
import BrandTagline from "@/components/BrandTagline";

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
  "Not on the Chrome Web Store yet — sideload only.",
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
            Sideload the zip. Store listing later. Account sync is optional; Core runs guest. For wallet-level locks, use{' '}
            <Link href="/cooldown" className="text-[#17c3b2] underline-offset-2 hover:underline">
              Cooldown
            </Link>
            .
          </p>
        }
        actions={
          <>
            <a
              href="/downloads/tiltcheck-extension.zip"
              download
              className="btn btn-primary"
              data-text="DOWNLOAD THE ZIP"
              data-funnel-event="extension_download_click"
              data-funnel-source="web-extension-hero"
              data-funnel-label="Download the zip"
            >
              DOWNLOAD THE ZIP
            </a>
            <Link href="/casinos" className="btn btn-secondary" data-text="CHECK CASINO TRUST">
              CHECK CASINO TRUST
            </Link>
          </>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-card public-page-card--accent">
            <p className="public-page-card__eyebrow">Install</p>
            <h2 className="public-page-card__title">Three steps</h2>
            <ol className="public-page-list">
              <li>Download the zip. Extract to a folder.</li>
              <li>chrome://extensions → Developer mode → Load unpacked → select that folder.</li>
              <li>Open a supported casino tab. Play. Core locks the spin button for two seconds after each spin.</li>
            </ol>
            <p className="public-page-card__copy">
              No Account needed for Core. Link Discord later if you want dashboard vault rules and sync.
            </p>
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
