/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../scripts/guard-no-autoclaimer.mjs', import.meta.url));
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function run(root: string) {
  return spawnSync(process.execPath, [script], {
    env: { ...process.env, TILTCHECK_GUARD_ROOT: root },
    encoding: 'utf8',
  });
}

describe('guard-no-autoclaimer', () => {
  it('exits 0 on the current tree', () => {
    const result = run(repoRoot);
    expect(result.status).toBe(0);
  });

  it('exits 1 when a fixture apps/autoclaimer.ts exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'no-autoclaimer-'));
    mkdirSync(join(dir, 'apps', 'fake'), { recursive: true });
    mkdirSync(join(dir, 'packages'), { recursive: true });
    writeFileSync(join(dir, 'apps', 'fake', 'autoclaimer.ts'), 'export const x = 1;\n');
    try {
      const result = run(dir);
      expect(result.status).toBe(1);
      expect(String(result.stderr) + String(result.stdout)).toContain(
        'AutoClaimer is out of scope for the player build. Do not ship it.',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
