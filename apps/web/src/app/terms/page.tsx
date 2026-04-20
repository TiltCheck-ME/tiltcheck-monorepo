/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import PublicPageHero from "@/components/PublicPageHero";

const sections = [
  {
    title: "01. Who this applies to",
    body:
      "By using TiltCheck — website, Discord bots, extension, or API — you agree to these terms. You must be 18 or older. Jurisdiction limits are your job to manage.",
  },
  {
    title: "02. What TiltCheck is",
    body:
      "TiltCheck is a read-only session audit and trust scoring layer. It does not operate gambling games, manage bankrolls, execute trades, or custody funds.",
  },
  {
    title: "03. Non-custodial",
    body:
      "TiltCheck does not hold, control, or recover your funds or private keys. Vault behavior is a self-imposed timed lock on your own wallet.",
  },
  {
    title: "04. No financial or gambling advice",
    body:
      "RTP calculations, trust scores, and tilt alerts are informational tools based on available data and your own inputs. The math is the point. Your decisions are still yours.",
  },
  {
    title: "05. Tips and payments",
    body:
      "SOL tips sent through JustTheTip are final once confirmed on-chain. Premium subscriptions billed through Discord or SOL are final sale. Billing disputes should be raised within 48 hours.",
  },
  {
    title: "06. Prohibited uses",
    body: (
      <ul className="public-page-list public-page-list--danger">
        <li>Using TiltCheck to facilitate money laundering or fraud.</li>
        <li>Scraping, reversing, or abusing the API at scale without agreement.</li>
        <li>Impersonating TiltCheck or staff on Discord or social channels.</li>
        <li>Using bot accounts to manipulate trust scores or leaderboards.</li>
        <li>Accessing TiltCheck on behalf of a person under 18.</li>
      </ul>
    ),
  },
  {
    title: "07. Limitation of liability",
    body:
      "TiltCheck is provided as-is. We do not guarantee uptime, score accuracy, or data completeness. To the maximum extent permitted by law, TiltCheck and contributors are not liable for gambling losses, wallet incidents, or service outages.",
    variant: "danger",
  },
  {
    title: "08. Account termination",
    body:
      "We reserve the right to suspend or terminate access for accounts that violate these terms, including bot abuse, Discord role removal, and API access revocation.",
  },
  {
    title: "09. Changes to these terms",
    body:
      "We update these terms when the product meaningfully changes. The version number and date at the top of the page define the current version. Continued use after updates means acceptance.",
  },
  {
    title: "10. Contact",
    body: (
      <div className="public-page-card__body">
        <p>Legal questions: legal@tiltcheck.me</p>
        <p>Privacy questions: privacy@tiltcheck.me</p>
        <p>Billing disputes: support@tiltcheck.me</p>
      </div>
    ),
  },
];

export default function TermsPage() {
  return (
    <main className="public-page text-white">
      <PublicPageHero
        eyebrow="Legal / Terms"
        title="Terms of Service"
        description={
          <p>
            TiltCheck is an audit and transparency tool for gamblers who want to play with data instead of vibes. It is
            not a gambling operator, financial advisor, or bank.
          </p>
        }
        stats={[
          {
            label: "Version",
            value: "2.1",
            description: "Current public terms version.",
          },
          {
            label: "Custody model",
            value: "Zero",
            description: "TiltCheck does not hold your funds or keys.",
          },
          {
            label: "Advice posture",
            value: "None",
            description: "The product provides signal and enforcement, not financial or gambling advice.",
          },
        ]}
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-grid">
            {sections.map((section) => (
              <article
                key={section.title}
                className={`public-page-card ${section.variant === "danger" ? "public-page-card--danger" : ""}`}
              >
                <p className="public-page-card__eyebrow">Terms section</p>
                <h2 className="public-page-card__title">{section.title}</h2>
                {typeof section.body === "string" ? <p className="public-page-card__copy">{section.body}</p> : section.body}
              </article>
            ))}
          </div>

          <nav className="public-page-inline-nav mt-6">
            <a href="/privacy">Privacy Policy</a>
            <a href="/legal">All Legal Docs</a>
            <a href="/">Return to Terminal</a>
          </nav>
        </div>
      </section>
    </main>
  );
}
