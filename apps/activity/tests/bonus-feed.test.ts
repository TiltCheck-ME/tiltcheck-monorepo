// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18
/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionState } from '../src/state/SessionState.js';
import { BonusFeedView } from '../src/views/BonusFeedView.js';

describe('bonus tracker utility surface', () => {
  let container: HTMLElement;
  let state: SessionState;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="bonus-root"></div>';
    container = document.getElementById('bonus-root') as HTMLElement;
    state = new SessionState();
    state.setIdentity('user-1', 'DEGEN');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders a branded fallback when no bonus feeds resolve', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline');
    }));

    await new BonusFeedView(container, state, state.userId).mount();

    expect(container.textContent).toContain('Tracker fallback');
    expect(container.textContent).toContain('No live bonus timers are wired into this room yet');
    expect(container.textContent).toContain('Placeholder');
  });

  it('renders live timer status and trust labels when session bonus data exists', async () => {
    state.setBonusFeed([
      {
        id: 'bonus-1',
        casinoName: 'Stake',
        description: 'Daily reload',
        nextClaimAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        is_expired: false,
        is_verified: true,
      },
    ]);

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    })));

    await new BonusFeedView(container, state, state.userId).mount();

    expect(container.textContent).toContain('Stake');
    expect(container.textContent).toContain('Cooling down');
    expect(container.textContent).toContain('Live tracker');
    expect(container.textContent).toContain('Verified feed');
    expect(container.textContent).toContain('Cooldown live');
    expect(container.textContent).toContain('Safety hooks');
    expect(container.textContent).toContain('Cooldown discipline beats spam claims');
  });
});
