/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
import Link from "next/link";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";

const philosophyCards = [
  {
    title: "Signal, not stories",
    body: "Live session reads, payout checks, tilt signals, and trust records. The math is the point.",
  },
  {
    title: "Enforce, not shame",
    body: "When your line gets hit, The Brakes engage. No fake concern theater.",
  },
  {
    title: "No wallet custody",
    body: "Session tools run on signals and proof. You stay in charge of funds.",
  },
];

export default function AboutPage() {
  return (
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        eyebrow="About"
        title="Built by a player. Shipped like defense."
        description={
          <p>
            Built after too many 3 a.m. loss streaks — better math, guardrails, and receipts instead of pep talks.
          </p>
        }
        actions={
          <>
            <Link href="/how-it-works" className="btn btn-primary" data-text="SEE THE SYSTEM">
              SEE THE SYSTEM
            </Link>
            <Link href="/beta-tester" className="btn btn-secondary" data-text="GET EARLY ACCESS">
              GET EARLY ACCESS
            </Link>
          </>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader compact eyebrow="Philosophy" title="Simple rules." />
          <div className="public-page-grid public-page-grid--3">
            {philosophyCards.map((item) => (
              <article key={item.title} className="public-page-card">
                <h3 className="public-page-card__title">{item.title}</h3>
                <p className="public-page-card__copy">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-grid public-page-grid--2">
            <article className="public-page-card public-page-card--accent">
              <p className="public-page-card__eyebrow">Who built this</p>
              <h2 className="public-page-card__title">jmenichole</h2>
              <div className="public-page-card__body">
                <p>
                  Chased losses, learned to code, built the tool past-me needed. Full-stack, trust engines, tilt habits.
                </p>
              </div>
            </article>

            <article className="public-page-card">
              <p className="public-page-card__eyebrow">Product</p>
              <h2 className="public-page-card__title">Read-only guardrail + trust layer</h2>
              <p className="public-page-card__copy">
                Not a casino or bank. Watches sessions, checks payout claims, helps players exit with evidence.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-cta-band">
            <p className="public-page-cta-band__copy">
              Gambling help:{" "}
              <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer">
                NCPG.org
              </a>{" "}
              · <strong>1-800-GAMBLER</strong>
            </p>
            <p className="public-page-cta-band__tagline">Made for Degens. By Degens.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
