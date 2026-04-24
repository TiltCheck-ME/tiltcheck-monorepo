/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */
import Link from "next/link";
import "@/styles/stepper.css";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";
import { getWebLoginRedirect } from "@/lib/dashboard-handoff";

const extensionStats = [
  {
    label: "Security model",
    value: "Read only",
    description: "The extension watches supported casino tabs and session telemetry without asking for private keys.",
  },
  {
    label: "Session fit",
    value: "In-tab",
    description: "Drift, trust signals, and guardrails stay in the same surface where the session is actually happening.",
  },
  {
    label: "Exit logic",
    value: "Player set",
    description: "Profit targets, cooldowns, and vault rules still belong to you. The extension enforces them. It does not invent them.",
  },
];

export default function ExtensionPage() {
  const dashboardSetupHref = getWebLoginRedirect('/dashboard');

  return (
    <main className="public-page text-white">
      <PublicPageHero
        eyebrow="Browser extension"
        title={
          <>
            TiltCheck lives
            <br />
            in the casino tab.
          </>
        }
        description={
          <p>
            TiltCheck runs as a read-only browser extension. It watches live session data, checks RTP drift and fairness
            signals, and helps enforce the bankroll rules you already set.
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
        stats={extensionStats}
        panel={
          <>
            <p className="public-page-panel__eyebrow">Current beta path</p>
            <h2 className="public-page-panel__title">Sideload now. Store listing later.</h2>
              <p className="public-page-panel__body">
                Download the current beta bundle, extract it locally, then load the unpacked folder in Chrome or Brave.
              </p>
              <ul className="public-page-list">
                <li>Current package: tiltcheck-extension.zip</li>
                <li>Chrome Web Store listing is not live yet.</li>
                <li>After install, use dashboard setup before opening a supported session.</li>
              </ul>
            </>
          }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
            <PublicPageSectionHeader
              eyebrow="Core signals"
              title="Built to be useful mid-session, not just sound impressive on a page."
              description={<p>If you are new here, this is the short version of what the extension actually does once it is loaded.</p>}
            />

          <div className="public-page-grid public-page-grid--3">
            {[
              {
                title: "Read-only by design",
                body: "The extension inspects casino responses and session state. It does not ask for seed phrases or direct wallet control.",
              },
              {
                title: "Built for live sessions",
                body: "It stays inside the tab, tracks drift, and surfaces tilt signals without forcing you to bounce between dashboards.",
              },
              {
                title: "Own your exits",
                body: "Profit targets, cooldowns, and vault workflows are yours to set. TiltCheck helps enforce the line when your brain refuses to.",
              },
            ].map(({ title, body }) => (
              <article key={title} className="public-page-card">
                <p className="public-page-card__eyebrow">Core signal</p>
                <h2 className="public-page-card__title">{title}</h2>
                <p className="public-page-card__copy">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
            <PublicPageSectionHeader
              eyebrow="Install flow"
              title="Three steps. Zero guesswork."
              description={<p>The honest beta path is simple: sideload the bundle, load the extension, and set one guardrail before you test a live session.</p>}
            />

          <div className="public-page-grid public-page-grid--3">
            <article className="public-page-card">
              <p className="public-page-card__eyebrow">Step 01</p>
              <h2 className="public-page-card__title">Download the beta bundle</h2>
              <p className="public-page-card__copy">
                Grab the beta zip, extract it locally, and keep the bundled extension folder intact. Do not point Chrome
                at the zip itself.
              </p>
            </article>

            <article className="public-page-card">
              <p className="public-page-card__eyebrow">Step 02</p>
              <h2 className="public-page-card__title">Load it in Chrome or Brave</h2>
              <p className="public-page-card__copy">
                Open chrome://extensions, enable Developer mode, click Load unpacked, and select the extracted extension
                folder.
              </p>
            </article>

            <article className="public-page-card public-page-card--accent">
              <p className="public-page-card__eyebrow">Step 03</p>
              <h2 className="public-page-card__title">Set one guardrail in the dashboard</h2>
              <p className="public-page-card__copy">
                Open dashboard setup, turn on at least one rule, then open a supported casino tab so TiltCheck has
                something real to enforce mid-session.
              </p>
              <div className="public-page-card__body">
                <p>Rule first. Session second. Read only. No mystery.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-grid public-page-grid--2">
            <article className="public-page-card">
              <p className="public-page-card__eyebrow">What it covers</p>
              <ul className="public-page-list">
                <li>Real-time session telemetry and tilt signals.</li>
                <li>RTP drift and fairness checks against expected numbers.</li>
                <li>Vault prompts, cooldown signals, and intervention flows.</li>
                <li>Sidebar-driven workflows for supported casino tabs.</li>
              </ul>
            </article>

            <article className="public-page-card public-page-card--danger">
              <p className="public-page-card__eyebrow">Known beta gap</p>
              <h2 className="public-page-card__title">The toolbar popup path is not the real entry point yet.</h2>
              <p className="public-page-card__copy">
                The extension is currently sidebar-first. The honest beta path is still sideload the package, use the
                sidebar flow, and treat the store listing as not live yet.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
