// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(dir, 'page.tsx'), 'utf8');

describe('getting-started source', () => {
  it('points the Touch Grass card at the games hub, not crisis Help', () => {
    expect(source).toContain('Touch Grass games hub');
    expect(source).not.toContain('Crisis resources');
  });
});
