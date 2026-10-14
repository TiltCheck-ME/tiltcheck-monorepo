// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HOME_LAUNCH } from '../lib/home-launch-copy';

describe('GatedZipCta source', () => {
  const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'GatedZipCta.tsx'), 'utf8');

  it('shows why the zip button is disabled instead of a silent grey CTA', () => {
    expect(HOME_LAUNCH.ctaReady).toBe(false);
    expect(source).toContain('ctaGatedHint');
    expect(source).toContain('aria-describedby');
    expect(source).toContain('gated-zip-cta__why');
    expect(source).toContain('btn-disabled');
  });
});
