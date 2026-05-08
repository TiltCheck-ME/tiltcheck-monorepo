/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { MOBILE_LICENSE_HUD_ID, updateMobileLicenseHud } from '../../src/mobile-license-hud.js';
import type { CasinoVerification } from '../../src/license-verifier.js';

function buildVerification(overrides: Partial<CasinoVerification> = {}): CasinoVerification {
  return {
    isLegitimate: true,
    licenseInfo: {
      found: true,
      issuingAuthority: 'Malta Gaming Authority',
      jurisdiction: 'Malta',
      licenseNumber: 'MGA/B2C/1234',
      location: 'footer',
      verified: true,
      warnings: [],
    },
    verdict: 'legitimate',
    shouldAnalyze: true,
    ...overrides,
  };
}

describe('mobile license HUD', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('renders a mobile-only pending status before the scan finishes', () => {
    const hud = updateMobileLicenseHud(null);

    expect(hud?.id).toBe(MOBILE_LICENSE_HUD_ID);
    expect(hud?.dataset.status).toBe('pending');
    expect(hud?.textContent).toBe('License: scanning current site... | Made for Degens. By Degens.');
    expect(hud?.getAttribute('role')).toBe('status');
    expect(document.head.textContent).toContain('@media (max-width: 768px), (pointer: coarse)');
  });

  it('updates the HUD with verified license details from the DOM scan result', () => {
    const hud = updateMobileLicenseHud(buildVerification());

    expect(hud?.dataset.status).toBe('verified');
    expect(hud?.textContent).toContain('License verified: Malta Gaming Authority');
    expect(hud?.textContent).toContain('MGA/B2C/1234');
    expect(hud?.textContent).toContain('Made for Degens. By Degens.');
    expect(hud?.style.color).toBe('rgb(209, 250, 229)');
  });

  it('surfaces warning state when a license is found but not fully verified', () => {
    const hud = updateMobileLicenseHud(buildVerification({
      isLegitimate: false,
      licenseInfo: {
        found: true,
        issuingAuthority: 'Unknown authority',
        jurisdiction: 'Unknown',
        verified: false,
        warnings: [],
      },
      verdict: 'unknown',
      shouldAnalyze: true,
      warningMessage: 'License found but could not be verified automatically. Proceeding with caution.',
    }));

    expect(hud?.dataset.status).toBe('warning');
    expect(hud?.textContent).toContain('License found but could not be verified automatically.');
    expect(hud?.textContent).toContain('Made for Degens. By Degens.');
    expect(hud?.style.color).toBe('rgb(254, 243, 199)');
  });

  it('surfaces risk state when verification gates analysis', () => {
    const hud = updateMobileLicenseHud(buildVerification({
      isLegitimate: false,
      licenseInfo: {
        found: false,
        verified: false,
        warnings: [],
      },
      verdict: 'unlicensed',
      shouldAnalyze: false,
      warningMessage: 'No valid gambling license found yet. Normal TiltCheck analysis is disabled on this site.',
    }));

    expect(hud?.dataset.status).toBe('risk');
    expect(hud?.textContent).toBe('No valid gambling license found yet. Normal TiltCheck analysis is disabled on this site. | Made for Degens. By Degens.');
    expect(hud?.style.color).toBe('rgb(254, 226, 226)');
  });
});
