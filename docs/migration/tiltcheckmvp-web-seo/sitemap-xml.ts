/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 */
import { CASINOS } from '@tiltcheck/trust';
import { resolveSitemapHref, SITEMAP_PAGE_ENTRIES, type SitemapPageEntry } from '@/lib/sitemap-entries';

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlNode(base: string, entry: Pick<SitemapPageEntry, 'path' | 'changeFrequency' | 'priority'>, lastmod: string): string {
  const loc = resolveSitemapHref(base, entry as SitemapPageEntry);
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <lastmod>${xmlEscape(lastmod)}</lastmod>`,
    `    <changefreq>${entry.changeFrequency}</changefreq>`,
    `    <priority>${entry.priority.toFixed(1)}</priority>`,
    '  </url>',
  ].join('\n');
}

export function buildSitemapXml(base: string): string {
  const lastmod = new Date().toISOString();
  const staticUrls = SITEMAP_PAGE_ENTRIES.map((entry) => urlNode(base, entry, lastmod));
  const casinoUrls = CASINOS.map((casino) =>
    urlNode(base, { path: `/casinos/${casino.slug}`, changeFrequency: 'weekly', priority: 0.8 }, lastmod),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticUrls,
    ...casinoUrls,
    '</urlset>',
  ].join('\n');
}
