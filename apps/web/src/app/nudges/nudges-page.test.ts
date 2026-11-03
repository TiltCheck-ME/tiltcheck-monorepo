// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-01
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'page.tsx'),
  'utf8',
);

describe('nudges page source', () => {
  it('renders the toast catalog, not Touch Grass games', () => {
    expect(source).toContain('NUDGE_CATALOG');
    expect(source).not.toContain('NUDGE_CATALOG.also');
    expect(source).not.toContain('HOW THE BRAKES WORK');
    expect(source).not.toContain('Touch Grass');
    expect(source).not.toContain('1-800-GAMBLER');
  });
});
