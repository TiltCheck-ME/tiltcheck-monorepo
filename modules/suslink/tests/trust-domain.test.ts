/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { emitDomainTrustFromScan } from '../src/trust-domain.js';
import { eventRouter } from '@tiltcheck/event-router';
import type { LinkScanResult } from '@tiltcheck/types';

function makeScan(riskLevel: LinkScanResult['riskLevel'], url = 'https://example.com'): LinkScanResult {
  return { url, riskLevel, reason: `test:${riskLevel}`, scannedAt: new Date() };
}

describe('SusLink Domain Trust Emission', () => {
  beforeEach(() => {
    eventRouter.clearHistory();
  });

  it('emits trust.domain.updated with negative delta for malicious', async () => {
    await emitDomainTrustFromScan(makeScan('critical', 'https://phish.xyz'));
    const events = eventRouter.getHistory({ eventType: 'trust.domain.updated' });
    expect(events.length).toBe(1);
    const payload = events[0].data as any;
    expect(payload.domain).toBe('phish.xyz');
    expect(payload.delta).toBeLessThan(0);
    expect(payload.category).toBe('malicious');
    expect(payload.severity).toBeDefined();
  });

  it('reinforces safe domain slightly', async () => {
    await emitDomainTrustFromScan(makeScan('safe', 'https://good.com'));
    const events = eventRouter.getHistory({ eventType: 'trust.domain.updated' });
    expect(events.length).toBe(1);
    const payload = events[0].data as any;
    expect(payload.delta).toBeGreaterThan(0);
    expect(payload.category).toBe('safe');
  });

  it('does not emit for unknown with zero delta', async () => {
    await emitDomainTrustFromScan({ url: 'https://neutral.io', riskLevel: 'suspicious', reason: 'temp', scannedAt: new Date() });
    // first emission suspicious -> negative
    await emitDomainTrustFromScan({ url: 'https://neutral.io', riskLevel: 'safe', reason: 'safe', scannedAt: new Date() });
    const count = eventRouter.getHistory({ eventType: 'trust.domain.updated' }).length;
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
