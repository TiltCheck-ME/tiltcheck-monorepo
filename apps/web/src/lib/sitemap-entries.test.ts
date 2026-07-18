// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17

import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITEMAP_PAGE_ENTRIES } from './sitemap-entries';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIR = path.join(ROOT, 'app');

const EXCLUDED_PREFIXES = [
  '/login',
  '/onboarding',
  '/(dashboard)',
];

const EXCLUDED_DYNAMIC_SEGMENTS = ['[', ']'];

function collectStaticRoutes(dir: string, prefix = ''): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (!statSync(fullPath).isDirectory()) continue;

    const segment = entry.startsWith('(') && entry.endsWith(')')
      ? ''
      : entry;

    const routePath = `${prefix}${segment ? `/${segment}` : ''}`.replace(/\/+/g, '/') || '/';

    if (EXCLUDED_DYNAMIC_SEGMENTS.some((token) => segment.includes(token))) {
      continue;
    }

    const pageFile = path.join(fullPath, 'page.tsx');
    const hasPage = statSync(fullPath).isDirectory() && readdirSync(fullPath).includes('page.tsx');

    if (hasPage && !EXCLUDED_PREFIXES.some((excluded) => routePath.startsWith(excluded))) {
      routes.push(routePath === '' ? '/' : routePath);
    }

    routes.push(...collectStaticRoutes(fullPath, routePath));
  }
  return routes;
}

describe('sitemap-entries', () => {
  it('includes every static public route', () => {
    const staticRoutes = [...new Set(collectStaticRoutes(APP_DIR))].sort();
    const sitemapPaths = new Set(SITEMAP_PAGE_ENTRIES.map((entry) => entry.path));

    const missing = staticRoutes.filter((route) => !sitemapPaths.has(route));
    expect(missing, `Missing sitemap entries: ${missing.join(', ')}`).toEqual([]);
  });
});
