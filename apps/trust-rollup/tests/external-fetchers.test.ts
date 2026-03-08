import { describe, expect, it } from 'vitest';
import { calculateTrustDeltas, fetchCasinoExternalData } from '../src/external-fetchers.js';

describe('trust-rollup external fetchers', () => {
  it('returns unavailable dataSource when optional providers are absent', async () => {
    const result = await fetchCasinoExternalData('stake.com');
    expect(result.casinoName).toBe('stake.com');
    expect(result.dataSource).toBe('unavailable');
    expect(result.rtpData).toBeUndefined();
    expect(result.payoutData).toBeUndefined();
    expect(result.bonusData).toBeUndefined();
    expect(result.complianceData).toBeUndefined();
  });

  it('calculates negative compliance/fairness deltas for unlicensed poor reputation', () => {
    const deltas = calculateTrustDeltas({
      casinoName: 'example-casino',
      dataSource: 'api',
      fetchedAt: Date.now(),
      complianceData: {
        licensed: false,
        kycRequired: false,
        reputation: 'poor',
        source: 'test',
      },
    });

    expect(deltas.compliance).toBeLessThan(0);
    expect(deltas.fairness).toBeLessThan(0);
    expect(deltas.supportQuality).toBeLessThan(0);
  });
});
