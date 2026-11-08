// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Provably Fair Bet Verifier Page (apps/web/src/app/tools/verify/page.tsx)', () => {
  const filePath = path.resolve(__dirname, 'page.tsx');
  const sourceCode = fs.readFileSync(filePath, 'utf-8');

  it('declares use client directive and exports VerifyPage default', () => {
    expect(sourceCode).toMatch(/(?:^|\n)"use client";/);
    expect(sourceCode).toContain('export default function VerifyPage()');
  });

  it('includes both Casino Standard and TiltCheck 4-Key operational modes', () => {
    expect(sourceCode).toContain('Casino Standard (Stake / Roobet)');
    expect(sourceCode).toContain('TiltCheck 4-Key (Solana)');
  });

  it('features sample audit presets and pre-commitment hash verification', () => {
    expect(sourceCode).toContain('PROVABLY_FAIR_PRESETS');
    expect(sourceCode).toContain('Instant Sample Audit Presets:');
    expect(sourceCode).toContain('Committed Server Seed Hash');
    expect(sourceCode).toContain('PRE-COMMITMENT MATCH: VERIFIED UNALTERED');
    expect(sourceCode).toContain('TAMPER ALERT: HASH MISMATCH');
  });

  it('features multi-game derived outcome panels', () => {
    expect(sourceCode).toContain('Dice (0.00-100)');
    expect(sourceCode).toContain('Limbo / Crash');
    expect(sourceCode).toContain('Roulette Pocket');
    expect(sourceCode).toContain('Plinko (12 Rows)');
    expect(sourceCode).toContain('Mines (3 Mines in 25 Tiles)');
    expect(sourceCode).toContain('5x5 Mines Tile Layout');
  });

  it('includes educational guide on the 4-step provably fair security guarantee', () => {
    expect(sourceCode).toContain('The 4-Step Provably Fair Security Guarantee');
    expect(sourceCode).toContain('01. Pre-Commitment');
    expect(sourceCode).toContain('02. Player Entropy');
    expect(sourceCode).toContain('03. Deterministic Nonce');
    expect(sourceCode).toContain('04. Post-Session Reveal');
  });

  it('contains zero emojis across the file to uphold TiltCheck brand laws', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(sourceCode)).toBe(false);
  });
});
