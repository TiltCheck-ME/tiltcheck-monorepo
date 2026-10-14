// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = path.dirname(fileURLToPath(import.meta.url));
const page = readFileSync(path.join(dir, 'page.tsx'), 'utf8');
const hub = readFileSync(
  path.resolve(dir, '../../components/touch-grass/TouchGrassHub.tsx'),
  'utf8',
);

describe('touch-grass hub source', () => {
  it('is a games hub, not crisis Help', () => {
    for (const source of [page, hub]) {
      expect(source).not.toContain('1-800-GAMBLER');
      expect(source).not.toContain('Crisis');
      expect(source).not.toContain('TOUCH GRASS PROTOCOL');
      expect(source).not.toContain('Stop Playing');
    }
    expect(hub).toContain('/touch-grass/trivia');
    expect(hub).toContain('/touch-grass/dad');
    expect(hub).toContain('/arena/trivia/status');
  });

  it('posts an origin-agnostic overlay ready ping after mount', () => {
    expect(hub).toContain("window.parent.postMessage");
    expect(hub).toContain("source: 'TILTCHECK_TOUCH_GRASS'");
    expect(hub).toContain('ready: true');
    expect(hub).not.toContain('cookie');
    expect(hub).not.toContain('balance');
  });
});
