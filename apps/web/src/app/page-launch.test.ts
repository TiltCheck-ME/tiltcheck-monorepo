// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('homepage source', () => {
  const source = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'page.tsx'),
    'utf8',
  );

  it('renders brakes hero, install, AutoVault, honesty', () => {
    expect(source).toContain('HOME_LAUNCH');
    expect(source).toContain('id="install"');
    expect(source).toContain('landing-hero');
    expect(source).toContain('HOME_LAUNCH.dopamine');
    expect(source).not.toContain('landing-hud');
    expect(source).toContain('HOME_LAUNCH.vault');
    expect(source).toContain('HOME_LAUNCH.tertiaryLink');
    expect(source).toContain('landing_cooldown_click');
    expect(source).toContain('data-funnel-source="web-home-hero"');
    expect(source).not.toContain('GatedZipCta');
    expect(source).not.toContain('pit-hero');
    expect(source).not.toContain('pit-slip');
    expect(source).not.toMatch(/lounge/i);
  });

  it('keeps tertiary off the button class', () => {
    expect(source).toContain('hero-actions__secondary-link');
    expect(source).not.toMatch(/tertiaryLink[\s\S]{0,200}className=\{cta\.href/);
  });

  it('does not sell the retired products', () => {
    expect(source).not.toContain('Instant Redeem');
    expect(source).not.toContain('OperatorBlock');
    expect(source).not.toContain('href="/casinos"');
    expect(source).not.toContain('href="/operators"');
    expect(source).not.toContain('Approved');
  });
});
