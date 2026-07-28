/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
import Link from "next/link";
import "@/styles/stepper.css";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";
import JsonLd from "@/components/JsonLd";
import { softwareApplicationJsonLd } from "@/lib/structured-data";
import { getWebLoginRedirect } from "@/lib/dashboard-handoff";

const coreSignals = [
  {
    title: "Read-only",
    body: "Watches supported casino tabs. No private keys.",
  },
  {
    title: "In-tab",
    body: "Warnings and exit controls stay on your active screen.",
  },
  {
    title: "Your rules",
    body: "Profit targets and vault limits — we enforce what you set.",
  },
];

export default function ExtensionPage() {
  const dashboardSetupHref = getWebLoginRedirect('/dashboard');

  return (
    <main className="public-page public-page--tight text-white">
      <JsonLd data={softwareApplicationJsonLd()} />
      <PublicPageHero
        compact
        eyebrow="Browser extension"
        title="TiltCheck lives in the casino tab."
        description={
          <p>
            Sideload installs Core by default: click-pacing flags and Touch Grass exits. Full bet-tilt HUD needs Pro enabled.
            Lives in your casino tab. Store listing later.
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
            <Link href={dashboardSetupHref} className="btn btn-secondary" data-text="OPEN DASHBOARD SETUP">
              OPEN DASHBOARD SETUP
            </Link>
          </>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-card public-page-card--accent">
            <p className="public-page-card__eyebrow">Install</p>
            <h2 className="public-page-card__title">Two steps</h2>
            <ol className="public-page-list">
              <li>Download the zip, extract to a folder.</li>
              <li>chrome://extensions → Developer mode → Load unpacked → select folder.</li>
            </ol>
            <p className="public-page-card__copy">Then open dashboard setup before a live session.</p>
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader compact eyebrow="Core" title="What it does." />
          <p className="mb-6 max-w-2xl text-sm text-gray-400 leading-relaxed">
            No cap: zip install = Core guardrails (fast-click / risk heuristics). Deeper session tilt HUD is Pro — enable it in dashboard setup, do not expect it out of the box.
          </p>
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
    </main>
  );
}
