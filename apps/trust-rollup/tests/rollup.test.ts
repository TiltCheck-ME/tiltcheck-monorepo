/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { eventRouter } from '@tiltcheck/event-router';
import { getCasinoSnapshots, flushTrustRollups, TRUST_ROLLUP_SNAPSHOT_PATH } from '../src/index.js';
import fs from 'fs';

// Import trust-rollup module to initialize event subscriptions (side effect)
// This registers the event handlers needed for the aggregation tests
import '../src/index.js';

describe('Casino Trust Aggregator', () => {
  it('classifies risk escalation with nerf and volatility', async () => {
    // Publish a series of trust updates and a nerf
    for (let i = 0; i < 5; i++) {
      await eventRouter.publish('trust.casino.updated', 'collectclock', {
        casinoName: 'CasinoA', previousScore: 70 + i, newScore: 70 + i + 2, delta: 2, severity: 2, reason: `adj${i}`, source: 'collectclock'
      });
    }
    await eventRouter.publish('bonus.nerf.detected', 'collectclock', {
      casinoName: 'CasinoA', previousAmount: 100, newAmount: 60, delta: -40, percentDrop: 0.4, detectedAt: Date.now()
    });
    const snapshots = getCasinoSnapshots();
    const snap = snapshots.find(s => s.casinoName === 'CasinoA');
    expect(snap).toBeTruthy();
    expect(snap!.events24h).toBeGreaterThanOrEqual(6);
    expect(snap!.nerfs24h).toBe(1);
    expect(['watch','elevated','high','critical']).toContain(snap!.riskLevel); // Should not be 'low'
  });

  it('computes payoutDrift and volatilityShift metrics', async () => {
    // 20 trust events: first 10 low variance near +1, next 10 higher variance
    for (let i = 0; i < 10; i++) {
      await eventRouter.publish('trust.casino.updated', 'collectclock', {
        casinoName: 'CasinoMetrics', previousScore: 50 + i, newScore: 51 + i, delta: 1, severity: 1, reason: 'stable', source: 'collectclock'
      });
    }
    for (let i = 0; i < 10; i++) {
      const swing = i % 2 === 0 ? 8 : -6; // introduce variance shift
      await eventRouter.publish('trust.casino.updated', 'collectclock', {
        casinoName: 'CasinoMetrics', previousScore: 60 + i, newScore: 60 + i + swing, delta: swing, severity: 3, reason: 'volatile', source: 'collectclock'
      });
    }
    const snap = getCasinoSnapshots().find(s => s.casinoName === 'CasinoMetrics');
    expect(snap).toBeTruthy();
    expect(snap!.payoutDrift).toBeDefined();
    expect(snap!.payoutDrift).toBeGreaterThan(0); // directional mean should not be zero
    expect(snap!.volatilityShift).toBeDefined();
    expect(snap!.volatilityShift).toBeGreaterThan(0); // variance change detected
  });
});

function publishDomain(domain: string, delta: number) {
  return eventRouter.publish('trust.domain.updated', 'suslink', {
    domain,
    previousScore: 50,
    newScore: 50 + delta,
    delta,
    severity: Math.min(5, Math.max(1, Math.abs(delta))),
    category: delta < 0 ? 'unsafe' : 'safe',
    reason: 'test',
    source: 'suslink'
  });
}

function publishCasino(casinoName: string, delta: number) {
  return eventRouter.publish('trust.casino.updated', 'collectclock', {
    casinoName,
    previousScore: 60,
    newScore: 60 + delta,
    delta,
    severity: Math.min(5, Math.max(1, Math.abs(delta))),
    reason: 'test',
    source: 'collectclock'
  });
}

describe('Trust Rollup Service', () => {
  beforeEach(() => {
    eventRouter.clearHistory();
    if (fs.existsSync(TRUST_ROLLUP_SNAPSHOT_PATH)) fs.unlinkSync(TRUST_ROLLUP_SNAPSHOT_PATH);
  });

  it('aggregates events and publishes hourly rollup alongside real-time snapshots', async () => {
    await publishDomain('example.com', -10);
    await publishDomain('example.com', -5);
    await publishCasino('stake.com', +8);
    flushTrustRollups();
    const rollups = eventRouter.getHistory({ eventType: 'trust.domain.rollup' });
    expect(rollups.length).toBe(1);
    const domainPayload: any = rollups[0].data;
    expect(domainPayload.domains['example.com'].totalDelta).toBe(-15);
    const casinoRollups = eventRouter.getHistory({ eventType: 'trust.casino.rollup' });
    // At least one (real-time) plus one (hourly flush)
    expect(casinoRollups.length).toBeGreaterThanOrEqual(1);
    const aggregatedEvent = casinoRollups.find((evt: any) => evt.data && (evt.data as any).casinos);
    expect(aggregatedEvent).toBeTruthy();
    const casinoPayload: any = aggregatedEvent!.data;
    expect(casinoPayload.casinos['stake.com'].totalDelta).toBe(8);
  });

  it('persists snapshot file after flush', async () => {
    await publishDomain('abc.xyz', -20);
    flushTrustRollups();
    expect(fs.existsSync(TRUST_ROLLUP_SNAPSHOT_PATH)).toBe(true);
    const contents = JSON.parse(fs.readFileSync(TRUST_ROLLUP_SNAPSHOT_PATH, 'utf-8'));
    expect(contents.batches.length).toBeGreaterThan(0);
  });
});
