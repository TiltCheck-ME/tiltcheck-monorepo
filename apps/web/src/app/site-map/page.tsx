/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 */
import Link from 'next/link';
import type { Metadata } from 'next';
import PublicPageHero from '@/components/PublicPageHero';
import { CASINOS } from '@/lib/casino-trust';
import {
  resolveSitemapHref,
  SITEMAP_CATEGORY_ORDER,
  SITEMAP_PAGE_ENTRIES,
  type SitemapCategory,
} from '@/lib/sitemap-entries';

const BASE = 'https://tiltcheck.me';

export const metadata: Metadata = {
  title: 'Site map',
  description: 'Browse every public TiltCheck page — tools, trust intel, bonuses, and legal.',
  alternates: { canonical: `${BASE}/site-map` },
};

function groupByCategory() {
  const groups = new Map<SitemapCategory, typeof SITEMAP_PAGE_ENTRIES>();
  for (const category of SITEMAP_CATEGORY_ORDER) {
    groups.set(category, []);
  }
  for (const entry of SITEMAP_PAGE_ENTRIES) {
    groups.get(entry.category)?.push(entry);
  }
  return groups;
}

export default function SiteMapPage() {
  const groups = groupByCategory();
  const casinoSample = CASINOS.slice(0, 12);

  return (
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        eyebrow="Index // all surfaces"
        title="Site map"
        description={
          <p>
            Every public page on tiltcheck.me. Crawlers still get the raw feed at{' '}
            <Link href="/sitemap.xml" className="text-[#17c3b2] underline-offset-2 hover:underline">
              /sitemap.xml
            </Link>
            .
          </p>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell space-y-10">
          {SITEMAP_CATEGORY_ORDER.map((category) => {
            const entries = groups.get(category) ?? [];
            if (entries.length === 0) return null;
            return (
              <div key={category}>
                <h2 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#17c3b2]">{category}</h2>
                <ul className="public-page-grid public-page-grid--2">
                  {entries.map((entry) => {
                    const href = resolveSitemapHref(BASE, entry);
                    const isExternal = href.startsWith('http') && !href.startsWith(BASE);
                    return (
                      <li key={entry.path}>
                        <Link
                          href={isExternal ? href : entry.path}
                          className="public-page-card block h-full border-gray-800/60 bg-gray-900/30 hover:border-[#17c3b2]/40 hover:bg-[#17c3b2]/5 transition-colors"
                          {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                          <p className="public-page-card__title text-white">{entry.title}</p>
                          {entry.description ? (
                            <p className="public-page-card__copy text-gray-400">{entry.description}</p>
                          ) : (
                            <p className="public-page-card__copy font-mono text-xs text-gray-500">{entry.path}</p>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          <div>
            <h2 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#ffd700]">
              Casinos ({CASINOS.length} proof pages)
            </h2>
            <p className="mb-4 max-w-2xl text-sm text-gray-400">
              Full trust profiles at <span className="font-mono text-gray-300">/casinos/[slug]</span>. Sample below —
              directory has the rest.
            </p>
            <ul className="flex flex-wrap gap-2">
              {casinoSample.map((casino) => (
                <li key={casino.slug}>
                  <Link
                    href={`/casinos/${casino.slug}`}
                    className="inline-block rounded-full border border-gray-700/80 bg-gray-900/50 px-3 py-1.5 text-xs text-gray-200 hover:border-[#17c3b2]/50 hover:text-[#17c3b2]"
                  >
                    {casino.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/casinos"
                  className="inline-block rounded-full border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#17c3b2]"
                >
                  View all
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="public-page-section px-4 pb-12 text-center text-sm text-gray-500">
        Made for Degens. By Degens.
      </footer>
    </main>
  );
}
