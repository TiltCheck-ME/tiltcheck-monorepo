/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-01 */
import type { Metadata } from 'next';
import PublicPageHero, { PublicPageSectionHeader } from '@/components/PublicPageHero';
import BrandTagline from '@/components/BrandTagline';
import { NUDGE_CATALOG } from '@/lib/nudge-catalog';

export const metadata: Metadata = {
  title: 'Nudges | The toasts that try to stop the rinse',
  description: NUDGE_CATALOG.metaDescription,
};

export default function NudgesPage() {
  return (
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        eyebrow={NUDGE_CATALOG.eyebrow}
        title={NUDGE_CATALOG.title}
        description={<p>{NUDGE_CATALOG.lede}</p>}
      />

      {NUDGE_CATALOG.groups.map((group) => (
        <section key={group.id} className="public-page-section px-4">
          <div className="landing-shell">
            <PublicPageSectionHeader compact eyebrow="Toast" title={group.when} />
            <div className="public-page-grid public-page-grid--2">
              {group.items.map((item) => (
                <article key={item.text} className="public-page-card nudge-toast">
                  <p className="public-page-card__eyebrow">{item.fire}</p>
                  <p className="nudge-toast__text">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      <p className="nudge-honesty">{NUDGE_CATALOG.honesty}</p>
      <p className="mb-10 text-center">
        <BrandTagline />
      </p>
    </main>
  );
}
