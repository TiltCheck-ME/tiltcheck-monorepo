import { describe, it, expect } from 'vitest';
import { eventRouter } from '@tiltcheck/event-router';
import { CollectClockService } from '../../collectclock/src/index.js';
import '../src'; // ensure TrustEngines subscriptions active

describe('Integration: CollectClock → TrustEngines', () => {
  it('nerf triggers unified trust updates from both sources', async () => {
    eventRouter.clearHistory();
    const cc = new CollectClockService({ nerfThresholdPercent: 0.10 });
    cc.registerCasino('CasinoInt', 10);
    cc.updateBonus('CasinoInt', 7); // 30% drop => severity 3

    // Allow any async subscribers (if future) to process
    await new Promise(r => setTimeout(r, 0));

    const nerfEvents = eventRouter.getHistory({ eventType: 'bonus.nerf.detected' });
    expect(nerfEvents.length).toBe(1);
    expect(nerfEvents[0].data.percentDrop).toBeGreaterThanOrEqual(0.30);

    const trustEvents = eventRouter.getHistory({ eventType: 'trust.casino.updated' });
    // Expect at least one from collectclock (severity only) and one from trust-engine-casino (score update)
    const fromCollectClock = trustEvents.find((e: any) => e.data.source === 'collectclock');
    const fromTrustEngine = trustEvents.find((e: any) => e.data.source === 'trust-engine-casino');
    expect(fromCollectClock).toBeDefined();
    expect(fromTrustEngine).toBeDefined();
    expect(fromCollectClock?.data.severity).toBe(3);
    // Expect previousScore to be at or near 75 (may vary if other tests modified state)
    expect(fromTrustEngine?.data.previousScore).toBeGreaterThanOrEqual(70);
    expect(fromTrustEngine?.data.previousScore).toBeLessThanOrEqual(75);
    // Score should decrease (negative delta)
    expect(fromTrustEngine?.data.delta).toBeLessThan(0);
    // New score should be lower than previous
    expect(fromTrustEngine?.data.newScore).toBeLessThan(fromTrustEngine?.data.previousScore);
  });
});
