import { describe, it, expect } from 'vitest';
import { eventRouter } from '../src';

describe('EventRouter edge cases', () => {
  it('filters history by type, source, and userId', async () => {
    await eventRouter.publish('tip.completed', 'tiltcheck', { a: 1 }, 'user-A');
    await eventRouter.publish('tip.failed', 'justthetip', { a: 2 }, 'user-B');
    await eventRouter.publish('tip.completed', 'tiltcheck', { a: 3 }, 'user-B');

    const byType = eventRouter.getHistory({ eventType: 'tip.completed' });
    expect(byType.every(e => e.type === 'tip.completed')).toBe(true);

    const bySource = eventRouter.getHistory({ source: 'tiltcheck' });
    expect(bySource.every(e => e.source === 'tiltcheck')).toBe(true);

    const byUser = eventRouter.getHistory({ userId: 'user-B' });
    expect(byUser.every(e => e.userId === 'user-B')).toBe(true);
  });

  it('does not crash when a handler throws', async () => {
    const errors: any[] = [];
    const good: any[] = [];

    const unsub1 = eventRouter.subscribe('game.started', () => {
      throw new Error('boom');
    }, 'tiltcheck');

    const unsub2 = eventRouter.subscribe('game.started', (e) => {
      good.push(e);
    }, 'tiltcheck');

    try {
      await eventRouter.publish('game.started', 'tiltcheck', { id: 1 }, 'user-1');
    } catch (e) {
      errors.push(e);
    }

    // publish should not throw; second handler still runs
    expect(errors.length).toBe(0);
    expect(good.length).toBe(1);

    unsub1();
    unsub2();
  });

  it('unsubscribe removes handler', async () => {
    let count = 0;
    const handler = () => { count++; };
    const unsub = eventRouter.subscribe('airdrop.completed', handler, 'tiltcheck');
    await eventRouter.publish('airdrop.completed', 'tiltcheck', {});
    unsub();
    await eventRouter.publish('airdrop.completed', 'tiltcheck', {});
    expect(count).toBe(1);
  });

  it('getStats returns subscription and history metrics', async () => {
    const before = eventRouter.getStats();
    await eventRouter.publish('survey.matched', 'tiltcheck', { ok: true });
    const after = eventRouter.getStats();
    expect(after.historySize).toBeGreaterThanOrEqual(before.historySize);
    expect(after.totalSubscriptions).toBeGreaterThanOrEqual(0);
  });
});
