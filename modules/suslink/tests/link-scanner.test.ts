/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect } from 'vitest';
import { LinkScanner } from '../src/scanner.js';

describe('LinkScanner', () => {
  const scanner = new LinkScanner();

  it('returns safe for benign URL (quickCheck)', () => {
    const risk = scanner.quickCheck('https://example.com');
    expect(risk).toBe('safe');
  });

  it('flags invalid URL as critical (quickCheck)', () => {
    const risk = scanner.quickCheck('not-a-url');
    expect(risk).toBe('critical');
  });

  it('detects risky TLDs (scan)', async () => {
    const res = await scanner.scan('https://totally-legit.xyz/free-money');
    expect(['suspicious', 'high', 'critical']).toContain(res.riskLevel);
    expect(res.reason.length).toBeGreaterThan(0);
  });
});
