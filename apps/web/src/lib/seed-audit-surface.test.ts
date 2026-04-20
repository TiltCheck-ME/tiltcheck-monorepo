/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */

import { auditSeedHealth } from '@tiltcheck/shared';
import { FairnessService } from '@tiltcheck/shared/fairness';
import { describe, expect, it } from 'vitest';
import {
  extractSeedAuditSupportMetadata,
  getCasinoSeedAuditSurface,
  summarizeSeedAuditResult,
} from './seed-audit-surface';

const fairness = new FairnessService();

const LEGACY_ALGORITHM = {
  algorithmId: 'generic-server-seed-client-seed-nonce-hmac-sha256',
  name: 'Generic Server Seed + Client Seed + Nonce',
  hashFamily: 'hmac-sha256',
  formulaVariant: 'server-seed-client-seed-nonce',
} as const;

async function sha256Hex(value: string): Promise<string> {
  const encoded = Uint8Array.from(new TextEncoder().encode(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

describe('seed audit surface helpers', () => {
  it('marks empty trust-surface session audits as unavailable reference-only reads', async () => {
    const surface = await getCasinoSeedAuditSurface({
      slug: 'demo-casino',
      name: 'Demo Casino',
      category: 'Crypto',
      monitoredDomain: 'demo.example',
    });

    expect(surface.summary.statusTone).toBe('unavailable');
    expect(surface.summary.sampleSummary).toContain('No ordered session export');
    expect(surface.summary.continuitySummary).toContain('unavailable');
    expect(surface.support.referenceOnly).toBe(true);
    expect(surface.support.supported).toBe(true);
  });

  it('keeps single-bet audits in warning state because one receipt is not a session read', async () => {
    const serverSeed = 'helper-server-seed';
    const clientSeed = 'helper-client-seed';
    const nonce = 4;
    const reportedHash = await fairness.verifyCasinoResult(serverSeed, clientSeed, nonce);

    const result = await auditSeedHealth({
      scope: 'single-bet',
      algorithm: LEGACY_ALGORITHM,
      context: {
        source: 'web',
      },
      record: {
        recordId: 'bet-1',
        serverSeed,
        serverSeedHash: await sha256Hex(serverSeed),
        clientSeed,
        nonce,
        reportedHash,
      },
    });

    const summary = summarizeSeedAuditResult(result);
    const support = extractSeedAuditSupportMetadata(result);

    expect(summary.statusTone).toBe('warning');
    expect(summary.formulaSummary).toContain('1/1');
    expect(summary.continuitySummary).toContain('One sample');
    expect(support.referenceOnly).toBe(false);
    expect(support.supported).toBe(true);
  });
});
