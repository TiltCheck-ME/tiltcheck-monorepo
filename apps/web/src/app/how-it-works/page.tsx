/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-09 */
import Link from "next/link";
import PublicPageHero, { PublicPageSectionHeader } from "@/components/PublicPageHero";
import JsonLd from "@/components/JsonLd";
import { faqPageJsonLd } from "@/lib/structured-data";

const workflowSteps = [
  {
    step: "01",
    title: "Install",
    body: "The extension sits on the casino tab and watches how fast you click and bet. Read-only. No wallet keys.",
    note: "Lives in your browser tab.",
  },
  {
    step: "02",
    title: "Watch",
    body: "Clicking faster, betting bigger, chasing? It notices and says so, out loud and a little rude.",
    note: "It talks. You decide.",
  },
  {
    step: "03",
    title: "Exit",
    body: "Two seconds between spins. Your blocked games stop clicking. Want more? Sign a Touch Grass lock ahead of time and the cashier stays dead until it runs out.",
    note: "Stopping is still your move.",
  },
];

const faqs = [
  {
    question: "Do you see my wallet key?",
    answer: "No. We never ask for it. The extension reads casino activity without private keys.",
  },
  {
    question: "What is payout drift?",
    answer:
      "Same slot, quieter returns than advertised. Once there are enough spins to mean something, TiltCheck points it out. Not from one weird spin.",
  },
  {
    question: "When do I get evidence?",
    answer: "After the sample is strong enough — not one weird spin.",
  },
  {
    question: "Crisis?",
    answer: "TiltCheck is brakes, not therapy. NCPG: 1-800-GAMBLER or ncpg.org.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="public-page public-page--tight text-white">
      <JsonLd data={faqPageJsonLd(faqs)} />
      <PublicPageHero
        compact
        eyebrow="How it works"
        title="Watch. Heckle. Your move."
        description={
          <p>
            We notice the spiral, talk shit about it, and add friction. Stopping is on you.
          </p>
        }
        actions={
          <>
            <Link href="/extension" className="btn btn-primary" data-text="THE EXTENSION">
              THE EXTENSION
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
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <PublicPageSectionHeader compact eyebrow="Flow" title="Three steps." />
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
          <PublicPageSectionHeader compact eyebrow="FAQ" title="Straight answers." split={false} />
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
    </main>
  );
}
