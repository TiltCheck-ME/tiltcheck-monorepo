// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(dir, 'page.tsx'), 'utf8');

describe('getting-started source', () => {
  it('points the toasts card at /nudges, not crisis Help', () => {
    expect(source).toContain("href: '/nudges'");
    expect(source).toContain('The nudges');
    expect(source).not.toContain('Crisis resources');
    expect(source).not.toContain('Touch Grass games hub');
  });
});
