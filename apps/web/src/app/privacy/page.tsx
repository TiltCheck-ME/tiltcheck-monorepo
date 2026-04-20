/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import PublicPageHero from "@/components/PublicPageHero";

const sections = [
  {
    title: "01. What we collect",
    body: (
      <ul className="public-page-list">
        <li>Discord ID and username for account identity.</li>
        <li>Solana wallet public address when you link a wallet.</li>
        <li>Session data you explicitly create, including tilt signals and vault events.</li>
        <li>Terms acceptance timestamps and versions.</li>
        <li>Support messages submitted through TiltCheck support flows.</li>
      </ul>
    ),
  },
  {
    title: "02. What we never collect",
    body: (
      <ul className="public-page-list">
        <li>Private keys, seed phrases, or wallet passwords.</li>
        <li>Payment card numbers or bank details.</li>
        <li>Government ID or KYC documents.</li>
        <li>Browsing history outside active extension session detection.</li>
        <li>Casino data from tabs where the extension is inactive.</li>
      </ul>
    ),
  },
  {
    title: "03. How we use it",
    body:
      "Your data powers TiltCheck features like trust scoring, session auditing, vault management, and tipping flows. We do not use it for advertising, profiling, or resale. Aggregate stats may show up as ecosystem proof, but not as personal exposure.",
  },
  {
    title: "04. Data retention",
    body: (
      <ul className="public-page-list">
        <li>Session logs: 7 days, then purged.</li>
        <li>Vault events: retained for audit trail until you delete the account.</li>
        <li>Tip history: 90 days for dispute resolution.</li>
        <li>Account data: retained until deletion is requested.</li>
      </ul>
    ),
  },
  {
    title: "05. Third parties",
    body: (
      <div className="public-page-card__body">
        <p>Discord handles OAuth identity. Solana is public by design. Supabase/Neon and Railway/GCP handle storage and hosting.</p>
        <p>We do not use Google Analytics, Meta Pixel, or ad-tech SDKs.</p>
      </div>
    ),
  },
  {
    title: "06. Chrome extension",
    body:
      "The extension reads active tab URLs and session-visible data only on domains you explicitly activate it for. It does not log keystrokes, capture screenshots, or read unrelated tabs.",
  },
  {
    title: "07. Your rights",
    body: (
      <div className="public-page-card__body">
        <p>You can request a copy of your data, request deletion, correct identity details, and opt out of anonymized aggregate displays.</p>
        <p>Send requests to privacy@tiltcheck.me. Response target: within 30 days.</p>
      </div>
    ),
  },
  {
    title: "08. Cookies",
    body:
      "TiltCheck uses session cookies for authentication only. No tracking cookies. No cross-site cookies. No fake consent theater for trackers we are not running.",
  },
  {
    title: "09. Contact",
    body: (
      <div className="public-page-card__body">
        <p>Privacy inquiries: privacy@tiltcheck.me</p>
        <p>Data deletion requests: privacy@tiltcheck.me with subject line “Delete My Data”.</p>
      </div>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="public-page text-white">
      <PublicPageHero
        eyebrow="Legal / Privacy"
        title="Privacy Policy"
        description={
          <p>
            Short version: TiltCheck collects the minimum required to make the product work. We do not sell your data,
            and we do not store your private keys.
          </p>
        }
        stats={[
          {
            label: "Version",
            value: "1.1",
            description: "Current public privacy policy version.",
          },
          {
            label: "Retention floor",
            value: "7 days",
            description: "Session logs are purged fast because the product is not trying to hoard surveillance data.",
          },
          {
            label: "Ad-tech policy",
            value: "None",
            description: "No analytics trackers, no pixel sludge, no resale posture.",
          },
        ]}
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-grid">
            {sections.map((section) => (
              <article key={section.title} className="public-page-card">
                <p className="public-page-card__eyebrow">Policy section</p>
                <h2 className="public-page-card__title">{section.title}</h2>
                {typeof section.body === "string" ? <p className="public-page-card__copy">{section.body}</p> : section.body}
              </article>
            ))}
          </div>

          <nav className="public-page-inline-nav mt-6">
            <a href="/terms">Terms of Service</a>
            <a href="/legal">All Legal Docs</a>
            <a href="/">Return to Terminal</a>
          </nav>
        </div>
      </section>
    </main>
  );
}
