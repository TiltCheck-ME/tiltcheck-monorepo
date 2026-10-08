// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import type { MetadataRoute } from 'next';

export type SitemapCategory =
  | 'Core'
  | 'Trust & intel'
  | 'Tools'
  | 'Casino setup'
  | 'Operators'
  | 'Community & docs'
  | 'Legal & RG';

export type SitemapPageEntry = {
  path: string;
  title: string;
  description?: string;
  category: SitemapCategory;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
  /** Full URL override (e.g. dashboard handoff) */
  href?: string;
};

export const SITEMAP_PAGE_ENTRIES: SitemapPageEntry[] = [
  { path: '/', title: 'Home', category: 'Core', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/login', title: 'Account', category: 'Core', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/dashboard', title: 'Dashboard', category: 'Core', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/touch-grass', title: 'Touch Grass', category: 'Core', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/terms', title: 'Terms of service', category: 'Legal & RG', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', title: 'Privacy policy', category: 'Legal & RG', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal', title: 'Legal hub', category: 'Legal & RG', changeFrequency: 'yearly', priority: 0.3 },
];

export const SITEMAP_CATEGORY_ORDER: SitemapCategory[] = [
  'Core',
  'Trust & intel',
  'Tools',
  'Casino setup',
  'Operators',
  'Community & docs',
  'Legal & RG',
];

export function resolveSitemapHref(base: string, entry: Pick<SitemapPageEntry, 'path' | 'href'>): string {
  if (entry.href) return entry.href;
  const path = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
  return `${base.replace(/\/$/, '')}${path}`;
}

/** True when resolved href targets a different origin than siteBase (avoids substring false positives). */
export function isExternalSitemapHref(resolvedHref: string, siteBase: string): boolean {
  if (!/^https?:\/\//i.test(resolvedHref)) return false;
  try {
    return new URL(resolvedHref).origin !== new URL(siteBase).origin;
  } catch {
    return false;
  }
}
