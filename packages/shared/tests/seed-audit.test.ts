// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19

import { describe, expect, it } from 'vitest';
import type { SeedAuditAlgorithmReference } from '@tiltcheck/types';
import { FairnessService } from '../src/fairness.js';
import { SeedHealthAuditor } from '../src/seed-audit.js';

const fairness = new FairnessService();
const auditor = new SeedHealthAuditor();

const LEGACY_ALGORITHM: SeedAuditAlgorithmReference = {
  algorithmId: 'generic-server-seed-client-seed-nonce-hmac-sha256',
  name: 'Generic Server Seed + Client Seed + Nonce',
  hashFamily: 'hmac-sha256',
  formulaVariant: 'server-seed-client-seed-nonce',
};

async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

describe('SeedHealthAuditor', () => {
  it('verifies a supported single-bet happy path', async () => {
    const serverSeed = 'server-seed-alpha';
    const clientSeed = 'client-seed-alpha';
    const nonce = 7;
    const reportedHash = await fairness.verifyCasinoResult(serverSeed, clientSeed, nonce);
    const serverSeedHash = await sha256Hex(serverSeed);

    const result = await auditor.auditSingleBet({
      scope: 'single-bet',
      algorithm: LEGACY_ALGORITHM,
      record: {
        recordId: 'bet-1',
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        reportedHash,
      },
    });

    expect(result.category).toBe('verified');
    expect(result.formulaVerification.category).toBe('verified');
    expect(result.formulaVerification.matchedRecords).toBe(1);
    expect(result.recordResult.category).toBe('verified');
    expect(result.recordResult.evidence.map((item) => item.code)).toContain('reported-hash-match');
    expect(result.recordResult.evidence.map((item) => item.code)).toContain('commitment-match');
  });

  it('flags repeated revealed server seeds as suspicious reuse evidence', async () => {
    const serverSeed = 'server-seed-reused';
    const clientSeed = 'client-seed-bravo';
    const serverSeedHash = await sha256Hex(serverSeed);

    const firstHash = await fairness.verifyCasinoResult(serverSeed, clientSeed, 0);
    const secondHash = await fairness.verifyCasinoResult(serverSeed, clientSeed, 1);

    const result = await auditor.auditSessionExport({
      scope: 'session-export',
      algorithm: LEGACY_ALGORITHM,
      export: {
        formatId: 'test-export',
      },
      records: [
        {
          recordId: 'bet-1',
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce: 0,
          reportedHash: firstHash,
        },
        {
          recordId: 'bet-2',
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce: 1,
          reportedHash: secondHash,
        },
        {
          recordId: 'bet-3',
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce: 2,
          reportedHash: await fairness.verifyCasinoResult(serverSeed, clientSeed, 2),
        },
      ],
    });

    expect(result.category).toBe('suspicious');
    expect(result.hygieneFindings.some((finding) => finding.code === 'seed-reuse')).toBe(true);
  });

  it('detects nonce resets inside the same seed group', async () => {
    const serverSeed = 'server-seed-nonce-reset';
    const clientSeed = 'client-seed-charlie';
    const serverSeedHash = await sha256Hex(serverSeed);

    const result = await auditor.auditSessionExport({
      scope: 'session-export',
      algorithm: LEGACY_ALGORITHM,
      export: {
        formatId: 'test-export',
      },
      records: [
        {
          recordId: 'bet-1',
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce: 0,
          reportedHash: await fairness.verifyCasinoResult(serverSeed, clientSeed, 0),
        },
        {
          recordId: 'bet-2',
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce: 1,
          reportedHash: await fairness.verifyCasinoResult(serverSeed, clientSeed, 1),
        },
        {
          recordId: 'bet-3',
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce: 0,
          reportedHash: await fairness.verifyCasinoResult(serverSeed, clientSeed, 0),
        },
      ],
    });

    expect(result.category).toBe('suspicious');
    expect(result.hygieneFindings.some((finding) => finding.code === 'nonce-reset')).toBe(true);
  });

  it('marks tiny but otherwise clean session exports as insufficient-sample', async () => {
    const firstServerSeed = 'server-seed-delta';
    const secondServerSeed = 'server-seed-echo';
    const clientSeed = 'client-seed-delta';

    const result = await auditor.auditSessionExport({
      scope: 'session-export',
      algorithm: LEGACY_ALGORITHM,
      export: {
        formatId: 'test-export',
      },
      records: [
        {
          recordId: 'bet-1',
          serverSeed: firstServerSeed,
          serverSeedHash: await sha256Hex(firstServerSeed),
          clientSeed,
          nonce: 0,
          reportedHash: await fairness.verifyCasinoResult(firstServerSeed, clientSeed, 0),
        },
        {
          recordId: 'bet-2',
          serverSeed: secondServerSeed,
          serverSeedHash: await sha256Hex(secondServerSeed),
          clientSeed,
          nonce: 0,
          reportedHash: await fairness.verifyCasinoResult(secondServerSeed, clientSeed, 0),
        },
      ],
    });

    expect(result.category).toBe('insufficient-sample');
    expect(result.proofQuality.category).toBe('insufficient-sample');
    expect(result.proofQuality.sample.observedSamples).toBe(2);
  });

  it('returns partial when formula inputs exist but raw comparison evidence is missing', async () => {
    const serverSeed = 'server-seed-partial';
    const clientSeed = 'client-seed-foxtrot';

    const result = await auditor.auditSingleBet({
      scope: 'single-bet',
      algorithm: LEGACY_ALGORITHM,
      record: {
        recordId: 'bet-partial',
        serverSeed,
        serverSeedHash: await sha256Hex(serverSeed),
        clientSeed,
        nonce: 3,
      },
    });

    expect(result.category).toBe('partial');
    expect(result.recordResult.category).toBe('partial');
    expect(result.hygieneFindings.some((finding) => finding.code === 'insufficient-evidence')).toBe(true);
  });
});
