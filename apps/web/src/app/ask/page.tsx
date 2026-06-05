/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
'use client';

import PublicPageHero from '@/components/PublicPageHero';
import IntelChatPanel from '@/components/intel/IntelChatPanel';

export default function AskPage() {
  return (
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        eyebrow="Ask intel"
        title="Casino trust, lists, and domain scans — in plain language."
        description={
          <p>
            Grades and scam flags come from the trust engine and RGaaS APIs. Ask a question; get cards and links to full audits.
          </p>
        }
      />

      <section className="public-page-section px-4 pb-16">
        <div className="landing-shell max-w-3xl">
          <IntelChatPanel />
        </div>
      </section>
    </main>
  );
}
