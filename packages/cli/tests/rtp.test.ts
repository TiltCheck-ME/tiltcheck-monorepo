/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

import { describe, expect, it } from 'vitest';
import {
  buildOperatorRtpReport,
  calculateBleedIncrease,
  formatOperatorRtpText,
} from '../src/commands/rtp.js';
import { loadCasinos, loadMasterRtp } from '../src/lib/data-loader.js';

describe('RTP & Downgrade Inspection (rtp command)', () => {
  const casinos = loadCasinos();
  const master = loadMasterRtp();
  const providers = master?.providers ?? [];

  it('calculates mathematical bankroll bleed increase correctly', () => {
    // 96.5% RTP = 3.5% edge. 94.5% RTP = 5.5% edge. Increase = (5.5 - 3.5) / 3.5 = +57.14% -> 57%
    expect(calculateBleedIncrease(96.5, 94.5)).toBe(57);
    // 96.5% RTP = 3.5% edge. 92.0% RTP = 8.0% edge. Increase = (8.0 - 3.5) / 3.5 = +128.57% -> 129%
    expect(calculateBleedIncrease(96.5, 92.0)).toBe(129);
    // 96.5% RTP = 3.5% edge. 91.2% RTP = 8.8% edge. Increase = (8.8 - 3.5) / 3.5 = +151.42% -> 151%
    expect(calculateBleedIncrease(96.5, 91.2)).toBe(151);
    expect(calculateBleedIncrease(96.0, 96.0)).toBe(0);
  });

  it('builds comprehensive RTP report for audited crypto casino (Roobet)', () => {
    const report = buildOperatorRtpReport('Roobet', casinos, providers);

    expect(report.matchedName).toBe('Roobet');
    expect(report.category).toBe('Crypto');
    expect(report.audited).toBe(true);
    expect(report.rtpSummary).toContain('Originals');
    expect(report.rtpOriginals).toContain('Roobet Originals');
    expect(report.rtpSlots).toContain('Pragmatic Play');
    expect(report.downgradeWarnings.length).toBeGreaterThan(0);
    expect(report.downgradeWarnings.some((w) => w.includes('DOWNGRADE MATH'))).toBe(true);
  });

  it('builds comprehensive RTP report for sweeps casino (Stake.us)', () => {
    const report = buildOperatorRtpReport('stake.us', casinos, providers);

    expect(report.matchedName).toBe('Stake.us');
    expect(report.category).toBe('Sweeps');
    expect(report.audited).toBe(true);
    expect(report.rtpSummary).toContain('99.00% RTP');
  });

  it('surfaces unverified RTP warning for non-audited operator', () => {
    const report = buildOperatorRtpReport('Chumba Casino', casinos, providers);

    expect(report.matchedName).toBe('Chumba Casino');
    expect(report.audited).toBe(false);
    expect(report.downgradeWarnings.some((w) => w.includes('WARNING: This operator has not undergone independent'))).toBe(true);
  });

  it('throws descriptive error when operator query is empty or whitespace', () => {
    expect(() => buildOperatorRtpReport('', casinos, providers)).toThrow('Operator query is required.');
    expect(() => buildOperatorRtpReport('   ', casinos, providers)).toThrow('Operator query is required.');
  });

  it('throws descriptive error when operator is not in dataset', () => {
    expect(() => buildOperatorRtpReport('definitely-fake-casino-xyz-999', casinos, providers)).toThrow(
      'not found in casino dataset'
    );
  });

  it('formats terminal text cleanly with zero emojis and proper harm reduction', () => {
    const report = buildOperatorRtpReport('Stake.us', casinos, providers);
    const text = formatOperatorRtpText(report);

    // Brand Law: Zero emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(text)).toBe(false);

    expect(text).toContain('TILTCHECK RTP & DOWNGRADE INSPECTION');
    expect(text).toContain('Stake.us');
    expect(text).toContain('REPORTED OPERATOR RTP:');
    expect(text).toContain('DEPLOYED DOWNGRADE RISKS:');
    expect(text).toContain('HARM REDUCTION NOTICE:');
    // Brand Law: Required footer
    expect(text).toContain('Made for Degens. By Degens.');
  });
});
