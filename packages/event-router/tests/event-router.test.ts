/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect } from 'vitest';
import { eventRouter } from '../src/index.js';

describe('EventRouter', () => {
  it('publishes and records events', async () => {
    const events: any[] = [];
    const unsubscribe = eventRouter.subscribe('tip.completed', (e: any) => {
      events.push(e);
    }, 'tiltcheck');

    await eventRouter.publish('tip.completed', 'tiltcheck', { amount: 1, token: 'SOL' }, 'user-1');

    // Allow async handlers to run
    await new Promise((r) => setTimeout(r, 0));

    expect(events.length).toBe(1);
    const history = eventRouter.getHistory({ eventType: 'tip.completed' });
    expect(history.length).toBeGreaterThan(0);

    unsubscribe();
  });
});
