/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */
import { describe, expect, it } from 'vitest';
import { LOUNGE_PLAN_FLAGS, planEnabled } from '../src/lounge/plans.js';

describe('lounge plan stubs', () => {
  it('keeps free on and billing plans off', () => {
    expect(planEnabled('free')).toBe(true);
    expect(planEnabled('pro')).toBe(false);
    expect(planEnabled('streamer')).toBe(false);
    expect(LOUNGE_PLAN_FLAGS.pro.includes.join(' ')).toMatch(/CSV/);
    expect(LOUNGE_PLAN_FLAGS.streamer.includes.join(' ')).toMatch(/trivia hosting/);
  });
});
