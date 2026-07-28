/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/live-feed-data.js', () => ({
  loadDomainBlacklist: vi.fn(),
}));

vi.mock('@tiltcheck/trust-engines', () => ({
  trustEngines: {
    getCasinoBreakdown: vi.fn(),
  },
}));

import { loadDomainBlacklist } from '../../src/lib/live-feed-data.js';
import { trustEngines } from '@tiltcheck/trust-engines';
import {
  evaluateInstantRedeemCasinoGate,
  INSTANT_REDEEM_MIN_TRUST_SCORE,
} from '../../src/lib/instant-redeem-scam-gate.js';

describe('Instant Redeem scam casino gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadDomainBlacklist).mockResolvedValue({
      availability: 'available',
      domains: ['known-scam-casino.com'],
      source: 'domain_blacklist.json',
    });
    vi.mocked(trustEngines.getCasinoBreakdown).mockReturnValue({
      score: 75,
      financialPayouts: 75,
      fairnessTransparency: 75,
      promotionalHonesty: 75,
      operationalSupport: 75,
      communityReputation: 75,
      history: [],
      lastUpdated: Date.now(),
    } as any);
  });

  it('blocks blacklisted scam domains', async () => {
    const result = await evaluateInstantRedeemCasinoGate('known-scam-casino.com');
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('SCAM_DOMAIN_BLOCKED');
  });

  it('blocks deny-pattern scam domains', async () => {
    const result = await evaluateInstantRedeemCasinoGate('scam-payouts.example');
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('SCAM_DOMAIN_BLOCKED');
  });

  it('blocks critically low trust scores with history', async () => {
    vi.mocked(trustEngines.getCasinoBreakdown).mockReturnValue({
      score: INSTANT_REDEEM_MIN_TRUST_SCORE - 1,
      financialPayouts: 20,
      fairnessTransparency: 20,
      promotionalHonesty: 20,
      operationalSupport: 20,
      communityReputation: 20,
      history: [{ timestamp: Date.now(), delta: -40, reason: 'link flagged', category: 'fairnessTransparency' }],
      lastUpdated: Date.now(),
    } as any);

    const result = await evaluateInstantRedeemCasinoGate('low-trust.example');
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('TRUST_SCORE_BLOCKED');
  });

  it('allows clear casinos', async () => {
    const result = await evaluateInstantRedeemCasinoGate('acme.example');
    expect(result.allowed).toBe(true);
    expect(result.code).toBe('CASINO_CLEAR');
  });

  it('fails closed when scam blacklist is unavailable', async () => {
    vi.mocked(loadDomainBlacklist).mockResolvedValue({
      availability: 'unavailable',
      domains: [],
      source: null,
    });

    const result = await evaluateInstantRedeemCasinoGate('acme.example');
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('SCAM_BLACKLIST_UNAVAILABLE');
  });

  it('fails closed when scam blacklist load throws', async () => {
    vi.mocked(loadDomainBlacklist).mockRejectedValue(new Error('boom'));

    const result = await evaluateInstantRedeemCasinoGate('acme.example');
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('SCAM_BLACKLIST_UNAVAILABLE');
  });
});
