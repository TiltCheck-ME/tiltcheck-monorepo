/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 */
import type { MetadataRoute } from 'next';
import { getDashboardHandoffUrl } from '@/lib/dashboard-handoff';

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
  { path: '/extension', title: 'Chrome extension', category: 'Core', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/casinos', title: 'Casino trust directory', category: 'Core', changeFrequency: 'daily', priority: 0.9 },
  { path: '/bonuses', title: 'Daily bonus feed', category: 'Core', changeFrequency: 'daily', priority: 0.9 },
  { path: '/ask', title: 'Intel chat', category: 'Core', changeFrequency: 'weekly', priority: 0.85 },
  {
    path: '/dashboard',
    title: 'Dashboard',
    description: 'Vault, safety, buddies — handoff to dashboard.tiltcheck.me',
    category: 'Core',
    changeFrequency: 'weekly',
    priority: 0.6,
    href: getDashboardHandoffUrl('/dashboard'),
  },
  { path: '/site-map', title: 'Site map', category: 'Core', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/tools', title: 'Tools index', category: 'Tools', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/tools/auto-vault', title: 'AutoVault', category: 'Tools', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/tools/auto-vault/android', title: 'AutoVault Android', category: 'Tools', changeFrequency: 'monthly', priority: 0.65 },
  { path: '/tools/auto-vault/share', title: 'AutoVault share', category: 'Tools', changeFrequency: 'monthly', priority: 0.65 },
  { path: '/tools/verify', title: 'Fairness verifier', category: 'Tools', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/tools/domain-verifier', title: 'Domain verifier', category: 'Tools', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/tools/session-stats', title: 'Session stats', category: 'Tools', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/tools/house-edge-scanner', title: 'House edge scanner', category: 'Tools', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/tools/justthetip', title: 'JustTheTip', category: 'Tools', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/tools/degens-arena', title: 'Degen Arena', category: 'Tools', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/tools/scan-scams', title: 'Scan scams', category: 'Tools', changeFrequency: 'daily', priority: 0.7 },
  { path: '/tools/collectclock', title: 'CollectClock', category: 'Tools', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/tools/buddy-system', title: 'Buddy system', category: 'Tools', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/tools/geo-laws', title: 'Geo laws', category: 'Tools', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/tools/tarot-flip-comparison', title: 'Tarot flip comparison', category: 'Tools', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/tools/session-wager', title: 'Session wager', category: 'Tools', changeFrequency: 'weekly', priority: 0.55 },
  { path: '/intel/rtp', title: 'RTP reference', category: 'Trust & intel', changeFrequency: 'daily', priority: 0.7 },
  { path: '/intel/scanner', title: 'Bonus scanner', category: 'Trust & intel', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/intel/scams', title: 'Scam blacklist', category: 'Trust & intel', changeFrequency: 'daily', priority: 0.7 },
  { path: '/stake', title: 'Stake.us setup', category: 'Casino setup', changeFrequency: 'monthly', priority: 0.65 },
  { path: '/nuts', title: 'nuts.gg setup', category: 'Casino setup', changeFrequency: 'monthly', priority: 0.65 },
  { path: '/how-it-works', title: 'How it works', category: 'Community & docs', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about', title: 'About', category: 'Community & docs', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/getting-started', title: 'Getting started', category: 'Community & docs', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/blog', title: 'Blog', category: 'Community & docs', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/docs', title: 'Documentation', category: 'Community & docs', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/collab', title: 'Collaborate', category: 'Community & docs', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/beta-tester', title: 'Beta tester', category: 'Community & docs', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/microgrant', title: 'Microgrant', category: 'Community & docs', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/pay/jackpot', title: 'Trivia treasury', category: 'Community & docs', changeFrequency: 'monthly', priority: 0.45 },
  { path: '/operators', title: 'Operators', category: 'Operators', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/operators/keys', title: 'Operator API keys', category: 'Operators', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/operators/pricing', title: 'Operator pricing', category: 'Operators', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/operators/verify', title: 'Operator verify', category: 'Operators', changeFrequency: 'monthly', priority: 0.55 },
  { path: '/touch-grass', title: 'Touch Grass', category: 'Legal & RG', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/terms', title: 'Terms of service', category: 'Legal & RG', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', title: 'Privacy policy', category: 'Legal & RG', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal', title: 'Legal hub', category: 'Legal & RG', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/limit', title: 'Risk limits', category: 'Legal & RG', changeFrequency: 'yearly', priority: 0.3 },
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
