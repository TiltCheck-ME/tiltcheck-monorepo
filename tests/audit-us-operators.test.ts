// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04

import { describe, expect, it } from 'vitest';
import {
  US_OPERATOR_TARGETS,
  computeAuditTrust,
  checkEndpointNetwork,
  parseCliArgs,
  runUsOperatorAudit,
} from '../scripts/audit-us-operators';

describe('US Operator Audit Target Registry', () => {
  it('defines 23 canonical popular US operator targets (5 Regulated, 18 Sweeps)', () => {
    expect(US_OPERATOR_TARGETS).toHaveLength(23);

    const regulated = US_OPERATOR_TARGETS.filter((t) => t.category === 'Regulated');
    const sweeps = US_OPERATOR_TARGETS.filter((t) => t.category === 'Sweeps');

    expect(regulated).toHaveLength(5);
    expect(sweeps).toHaveLength(18);

    const regNames = regulated.map((t) => t.name);
    expect(regNames).toContain('DraftKings Casino');
    expect(regNames).toContain('FanDuel Casino');
    expect(regNames).toContain('BetMGM');
    expect(regNames).toContain('Caesars Casino');
    expect(regNames).toContain('BetRivers');

    const sweepsNames = sweeps.map((t) => t.name);
    expect(sweepsNames).toContain('Chumba Casino');
    expect(sweepsNames).toContain('Pulsz');
    expect(sweepsNames).toContain('WOW Vegas');
    expect(sweepsNames).toContain('High 5 Casino');
    expect(sweepsNames).toContain('Stake.us');
    expect(sweepsNames).toContain('McLuck');
    expect(sweepsNames).toContain('Fortune Coins');
    expect(sweepsNames).toContain('Hello Millions');
    expect(sweepsNames).toContain('Modo Casino');
    expect(sweepsNames).toContain('Crown Coins Casino');
    expect(sweepsNames).toContain('LuckyLand Slots');
    expect(sweepsNames).toContain('Global Poker');
    expect(sweepsNames).toContain('Zula Casino');
    expect(sweepsNames).toContain('Funzpoints');
    expect(sweepsNames).toContain('Funrize');
    expect(sweepsNames).toContain('Real Prize');
    expect(sweepsNames).toContain('Jackpota');
    expect(sweepsNames).toContain('NoLimitCoins');
  });

  it('validates all targets satisfy strict audit receipt and evidence standards', () => {
    for (const target of US_OPERATOR_TARGETS) {
      expect(target.slug).toBeTruthy();
      expect(target.name).toBeTruthy();
      expect(target.primaryDomain).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/i);
      expect(target.officialDomains.length).toBeGreaterThanOrEqual(1);
      expect(target.licensingBasis).toBeTruthy();

      // Banking bounds
      expect(target.banking.minHours).toBeGreaterThanOrEqual(1);
      expect(target.banking.maxHours).toBeLessThanOrEqual(72);
      expect(target.banking.minCashoutUsd).toBeGreaterThanOrEqual(10);
      expect(target.banking.claim).toBeTruthy();
      expect(target.banking.sourceUrl).toMatch(/^https?:\/\//);

      // RTP standards
      expect(target.rtpProfile.summary).toMatch(/RTP/i);
      expect(target.rtpProfile.originals).toMatch(/99\.00%|97\.00%|99\.50%|95\.50%/);
      expect(target.rtpProfile.slots).toBeTruthy();

      // Guardrails and playthrough
      expect(target.vaultSupport).toBeTruthy();
      expect(target.playthrough).toMatch(/playthrough|turnover|rollover/i);

      // Verifiable receipts
      expect(target.evidence.length).toBeGreaterThanOrEqual(4);
      for (const e of target.evidence) {
        expect(e.length).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it('enforces state gaming commission licenses for Regulated US operators', () => {
    const regulated = US_OPERATOR_TARGETS.filter((t) => t.category === 'Regulated');
    for (const r of regulated) {
      expect(r.licensingBasis).toMatch(/NJ DGE|PA PGCB|MI MGCB/);
      expect(r.endpoints.responsibleGaming).toBeTruthy();
      expect(r.evidence.some((e) => /regulat|licens|commission/i.test(e))).toBe(true);
    }
  });

  it('enforces AMOE and prize redemption parameters for Sweeps operators', () => {
    const sweeps = US_OPERATOR_TARGETS.filter((t) => t.category === 'Sweeps');
    for (const s of sweeps) {
      expect(s.licensingBasis).toMatch(/Sweepstakes model/i);
      expect(s.evidence.some((e) => /AMOE|mail-in|postal/i.test(e))).toBe(true);
      expect(s.banking.maxHours).toBeLessThanOrEqual(72);
    }
  });
});

describe('computeAuditTrust', () => {
  it('deterministically calculates Grade A for Tier-1 Regulated US operators', () => {
    const draftkings = US_OPERATOR_TARGETS.find((t) => t.slug === 'draftkings-casino')!;
    const trust = computeAuditTrust(draftkings);

    expect(trust.grade).toBe('A');
    expect(trust.score).toBeGreaterThanOrEqual(90);
    expect(trust.risk).toBe('Low');
    expect(trust.pillars.financialPayouts).toBe(100);
    expect(trust.pillars.fairnessTransparency).toBe(92);
  });

  it('deterministically calculates Grade B or B+ for compliant US Sweepstakes operators', () => {
    const pulsz = US_OPERATOR_TARGETS.find((t) => t.slug === 'pulsz')!;
    const trust = computeAuditTrust(pulsz);

    expect(['B', 'B+']).toContain(trust.grade);
    expect(trust.score).toBeGreaterThanOrEqual(75);
    expect(trust.risk).toBe('Medium');
    expect(trust.pillars.financialPayouts).toBeGreaterThanOrEqual(75);
    expect(trust.pillars.fairnessTransparency).toBeGreaterThanOrEqual(78);
  });
});

describe('checkEndpointNetwork', () => {
  it('returns valid metrics in mock/offline mode', async () => {
    const res = await checkEndpointNetwork('https://casino.draftkings.com', 5000, true);
    expect(res.reachable).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.sslValid).toBe(true);
    expect(res.latencyMs).toBeGreaterThan(0);
  });
});

describe('parseCliArgs', () => {
  it('correctly parses CLI flags', () => {
    const opts = parseCliArgs(['--check', '--write', '--mock', '--operator', 'mcluck', '--category', 'Sweeps', '--json']);
    expect(opts.check).toBe(true);
    expect(opts.write).toBe(true);
    expect(opts.mock).toBe(true);
    expect(opts.operator).toBe('mcluck');
    expect(opts.category).toBe('Sweeps');
    expect(opts.json).toBe(true);
  });
});

describe('runUsOperatorAudit', () => {
  it('executes full automated audit in mock mode and verifies all 23 targets are compliant', async () => {
    const results = await runUsOperatorAudit({ mock: true });
    expect(results).toHaveLength(23);

    for (const r of results) {
      expect(r.compliant).toBe(true);
      expect(r.trust.score).toBeGreaterThanOrEqual(70);
      expect(r.target.evidence.length).toBeGreaterThanOrEqual(4);
    }
  });
});
