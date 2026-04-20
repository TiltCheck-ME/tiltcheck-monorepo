/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20 */
import Link from "next/link";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";

const problemStats = [
  {
    label: "Casino edge",
    value: "24/7",
    description: "The casino stays open, the math stays live, and the player is the only part of the system that gets tired.",
  },
  {
    label: "Data gap",
    value: "0 proof",
    description: "Most players have gut feel, not evidence, when payouts drift or terms get buried.",
  },
  {
    label: "Guardrail job",
    value: "Hard stop",
    description: "TiltCheck exists to turn raw session data into warnings, receipts, and cleaner exits before tilt wins.",
  },
];

const philosophyCards = [
  {
    title: "We do not pretend gambling disappears",
    body: "People are going to gamble. The real question is whether they do it with data and guardrails or with denial.",
  },
  {
    title: "We give you signal, not stories",
    body: "Live session reads, fairness checks, tilt signals, and trust context. The math is the point.",
  },
  {
    title: "We enforce accountability, not shame",
    body: "When your line gets hit, the system should help you act. No fake concern theater. No passive warning wallpaper.",
  },
  {
    title: "We play the long game",
    body: "Winning a session matters less than keeping the money. Guardrails exist because cashing out is the hard part.",
  },
  {
    title: "We do not ask for direct wallet control",
    body: "The core session tools are built around signal, evidence, and guardrails. Players stay in charge of the wallet side.",
  },
];

export default function AboutPage() {
  return (
    <main className="public-page text-white">
      <PublicPageHero
        eyebrow="About TiltCheck"
        title={
          <>
            Built by a player.
            <br />
            Shipped like a defense system.
          </>
        }
        description={
          <p>
            TiltCheck was built by someone who knows exactly what a 3 a.m. loss streak feels like and decided the right
            answer was better math, better guardrails, and better receipts instead of another gambling pep talk.
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
        stats={problemStats}
        panel={
          <>
            <p className="public-page-panel__eyebrow">What this product is</p>
            <h2 className="public-page-panel__title">A read-only gambling audit and bankroll defense product.</h2>
            <p className="public-page-panel__body">
              TiltCheck is not a casino, not a bank, and not a miracle. It watches live sessions, checks fairness
              claims, and helps players leave with more evidence and more control.
            </p>
            <ul className="public-page-list">
              <li>Audit live sessions without handing over direct wallet control.</li>
              <li>Turn fairness claims into evidence instead of gut feel.</li>
              <li>Make exits and accountability feel operational, not optional.</li>
            </ul>
          </>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader
            eyebrow="The problem"
            title="Most players are facing a machine built to outlast them."
            description={
              <p>
                Players usually fight back with hope, memory, and a feeling that something seems off. That is not a fair
                fight. TiltCheck exists because the blind spot is the real tax.
              </p>
            }
          />

          <div className="public-page-grid public-page-grid--2">
            <article className="public-page-card">
              <p className="public-page-card__eyebrow">Casino advantage</p>
              <h3 className="public-page-card__title">The platform side stays sharp while the player side burns out.</h3>
              <ul className="public-page-list">
                <li>Casinos are live 24/7. Your discipline is not.</li>
                <li>Every game ships with a built-in edge and optional RTP tiers.</li>
                <li>Lights, near-misses, and pacing are engineered to keep you spinning.</li>
              </ul>
            </article>

            <article className="public-page-card">
              <p className="public-page-card__eyebrow">Player disadvantage</p>
              <h3 className="public-page-card__title">Most players are flying blind while the platform reads the board.</h3>
              <ul className="public-page-list">
                <li>Hope feels like a strategy when you are down bad. It is not.</li>
                <li>You rarely know your actual RTP or whether a slot was quietly nerfed.</li>
                <li>Emotions make chasing losses feel logical right when it is most stupid.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
            <PublicPageSectionHeader
              eyebrow="The philosophy"
              title="Simple rules. Hard edges."
              description={<p>The product direction stays simple: surface signal, enforce the line, and never pretend feelings are proof.</p>}
            />

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
              <h2 className="public-page-card__title">jmenichole (Founder &amp; Dev)</h2>
              <div className="public-page-card__body">
                <p>
                  Spent years chasing losses. Learned to code. Built the tool that would have saved past-me a lot of
                  money. Now the product exists for everyone else who needed it too.
                </p>
                <p>
                  Specialties: full-stack architecture, trust engines, behavioral analysis, and knowing exactly what
                  down bad at 3 a.m. feels like.
                </p>
              </div>
            </article>

            <article className="public-page-card">
              <p className="public-page-card__eyebrow">What&apos;s next</p>
              <h2 className="public-page-card__title">More supported sessions. Better proof. Cleaner interventions.</h2>
              <ul className="public-page-list">
                <li>Mobile extension path and tighter live session coverage.</li>
                <li>Smarter tilt detection and better intervention workflows.</li>
                <li>Casino fairness lawsuit tracking and stronger trust evidence.</li>
                <li>Multiplayer accountability, live tournament mode, and community safety layers.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-cta-band">
            <p className="public-page-panel__eyebrow">One more thing</p>
            <h2 className="public-page-cta-band__title">You are already facing live math. Better to see it than guess.</h2>
            <p className="public-page-cta-band__copy">
              TiltCheck exists because gambling gets expensive fast when the signal disappears. If you&apos;ve lost money
              you cannot afford to lose, reach out to{" "}
              <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer">
                NCPG.org
              </a>{" "}
              or call <strong>1-800-GAMBLER</strong>. Real help exists.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
