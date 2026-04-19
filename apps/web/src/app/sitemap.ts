/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import type { MetadataRoute } from 'next';
import { CASINOS } from '@/lib/casino-trust';
import { getDashboardHandoffUrl } from '@/lib/dashboard-handoff';

const BASE = 'https://tiltcheck.me';

// Priority tiers: core product pages > tools > intel > info
const PAGES: Array<{ url: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
  { url: '/',                           changeFrequency: 'weekly',  priority: 1.0 },
  { url: '/casinos',                    changeFrequency: 'daily',   priority: 0.9 },
  { url: '/bonuses',                    changeFrequency: 'daily',   priority: 0.9 },
  { url: getDashboardHandoffUrl('/dashboard'), changeFrequency: 'weekly', priority: 0.6 },
  { url: '/extension',                  changeFrequency: 'monthly', priority: 0.8 },
  // Tools
  { url: '/tools/domain-verifier',      changeFrequency: 'weekly',  priority: 0.8 },
  { url: '/tools/auto-vault',           changeFrequency: 'monthly', priority: 0.7 },
  { url: '/tools/scan-scams',           changeFrequency: 'daily',   priority: 0.7 },
  { url: '/tools/house-edge-scanner',   changeFrequency: 'weekly',  priority: 0.7 },
  { url: '/tools/session-stats',        changeFrequency: 'weekly',  priority: 0.7 },
  { url: '/tools/justthetip',           changeFrequency: 'monthly', priority: 0.6 },
  { url: '/tools/verify',               changeFrequency: 'monthly', priority: 0.6 },
  { url: '/tools/collectclock',         changeFrequency: 'weekly',  priority: 0.6 },
  { url: '/tools/degens-arena',         changeFrequency: 'weekly',  priority: 0.6 },
  // Intel
  { url: '/intel/rtp',                  changeFrequency: 'daily',   priority: 0.7 },
  { url: '/intel/scanner',              changeFrequency: 'weekly',  priority: 0.7 },
  { url: '/intel/scams',                changeFrequency: 'daily',   priority: 0.7 },
  // Info / community
  { url: '/how-it-works',               changeFrequency: 'monthly', priority: 0.6 },
  { url: '/about',                      changeFrequency: 'monthly', priority: 0.5 },
  { url: '/blog',                       changeFrequency: 'weekly',  priority: 0.6 },
  { url: '/beta-tester',                changeFrequency: 'monthly', priority: 0.5 },
  { url: '/collab',                     changeFrequency: 'monthly', priority: 0.5 },
  { url: '/microgrant',                 changeFrequency: 'monthly', priority: 0.5 },
  { url: '/getting-started',            changeFrequency: 'monthly', priority: 0.5 },
  { url: '/docs',                       changeFrequency: 'monthly', priority: 0.5 },
  // Compliance / RG
  { url: '/touch-grass',                changeFrequency: 'monthly', priority: 0.4 },
  { url: '/sos',                        changeFrequency: 'monthly', priority: 0.4 },
  { url: '/terms',                      changeFrequency: 'yearly',  priority: 0.3 },
  { url: '/legal/limit',                changeFrequency: 'yearly',  priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();
  return [
    ...PAGES.map(({ url, changeFrequency, priority }) => ({
      url: `${BASE}${url}`,
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
