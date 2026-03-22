/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { describe, it, expect } from 'vitest';
import { eventRouter } from '../src/index.js';
import type { TiltCheckEvent, TipCompletedEventData } from '@tiltcheck/types';

describe('EventRouter', () => {
  it('publishes and records events', async () => {
    const events: TiltCheckEvent<'tip.completed'>[] = [];
    const unsubscribe = eventRouter.subscribe('tip.completed', (e: TiltCheckEvent<'tip.completed'>) => {
      events.push(e);
    }, 'tiltcheck');

    await eventRouter.publish('tip.completed', 'tiltcheck', { fromUserId: 'user-A', toUserId: 'user-B', amount: 1, currency: 'SOL' }, 'user-1');

    // Allow async handlers to run
    await new Promise((r) => setTimeout(r, 0));

    expect(events.length).toBe(1);
    const history = eventRouter.getHistory({ eventType: 'tip.completed' });
    expect(history.length).toBeGreaterThan(0);

    unsubscribe();
  });
});
