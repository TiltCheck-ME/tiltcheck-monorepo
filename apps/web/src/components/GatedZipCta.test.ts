// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HOME_LAUNCH } from '../lib/home-launch-copy';

describe('GatedZipCta source', () => {
  const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'GatedZipCta.tsx'), 'utf8');

  it('asserts gated state when HOME_LAUNCH.ctaReady is false', () => {
    expect(HOME_LAUNCH.ctaReady).toBe(false);
    expect(source).toContain('HOME_LAUNCH.ctaReady');
    expect(source).toContain('href={HOME_LAUNCH.ctaHref}');
    expect(source).toContain('download');
    expect(source).toContain('{HOME_LAUNCH.ctaLabel}');
    expect(source).toContain('ctaGatedHint');
    expect(source).toContain('btn-disabled');
  });
});
