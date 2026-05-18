/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-04 */
import Link from "next/link";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";

const workflowStats = [
  {
    label: "Install path",
    value: "1-click load",
    description: "Install it once, then keep the safety dashboard inside the active browser tab where your gameplay happens.",
  },
  {
    label: "Live job",
    value: "Watch + compare",
    description: "TiltCheck reads session activity, speed spikes, and platform pressure while you play, then flags the sus parts before they snowball.",
  },
  {
    label: "Output",
    value: "Receipts + exits",
    description: "When the evidence is strong enough, you get proof and a clear way out instead of more guessing.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Install the extension",
    body: "Get our read-only extension so TiltCheck can watch gameplay pacing, session events, and check the math. We don't touch your wallet or private keys.",
    note: "One install. It watches the session from inside your browser.",
  },
  {
    step: "02",
    title: "Spot behavior loops and payout shifts",
    body: "TiltCheck compares live behavior to trust signals, payout expectations, and the guardrails you set. If the session pacing gets sus or payouts look weaker than they should, it flags both before tilt starts calling the shots.",
    note: "You stop relying on gut feel and start seeing the trap.",
  },
  {
    step: "03",
    title: "Act on proof, not emotion",
    body: "When the evidence is clear, TiltCheck packages the data and enforces the guardrails you already set. That can mean a warning, a cash-out push, or a hard stop.",
    note: "Catch bad math early. Stop bad decisions late.",
  },
];

const faqs = [
  {
    question: "Do you see my wallet key?",
    answer:
      "No. We never ask for it, store it, or want it. The extension reads casino activity and session-visible signals without needing your private key.",
  },
  {
    question: "What does payout drift mean here?",
    answer:
      "Casinos can configure the same slot machine to pay out less. A game set to return 96% might silently be set to 94% on some platforms. TiltCheck runs the math on your session in real time to show you if the casino has secretly nerfed the game's payout speed.",
  },
  {
    question: "When do I actually get evidence?",
    answer:
      "Not after one weird spin. TiltCheck waits until the sample is strong enough to be worth taking seriously, then bundles the supporting data into something you can review or escalate.",
  },
  {
    question: "What if I'm already in crisis?",
    answer:
      "TiltCheck is The Brakes, not a therapist. If you've lost money you cannot afford to lose, contact the National Council on Problem Gambling at 1-800-GAMBLER or visit ncpg.org.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="public-page text-white">
      <PublicPageHero
        eyebrow="How TiltCheck works"
        title={
          <>
            Watch the session.
            <br />
            Explain the risk.
            <br />
            Enforce the exit.
          </>
        }
        description={
          <p>
            TiltCheck is a read-only browser guardrail. While normal stats tools only show the damage after the fact, 
            TiltCheck works in real time—tracking behavioral spirals, speed shifts, and silent payout nerfing, 
            pulling you out before you blow your bankroll.
          </p>
        }
        actions={
          <>
            <Link href="/extension" className="btn btn-primary" data-text="INSTALL THE EXTENSION">
              INSTALL THE EXTENSION
            </Link>
            <a
              href="https://discord.gg/gdBsEJfCar"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              data-text="JOIN DISCORD"
            >
              JOIN DISCORD
            </a>
          </>
        }
        stats={workflowStats}
        panel={
          <>
            <p className="public-page-panel__eyebrow">System flow</p>
            <h2 className="public-page-panel__title">Read-only data in. Plain-English signal out.</h2>
            <ul className="public-page-list">
              <li>The extension watches supported casino tabs in real time.</li>
              <li>TiltCheck compares live behavior to trust signals, payout expectations, and your own guardrails.</li>
              <li>Your rules handle the exit when the session stops making sense.</li>
            </ul>
          </>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
            <PublicPageSectionHeader
              eyebrow="Workflow"
              title="Three steps. No mystery theater."
              description={<p>This is the short version for first-time users: install it, let it watch, then use the signal.</p>}
            />

          <div className="public-page-grid public-page-grid--3">
            {workflowSteps.map((step) => (
              <article key={step.step} className="public-page-card">
                <p className="public-page-card__eyebrow">Step {step.step}</p>
                <h2 className="public-page-card__title">{step.title}</h2>
                <p className="public-page-card__copy">{step.body}</p>
                <div className="public-page-card__body">
                  <p>{step.note}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
            <PublicPageSectionHeader
              eyebrow="Common fears"
              title="The questions people ask right before they install."
              description={<p>Good. Skepticism is healthy. Here are the straight answers without the fog.</p>}
              split={false}
            />

          <div className="public-page-grid">
            {faqs.map((faq) => (
              <details key={faq.question} className="public-page-card group">
                <summary className="cursor-pointer list-none text-left">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="public-page-card__title !mt-0">{faq.question}</h3>
                    <span className="public-page-card__eyebrow text-[#17c3b2] transition-transform group-open:rotate-45">
                      +
                    </span>
                  </div>
                </summary>
                <div className="public-page-card__body">
                  <p>{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-cta-band">
            <p className="public-page-panel__eyebrow">Next move</p>
            <h2 className="public-page-cta-band__title">Ready to see the product in your own tab?</h2>
            <p className="public-page-cta-band__copy">
              Install the extension, let TiltCheck spot the tilt loop and the weak payout drift, then decide whether
              that session still deserves another dollar from you.
            </p>
            <div className="public-page-cta-band__actions">
              <Link href="/extension" className="btn btn-primary" data-text="OPEN EXTENSION PAGE">
                OPEN EXTENSION PAGE
              </Link>
              <Link href="/casinos" className="btn btn-secondary" data-text="CHECK TRUST SCORES">
                CHECK TRUST SCORES
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
