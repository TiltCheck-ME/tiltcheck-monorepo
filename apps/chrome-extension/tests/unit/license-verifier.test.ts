/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */
/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { CasinoLicenseVerifier, buildLicensePresentation } from '../../src/license-verifier.js';

describe('CasinoLicenseVerifier', () => {
  it('adds source and last-verified metadata to page scans', () => {
    document.body.innerHTML = `
      <footer>
        Licensed by Malta Gaming Authority under MGA/B2C/1234.
      </footer>
    `;

    const verifier = new CasinoLicenseVerifier();
    const result = verifier.verifyCasino(document);

    expect(result.verdict).toBe('legitimate');
    expect(result.licenseInfo.source).toBe('Current page footer scan');
    expect(Date.parse(result.licenseInfo.lastVerifiedAt)).not.toBeNaN();

    const presentation = buildLicensePresentation(result);
    expect(presentation.tone).toBe('verified');
    expect(presentation.details).toContain('Source: Current page footer scan');
    expect(presentation.details.join(' ')).toContain('Not legal advice');
  });

  it('surfaces stale warnings for old verification timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'));

    const presentation = buildLicensePresentation({
      isLegitimate: true,
      licenseInfo: {
        found: true,
        issuingAuthority: 'Malta Gaming Authority',
        jurisdiction: 'Malta',
        licenseNumber: 'MGA/B2C/1234',
        location: 'footer',
        verified: true,
        source: 'Current page footer scan',
        lastVerifiedAt: '2026-04-01T00:00:00.000Z',
        warnings: [],
      },
      verdict: 'legitimate',
      shouldAnalyze: true,
    });

    expect(presentation.details).toContain('Stale warning: license scan is older than 7 days.');

    vi.useRealTimers();
  });
});
