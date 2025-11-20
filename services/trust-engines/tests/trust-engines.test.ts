import { describe, it, expect } from 'vitest';
import { TrustEnginesService } from '../src/index';
import { eventRouter } from '@tiltcheck/event-router';
import '../src'; // ensure service subscriptions are registered

describe('TrustEnginesService', () => {
  it('adjusts casino trust on link.flagged', async () => {
    // Use custom starting score & severity scale
    const custom = new TrustEnginesService({ startingCasinoScore: 80, severityScale: [1,2,3,4,5] });
    // subscribe manually (autoSubscribe false by default? ensure events active)
    // Already autoSubscribe enabled by default config; instance used solely for score retrieval.
    // critical link on example.com
    await eventRouter.publish('link.flagged', 'suslink', {
      url: 'https://example.com/free-money',
      riskLevel: 'critical',
      reason: 'test',
    }, 'user-x');

    await new Promise(r => setTimeout(r, 0));
    const updates = eventRouter.getHistory({ eventType: 'trust.casino.updated' });
    expect(updates.length).toBeGreaterThan(0);
    const last = updates[updates.length - 1];
    expect(last.data.casinoName).toBe('example.com');
    expect(last.data.newScore).toBeLessThanOrEqual(75); // from default 75 penalized
    expect(last.data.delta).toBeLessThanOrEqual(0); // penalty produces negative delta
    expect(typeof last.data.delta).toBe('number');
  });

  it('publishes degen trust updates on tip.completed', async () => {
    await eventRouter.publish('tip.completed', 'justthetip', {
      fromUserId: 'alice',
      toUserId: 'bob',
      amount: 150,
    }, 'alice');

    await new Promise(r => setTimeout(r, 0));
    const updates = eventRouter.getHistory({ eventType: 'trust.degen.updated' });
    // expect at least two updates (from and to)
    expect(updates.length).toBeGreaterThanOrEqual(2);
    const lastTwo = updates.slice(-2);
    const users = lastTwo.map(u => u.data.userId).sort();
    expect(users).toEqual(['alice', 'bob']);
  });
});
