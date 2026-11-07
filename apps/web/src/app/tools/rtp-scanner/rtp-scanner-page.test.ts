/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */

import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('Slot RTP Scanner page', () => {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(path.join(dir, 'page.tsx'), 'utf8');

  it('renders Live Slot RTP Downgrade Scanner with forensic simulator', () => {
    expect(source).toContain('Live Slot RTP Downgrade Scanner');
    expect(source).toContain('RTP Forensics & Downgrade Scanner');
    expect(source).toContain('The Hidden Casino');
    expect(source).toContain('Greed Tax');
    expect(source).toContain('simulateSessionLoss');
    expect(source).toContain('buildBleedComparisons');
  });

  it('includes in-game check verification guides for top providers', () => {
    expect(source).toContain('Pragmatic Play');
    expect(source).toContain('Hacksaw Gaming');
    expect(source).toContain('NoLimit City');
    expect(source).toContain("Play'n GO");
    expect(source).toContain('How to verify live RTP inside');
  });

  it('strictly adheres to zero-emoji policy', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(source).not.toMatch(emojiRegex);
  });
});
