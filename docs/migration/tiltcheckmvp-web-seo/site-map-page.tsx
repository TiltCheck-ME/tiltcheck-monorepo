/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { CASINOS } from '@tiltcheck/trust';
import {
  SITEMAP_CATEGORY_ORDER,
  SITEMAP_PAGE_ENTRIES,
  type SitemapCategory,
} from '@/lib/sitemap-entries';

const BASE = (process.env.NEXT_PUBLIC_WEB_URL ?? 'https://tiltcheck.me').replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Site map',
  description: 'Browse every public TiltCheck page — trust directory, bonuses, extension, and legal.',
  alternates: { canonical: `${BASE}/site-map` },
};

function groupByCategory() {
  const groups = new Map<SitemapCategory, typeof SITEMAP_PAGE_ENTRIES>();
  for (const category of SITEMAP_CATEGORY_ORDER) groups.set(category, []);
  for (const entry of SITEMAP_PAGE_ENTRIES) groups.get(entry.category)?.push(entry);
  return groups;
}

export default function SiteMapPage() {
  const groups = groupByCategory();
  const casinoSample = CASINOS.slice(0, 12);

  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell">
          <span className="brand-eyebrow">Index // public routes</span>
          <h1 className="landing-hero-title">Site map</h1>
          <p className="landing-hero-subtitle max-w-2xl">
            Every crawlable page on tiltcheck.me. Raw XML at{' '}
            <Link href="/sitemap.xml" className="text-[#17c3b2] underline-offset-2 hover:underline">
              /sitemap.xml
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell space-y-10">
          {SITEMAP_CATEGORY_ORDER.map((category) => {
            const entries = groups.get(category) ?? [];
            if (entries.length === 0) return null;
            return (
              <div key={category}>
                <h2 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#17c3b2]">{category}</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {entries.map((entry) => (
                    <li key={entry.path}>
                      <Link
                        href={entry.path}
                        className="public-page-card block h-full border-gray-800/60 bg-gray-900/30 hover:border-[#17c3b2]/40 hover:bg-[#17c3b2]/5 transition-colors"
                      >
                        <p className="font-semibold text-white">{entry.title}</p>
                        <p className="mt-1 font-mono text-xs text-gray-500">{entry.path}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div>
            <h2 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#ffd700]">
              Casinos ({CASINOS.length})
            </h2>
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
