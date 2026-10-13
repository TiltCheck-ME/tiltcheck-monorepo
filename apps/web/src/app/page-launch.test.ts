// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('homepage source', () => {
  const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'page.tsx'), 'utf8');

  it('renders the locked copy and one zip button', () => {
    expect(source).toContain('HOME_LAUNCH');
    expect(source).toContain('id="install"');
    expect(source).toContain('data-funnel-event="landing_install_click"');
    expect(source).toContain('data-funnel-source="web-home-hero"');
    expect(source).toContain('data-funnel-label="Download the zip"');
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
