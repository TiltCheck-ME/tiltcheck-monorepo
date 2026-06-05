/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import PublicPageHero from "@/components/PublicPageHero";

const legalCards = [
  {
    href: "https://github.com/TiltCheck-ME/tiltcheck-monorepo/blob/main/docs/legal/custody-matrix.md",
    eyebrow: "Reference",
    title: "Custody matrix",
    description:
      "Per-flow truth: who signs, who holds, and what happens if TiltCheck is down. Use this before claiming non-custodial for credits or relay tips.",
  },
  {
    href: "/terms",
    eyebrow: "v2.1",
    title: "Terms of Service",
    description:
      "Age requirements, what TiltCheck is and is not, the non-custodial clause, payment policy, prohibited uses, and liability limits.",
  },
  {
    href: "/privacy",
    eyebrow: "v1.1",
    title: "Privacy Policy",
    description:
      "What data TiltCheck collects, what it never collects, how retention works, and how deletion requests are handled.",
  },
  {
    href: "/legal/limit",
    eyebrow: "Configure",
    title: "Risk Limits",
    description:
      "Set your own daily deposit cap, session time limit, and loss threshold. Stored locally. No account required.",
  },
];

export default function LegalPage() {
  return (
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        centered
        eyebrow="Legal"
        title="Legal documents"
        description={<p>Terms, privacy, custody reference, and self-set risk limits.</p>}
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-grid public-page-grid--3">
            {legalCards.map((card) => (
              <a key={card.href} href={card.href} className="block h-full">
                <article className="public-page-card h-full transition-colors hover:border-[#17c3b2]/40 hover:bg-[#17c3b2]/5">
                  <p className="public-page-card__eyebrow">{card.eyebrow}</p>
                  <h2 className="public-page-card__title">{card.title}</h2>
                  <p className="public-page-card__copy">{card.description}</p>
                </article>
              </a>
            ))}
          </div>

          <div className="mt-6 public-page-card">
            <p className="public-page-card__eyebrow">Questions or requests</p>
            <div className="public-page-grid public-page-grid--3 mt-4">
              <div>
                <p className="public-page-card__eyebrow text-gray-500">Legal</p>
                <a href="mailto:legal@tiltcheck.me">legal@tiltcheck.me</a>
              </div>
              <div>
                <p className="public-page-card__eyebrow text-gray-500">Privacy / Data Requests</p>
                <a href="mailto:privacy@tiltcheck.me">privacy@tiltcheck.me</a>
              </div>
              <div>
                <p className="public-page-card__eyebrow text-gray-500">Billing</p>
                <a href="mailto:support@tiltcheck.me">support@tiltcheck.me</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
