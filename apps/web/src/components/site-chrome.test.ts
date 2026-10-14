// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const chrome = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'SiteChrome.tsx'),
  'utf8',
);

describe('SiteChrome fallback source', () => {
  it('treats /touch-grass as embed/minimal before searchParams hydrate', () => {
    const fallbackStart = chrome.indexOf('function SiteChromeFallback');
    const fallbackEnd = chrome.indexOf('export default function SiteChrome');
    expect(fallbackStart).toBeGreaterThan(-1);
    expect(fallbackEnd).toBeGreaterThan(fallbackStart);
    const fallback = chrome.slice(fallbackStart, fallbackEnd);

    expect(fallback).toContain('isTouchGrassEmbedPath');
    expect(fallback).toMatch(/isTouchGrassEmbedPath\(\s*pathname\s*\)/);
    expect(fallback).not.toContain('useSearchParams');
    expect(fallback).toContain('Header');
    expect(fallback).toContain('Footer');
    expect(chrome).toContain("from '@/lib/touch-grass/is-touch-grass-embed-path'");
  });
});
