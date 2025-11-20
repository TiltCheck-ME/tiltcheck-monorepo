import { describe, it, expect, beforeEach } from 'vitest';
import '../src/index'; // initialize subscriptions directly
import { eventRouter } from '@tiltcheck/event-router';
import { flushTrustRollups, TRUST_ROLLUP_SNAPSHOT_PATH } from '../src/index';
import fs from 'fs';

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

  it('aggregates events and publishes rollup on flush', async () => {
    await publishDomain('example.com', -10);
    await publishDomain('example.com', -5);
    await publishCasino('stake.com', +8);
    flushTrustRollups();
    const rollups = eventRouter.getHistory({ eventType: 'trust.domain.rollup' });
    expect(rollups.length).toBe(1);
    const domainPayload: any = rollups[0].data;
    expect(domainPayload.domains['example.com'].totalDelta).toBe(-15);
    const casinoRollups = eventRouter.getHistory({ eventType: 'trust.casino.rollup' });
    expect(casinoRollups.length).toBe(1);
    const casinoPayload: any = casinoRollups[0].data;
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
