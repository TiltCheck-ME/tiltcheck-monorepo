/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  findCasinos,
  findMonorepoRoot,
  findPackageRoot,
  loadCasinos,
  loadMasterRtp,
  normalizeOperatorName,
} from '../src/lib/data-loader.js';

describe('Data Loader Utilities', () => {
  it('finds monorepo root containing pnpm-workspace.yaml', () => {
    const root = findMonorepoRoot();
    expect(fs.existsSync(path.join(root, 'pnpm-workspace.yaml'))).toBe(true);
  });

  it('reliably finds monorepo root even when startDir is in an external temp directory', () => {
    const tempDir = os.tmpdir();
    const resolvedRoot = findMonorepoRoot(tempDir);
    expect(fs.existsSync(path.join(resolvedRoot, 'pnpm-workspace.yaml'))).toBe(true);
  });

  it('locates CLI package root containing package.json with @tiltcheck/cli', () => {
    const pkgRoot = findPackageRoot();
    const pkgJsonPath = path.join(pkgRoot, 'package.json');
    expect(fs.existsSync(pkgJsonPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    expect(content.name).toBe('@tiltcheck/cli');
  });

  it('loads real casinos dataset from apps/web/src/data/casinos.json or package fallback', () => {
    const casinos = loadCasinos();
    expect(casinos.length).toBeGreaterThan(50);

    const stake = casinos.find((c) => c.name === 'Stake.us');
    expect(stake).toBeDefined();
    expect(stake?.category).toBe('Sweeps');
    expect(stake?.audited).toBe(true);
  });

  it('loads master certified RTP dataset from data/provider-master-rtp.json', () => {
    const master = loadMasterRtp();
    expect(master).not.toBeNull();
    expect(master?.providers.length).toBeGreaterThanOrEqual(3);

    const pragmatic = master?.providers.find((p) => p.providerName === 'Pragmatic Play');
    expect(pragmatic).toBeDefined();
    expect(pragmatic?.games.length).toBeGreaterThan(0);
  });

  it('normalizes operator strings consistently with @tiltcheck/shared', () => {
    expect(normalizeOperatorName('Stake.us')).toBe('stakeus');
    expect(normalizeOperatorName('BC.Game')).toBe('bcgame');
    expect(normalizeOperatorName('LuckyLand Slots!')).toBe('luckylandslots');
  });

  it('finds exact and partial casino matches, and rejects empty query strings', () => {
    const sample = [
      { name: 'Stake.us', grade: 'B-', risk: 'Medium', category: 'Sweeps' },
      { name: 'Stake.com', grade: 'B-', risk: 'Medium', category: 'Crypto' },
      { name: 'Roobet', grade: 'B', risk: 'Medium', category: 'Crypto' },
    ];

    const exactMatch = findCasinos(sample, 'Stake.us');
    expect(exactMatch.exact?.name).toBe('Stake.us');

    const multiMatch = findCasinos(sample, 'stake');
    expect(multiMatch.matches).toHaveLength(2);

    const emptyMatch = findCasinos(sample, 'unknown');
    expect(emptyMatch.matches).toHaveLength(0);
    expect(emptyMatch.exact).toBeNull();

    // Critical edge case: empty or whitespace query must NEVER match all entries
    const blankMatch = findCasinos(sample, '');
    expect(blankMatch.matches).toHaveLength(0);
    expect(blankMatch.exact).toBeNull();

    const whitespaceMatch = findCasinos(sample, '   ');
    expect(whitespaceMatch.matches).toHaveLength(0);
    expect(whitespaceMatch.exact).toBeNull();
  });
});
