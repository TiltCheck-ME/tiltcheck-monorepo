/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import Link from "next/link";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";

const workflowStats = [
  {
    label: "Install path",
    value: "1 load",
    description: "Sideload the extension once, then let the audit layer stay inside the tab where the session happens.",
  },
  {
    label: "Signal job",
    value: "Live drift",
    description: "Session telemetry, RTP gaps, and trust signals get read in real time instead of after the damage.",
  },
  {
    label: "Escalation",
    value: "Receipt ready",
    description: "Evidence only gets surfaced when the numbers are strong enough to say something worth saying.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Deploy the audit layer",
    body: "Install the extension and sync your forensic node. It needs storage, active tab access, and site permissions so it can inspect session telemetry without custody and without warning the casino it is being watched.",
    note: "One install. Zero custody. A forensic layer between you and the shadow-nerfed math.",
  },
  {
    step: "02",
    title: "Run the live audit",
    body: "Every spin gets cross-referenced against GLI-certified RTP tiers and supporting trust signals. If a casino is pushing a greedier config than the certified top line, TiltCheck flags the gap and translates it into an actual cost.",
    note: "Live example: certified 96.5%, platform running 92.0%, greed premium charged back to the player per $100 wagered.",
  },
  {
    step: "03",
    title: "Enforce and escalate",
    body: "When the math breaks, the system does not throw weak evidence over the wall. It waits until the sample is strong enough, builds the packet, and locks the bag before tilt takes another bite.",
    note: "The point is not to complain louder. The point is to show up with numbers that hold.",
  },
];

const faqs = [
  {
    question: "Do you see my wallet key?",
    answer:
      "No. We never ask for it, store it, or want it. The audit layer reads casino activity and session-visible signals. Your keys stay yours.",
  },
  {
    question: 'What is a "Greed Premium"?',
    answer:
      "Slot providers certify multiple RTP tiers. A game certified at 96.5% can still be deployed lower. The gap between the certified top line and the live observed tier is the greed premium players are paying.",
  },
  {
    question: "How does the Evidence Packet work?",
    answer:
      "The trigger stays locked until the sample is statistically worth something. Once it crosses that line, the packet assembles the supporting data and formats the receipts for escalation.",
  },
  {
    question: "What if I'm already in crisis?",
    answer:
      "TiltCheck is harm reduction, not treatment. If you've lost money you cannot afford to lose, contact the National Council on Problem Gambling at 1-800-GAMBLER or visit ncpg.org.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="public-page text-white">
      <PublicPageHero
        eyebrow="How the stack works"
        title={
          <>
            Audit the session.
            <br />
            Enforce the line.
          </>
        }
        description={
          <p>
            The house wins because it controls the math. TiltCheck inserts a forensic layer between the player and the
            platform so drift, proof quality, and exit conditions stop being guesses.
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
            <h2 className="public-page-panel__title">Read-only telemetry in. Hard exits and receipts out.</h2>
            <ul className="public-page-list">
              <li>Extension watches supported casino tabs in real time.</li>
              <li>Certified RTP ranges and trust signals frame what &quot;normal&quot; looks like.</li>
              <li>Guardrails lock the bag and route you to the next sane move.</li>
            </ul>
          </>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader
            eyebrow="Workflow"
            title="Three steps. No mystery theater."
            description={<p>The homepage sets the tone. This page carries the same structure deeper into the actual operating flow.</p>}
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
            description={<p>Good. Skepticism is healthy. The point is to answer it with specifics instead of vague product comfort copy.</p>}
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
            <h2 className="public-page-cta-band__title">Ready to see what the casino does not want you to see?</h2>
            <p className="public-page-cta-band__copy">
              Install the forensic node. Let the live audit layer do the boring math while you decide whether the
              session still deserves your money.
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
