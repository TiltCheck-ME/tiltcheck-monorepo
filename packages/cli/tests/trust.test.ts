/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

import { describe, expect, it } from 'vitest';
import {
  buildOperatorTrustReport,
  formatOperatorTrustText,
} from '../src/commands/trust.js';
import { loadCasinos } from '../src/lib/data-loader.js';

describe('Operator Trust Dossier (trust command)', () => {
  const casinos = loadCasinos();

  it('builds full trust report for audited crypto operator (Roobet)', () => {
    const report = buildOperatorTrustReport('Roobet', casinos);

    expect(report.matchedName).toBe('Roobet');
    expect(report.category).toBe('Crypto');
    expect(report.grade).toBe('B');
    expect(report.risk).toBe('Medium');
    expect(report.audited).toBe(true);
    expect(report.isScam).toBe(false);
    expect(report.license).toContain('Curaçao eGaming');
    expect(report.evidence.length).toBeGreaterThan(0);
    expect(report.vaultSupport).toContain('Iron Bank');
  });

  it('builds full trust report for audited sweeps operator (BC.Game)', () => {
    const report = buildOperatorTrustReport('BC.Game', casinos);

    expect(report.matchedName).toBe('BC.Game');
    expect(report.category).toBe('Crypto');
    expect(report.grade).toBe('C+');
    expect(report.audited).toBe(true);
    expect(report.playthrough).toContain('BCD');
  });

  it('flags scam casinos with critical warnings (Planet 7 Casino)', () => {
    const report = buildOperatorTrustReport('Planet 7', casinos);

    expect(report.matchedName).toBe('Planet 7 Casino');
    expect(report.category).toBe('Scam');
    expect(report.grade).toBe('F');
    expect(report.risk).toBe('Critical');
    expect(report.isScam).toBe(true);

    const text = formatOperatorTrustText(report);
    expect(text).toContain('CRITICAL SCAM WARNING:');
    expect(text).toContain('DO NOT DEPOSIT');
  });

  it('handles fuzzy and normalized operator matching (e.g. lowercase without punctuation)', () => {
    const report = buildOperatorTrustReport('stakeus', casinos);
    expect(report.matchedName).toBe('Stake.us');
  });

  it('throws descriptive error when operator query is empty or whitespace', () => {
    expect(() => buildOperatorTrustReport('', casinos)).toThrow('Operator query is required.');
    expect(() => buildOperatorTrustReport('   ', casinos)).toThrow('Operator query is required.');
  });

  it('throws descriptive error when casino is not found', () => {
    expect(() => buildOperatorTrustReport('nonexistent_casino_99999', casinos)).toThrow(
      'not found in casino dataset'
    );
  });

  it('formats terminal text cleanly with zero emojis and non-custodial notice', () => {
    const report = buildOperatorTrustReport('Roobet', casinos);
    const text = formatOperatorTrustText(report);

    // Brand Law: Zero emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(text)).toBe(false);

    expect(text).toContain('TILTCHECK OPERATOR TRUST DOSSIER');
    expect(text).toContain('LICENSING & REGULATORY JURISDICTION:');
    expect(text).toContain('BANKROLL DEFENSE CONTROLS:');
    expect(text).toContain('AUDITED EVIDENCE & RISK FACTORS:');
    expect(text).toContain('NON-CUSTODIAL NOTICE:');
    // Brand Law: Required footer
    expect(text).toContain('Made for Degens. By Degens.');
  });
});
