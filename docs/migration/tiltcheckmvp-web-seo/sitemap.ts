/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 */
import type { MetadataRoute } from 'next';
import { CASINOS } from '@tiltcheck/trust';

const BASE = (process.env.NEXT_PUBLIC_WEB_URL ?? 'https://tiltcheck.me').replace(/\/$/, '');

type SitemapPage = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
};

// Public indexable routes only. Auth-gated and noindex layouts excluded.
const PAGES: SitemapPage[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/extension', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/casinos', changeFrequency: 'daily', priority: 0.9 },
  { path: '/bonuses', changeFrequency: 'daily', priority: 0.9 },
  { path: '/stake', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/nuts', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/touch-grass', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  return [
    ...PAGES.map(({ path, changeFrequency, priority }) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...CASINOS.map((casino) => ({
      url: `${BASE}/casinos/${casino.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
