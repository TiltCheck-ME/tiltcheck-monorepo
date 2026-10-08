// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('not-found source', () => {
  const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'not-found.tsx'), 'utf8');

  it('recovers through home, touch grass, and the zip', () => {
    expect(source).toContain("href: '/'");
    expect(source).toContain("href: '/touch-grass'");
    expect(source).toContain("href: '/downloads/tiltcheck-extension.zip'");
    expect(source).toContain('DISCORD_INVITE_URL');
    expect(source).not.toContain("href: '/site-map'");
    expect(source).not.toContain("href: '/casinos'");
    expect(source).not.toContain("href: '/bonuses'");
    expect(source).not.toContain('discord.gg/gdBsEJfCar');
  });
});
