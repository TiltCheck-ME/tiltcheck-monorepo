/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 */
import type { MetadataRoute } from 'next';

export type SitemapCategory = 'Core' | 'Casino setup' | 'Legal & RG';

export type SitemapPageEntry = {
  path: string;
  title: string;
  description?: string;
  category: SitemapCategory;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
};

export const SITEMAP_PAGE_ENTRIES: SitemapPageEntry[] = [
  { path: '/', title: 'Home', category: 'Core', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/extension', title: 'Chrome extension', category: 'Core', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/casinos', title: 'Casino trust directory', category: 'Core', changeFrequency: 'daily', priority: 0.9 },
  { path: '/bonuses', title: 'Daily bonus feed', category: 'Core', changeFrequency: 'daily', priority: 0.9 },
  { path: '/site-map', title: 'Site map', category: 'Core', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/stake', title: 'Stake.us setup', category: 'Casino setup', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/nuts', title: 'nuts.gg setup', category: 'Casino setup', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/touch-grass', title: 'Touch Grass', category: 'Legal & RG', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/terms', title: 'Terms of service', category: 'Legal & RG', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', title: 'Privacy policy', category: 'Legal & RG', changeFrequency: 'yearly', priority: 0.3 },
];

export const SITEMAP_CATEGORY_ORDER: SitemapCategory[] = ['Core', 'Casino setup', 'Legal & RG'];

export function resolveSitemapHref(base: string, entry: SitemapPageEntry): string {
  const path = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
  return `${base.replace(/\/$/, '')}${path}`;
}
