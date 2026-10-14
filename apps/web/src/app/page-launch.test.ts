// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-14
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('homepage source', () => {
  const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'page.tsx'), 'utf8');

  it('renders HOME_LAUNCH, install anchor, and hero funnel events', () => {
    expect(source).toContain('HOME_LAUNCH');
    expect(source).toContain('id="install"');
    expect(source).toContain('GatedZipCta');
    expect(source).toContain('funnelEvent="landing_install_click"');
    expect(source).toContain('funnelSource="web-home-hero"');
    expect(source.indexOf('SET A COOLDOWN LOCK')).toBeLessThan(source.indexOf('<GatedZipCta'));
    expect(source.indexOf('<GatedZipCta')).toBeLessThan(source.indexOf('EXTENSION DETAILS'));
    expect(source).not.toContain('lede');
    expect(source).not.toContain('installNote');
    expect(source).not.toContain('HOME_LAUNCH.mock');
  });

  it('does not sell the retired products', () => {
    expect(source).not.toContain('Instant Redeem');
    expect(source).not.toContain('OperatorBlock');
    expect(source).not.toContain('href="/casinos"');
    expect(source).not.toContain('href="/tools"');
    expect(source).not.toContain('href="/operators"');
    expect(source).not.toContain('Approved');
  });
});
