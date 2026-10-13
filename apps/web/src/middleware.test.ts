// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('middleware source', () => {
  const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'middleware.ts'), 'utf8');

  it('calls the route gate and redirects with 307', () => {
    expect(source).toContain('decidePublicRoute');
    expect(source).toContain('307');
    expect(source).not.toContain('308');
    expect(source).not.toContain('permanent: true');
  });
});
