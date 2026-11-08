// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('House Edge & Comp Point Scanner Page (apps/web/src/app/tools/house-edge-scanner/page.tsx)', () => {
  const filePath = path.resolve(__dirname, 'page.tsx');
  const sourceCode = fs.readFileSync(filePath, 'utf-8');

  it('declares use client directive and exports HouseEdgeScannerPage default', () => {
    expect(sourceCode).toMatch(/(?:^|\n)"use client";/);
    expect(sourceCode).toContain('export default function HouseEdgeScannerPage()');
  });

  it('includes dual operational modes for VIP comp scanning and Delta Engine forensics', () => {
    expect(sourceCode).toContain('VIP Comp Point & Churn Scanner');
    expect(sourceCode).toContain('The Delta Engine (Slot RTP Overcharge)');
  });

  it('includes casino loyalty program selection and milestone tier presets', () => {
    expect(sourceCode).toContain('CASINO_VIP_PROGRAMS');
    expect(sourceCode).toContain('GAME_HOUSE_EDGE_PRESETS');
    expect(sourceCode).toContain('Step 1: Select Casino Loyalty Program');
    expect(sourceCode).toContain('Step 2: Target Milestone Tier');
    expect(sourceCode).toContain('Step 3: Game Type & Active House Edge');
  });

  it('calculates and displays the true mathematical deficit and comp reward ratio', () => {
    expect(sourceCode).toContain('True Mathematical Deficit (Net Loss)');
    expect(sourceCode).toContain('Comp Return Ratio');
    expect(sourceCode).toContain('House Retained Share');
    expect(sourceCode).toContain('Rounds to Target');
    expect(sourceCode).toContain('Estimated Play Time');
  });

  it('includes educational dossier on the 3 truths of casino VIP clubs', () => {
    expect(sourceCode).toContain('Loyalty Forensics: The 3 Truths of Casino VIP Clubs');
    expect(sourceCode).toContain('01. The Sunk-Cost Progress Bar');
    expect(sourceCode).toContain('02. Rakeback Does Not Equal Profit');
    expect(sourceCode).toContain('03. Game Weighting Penalties');
  });

  it('upholds TiltCheck brand law with zero emojis across the file', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(sourceCode)).toBe(false);
  });
});
