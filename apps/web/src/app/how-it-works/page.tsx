/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
import Link from "next/link";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";

const workflowStats = [
  {
    label: "Install path",
    value: "1 sideload",
    description: "Load the extension once, then keep the audit layer inside the same tab where the session happens.",
  },
  {
    label: "Live job",
    value: "Watch + compare",
    description: "TiltCheck reads session activity, tilt patterns, and platform pressure while you play, then flags the sus parts before they snowball.",
  },
  {
    label: "Output",
    value: "Receipts + exits",
    description: "When the sample is strong enough, you get evidence and a clearer next move instead of more guessing.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Install the extension",
    body: "Load the read-only browser extension so TiltCheck can inspect the casino tab, session events, and fairness inputs. It does not need private keys or direct wallet control to do that job.",
    note: "One install. It watches the session from inside your browser.",
  },
  {
    step: "02",
    title: "Spot drift in behavior and payouts",
    body: "TiltCheck compares live behavior to trust signals, payout expectations, and the guardrails you set. If the session pacing gets sus or payouts look weaker than they should, it flags both before tilt starts calling the shots.",
    note: "You stop relying on gut feel and start seeing the trap.",
  },
  {
    step: "03",
    title: "Act on proof, not emotion",
    body: "When the sample is meaningful, TiltCheck packages the evidence and enforces the guardrails you already set. That can mean a warning, a cash-out push, or a hard stop.",
    note: "Catch bad math early. Stop bad decisions late.",
  },
];

const faqs = [
  {
    question: "Do you see my wallet key?",
    answer:
      "No. We never ask for it, store it, or want it. The audit layer reads casino activity and session-visible signals without needing your private key.",
  },
  {
    question: "What does RTP drift mean here?",
    answer:
      "Some slot games are certified at multiple RTP levels. A game that can run at 96.5% may still be deployed lower. TiltCheck looks for that gap and shows players when the live setup is worse than expected.",
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
            TiltCheck is a read-only browser extension and trust layer for casino players. Math verifiers already exist.
            TiltCheck covers the psychological gap by watching live sessions for tilt patterns, manipulative pacing,
            and payout drift, then applying The Brakes before a bad run turns into an even dumber decision.
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
