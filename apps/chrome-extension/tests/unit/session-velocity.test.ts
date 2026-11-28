/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-27 */
/**
 * @vitest-environment jsdom
 * Unit tests for Session Net PnL Mini-Sparkline & Velocity Radar.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateNetPnl,
  calculateVelocityPerMin,
  determineVelocityStatus,
  generateSparklineSvg,
  canAdoptStoredSession,
  installSessionVelocityRadar,
  isCrossTabSessionOwner,
  recordBalanceSample,
  resetSessionPnl,
  SESSION_CROSS_TAB_MAX_AGE_MS,
  TILTCHECK_SESSION_PNL_KEY,
  DEFAULT_SESSION_PNL_STATE,
  type BalanceSample,
  type SessionPnlState,
} from '../../src/session-velocity.js';

describe('session-velocity calculations', () => {
  it('calculates net PnL correctly', () => {
    expect(calculateNetPnl(150, 100)).toBe(50);
    expect(calculateNetPnl(75.5, 100)).toBe(-24.5);
    expect(calculateNetPnl(100, 100)).toBe(0);
    expect(calculateNetPnl(NaN, 100)).toBe(0);
    expect(calculateNetPnl(100, Infinity)).toBe(0);
  });

  it('calculates velocity per minute over time window', () => {
    expect(calculateVelocityPerMin([])).toBe(0);
    expect(calculateVelocityPerMin([{ timestamp: 1000, balance: 100, pnl: 0 }])).toBe(0);

    const now = Date.now();
    // 60 seconds interval with $30 drop -> -$30.00/min
    const samplesLoss: BalanceSample[] = [
      { timestamp: now - 60_000, balance: 100, pnl: 0 },
      { timestamp: now, balance: 70, pnl: -30 },
    ];
    expect(calculateVelocityPerMin(samplesLoss)).toBe(-30);

    // 60 seconds interval with $15 gain -> +$15.00/min
    const samplesGain: BalanceSample[] = [
      { timestamp: now - 60_000, balance: 100, pnl: 0 },
      { timestamp: now, balance: 115, pnl: 15 },
    ];
    expect(calculateVelocityPerMin(samplesGain)).toBe(15);

    // Very short duration under 3s returns 0 to prevent noise
    const noiseSamples: BalanceSample[] = [
      { timestamp: now - 1000, balance: 100, pnl: 0 },
      { timestamp: now, balance: 95, pnl: -5 },
    ];
    expect(calculateVelocityPerMin(noiseSamples)).toBe(0);
  });

  it('determines velocity status bands correctly without emojis', () => {
    const cliff = determineVelocityStatus(-25.0, -100);
    expect(cliff.status).toBe('CLIFF-DIVE');
    expect(cliff.color).toBe('#ef4444');
    expect(cliff.reason).toContain('Severe loss acceleration');
    expect(cliff.reason).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);

    const cliffByNet = determineVelocityStatus(-12.0, -60);
    expect(cliffByNet.status).toBe('CLIFF-DIVE');

    const bleed = determineVelocityStatus(-8.0, -20);
    expect(bleed.status).toBe('BLEED');
    expect(bleed.color).toBe('#f97316');
    expect(bleed.reason).toContain('Accelerating drawdown');
    expect(bleed.reason).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);

    const drain = determineVelocityStatus(-2.5, -10);
    expect(drain.status).toBe('DRAIN');
    expect(drain.color).toBe('#fbbf24');
    expect(drain.reason).toContain('Gradual loss rate');
    expect(drain.reason).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);

    const steadyFlat = determineVelocityStatus(0, 0);
    expect(steadyFlat.status).toBe('STEADY');
    expect(steadyFlat.color).toBe('#17c3b2');

    const steadyProfit = determineVelocityStatus(5.0, 50);
    expect(steadyProfit.status).toBe('STEADY');
    expect(steadyProfit.reason).toContain('Positive momentum');
  });

  it('records samples and updates peak/lowest and rolling window', () => {
    const t0 = 1700000000000;
    let state = resetSessionPnl(100, t0);

    // First sample establishes baseline
    state = recordBalanceSample(state, 120, t0);
    expect(state.startingBalance).toBe(100);
    expect(state.currentBalance).toBe(120);
    expect(state.netPnl).toBe(20);
    expect(state.peakPnl).toBe(20);
    expect(state.lowestPnl).toBe(0);

    // Drop to 80 60s later
    state = recordBalanceSample(state, 80, t0 + 60_000);
    expect(state.currentBalance).toBe(80);
    expect(state.netPnl).toBe(-20);
    expect(state.peakPnl).toBe(20);
    expect(state.lowestPnl).toBe(-20);
    expect(state.velocityPerMin).toBe(-20);
    expect(state.status).toBe('CLIFF-DIVE');

    // Duplicate balance within 1s should be ignored
    const sampleCountBefore = state.samples.length;
    state = recordBalanceSample(state, 80, t0 + 60_500);
    expect(state.samples.length).toBe(sampleCountBefore);
  });

  it('caps history at MAX_RADAR_SAMPLES (30 items)', () => {
    let state = resetSessionPnl(100);
    let t = 1700000000000;
    for (let i = 0; i < 40; i++) {
      t += 5000;
      state = recordBalanceSample(state, 100 + (i % 5) * 10, t);
    }
    expect(state.samples.length).toBe(30);
  });
});

describe('generateSparklineSvg', () => {
  it('renders placeholder SVG when samples are insufficient', () => {
    const svg0 = generateSparklineSvg([]);
    expect(svg0).toContain('AWAITING SPIN TELEMETRY');
    expect(svg0).toContain('stroke-dasharray="3 3"');

    const svg1 = generateSparklineSvg([{ timestamp: 1000, balance: 100, pnl: 0 }]);
    expect(svg1).toContain('AWAITING SPIN TELEMETRY');
  });

  it('renders complete SVG paths and gradient for positive session', () => {
    const samples: BalanceSample[] = [
      { timestamp: 1000, balance: 100, pnl: 0 },
      { timestamp: 2000, balance: 120, pnl: 20 },
      { timestamp: 3000, balance: 150, pnl: 50 },
    ];

    const svg = generateSparklineSvg(samples, 300, 70);
    expect(svg).toContain('<svg');
    expect(svg).toContain('linearGradient');
    expect(svg).toContain('#17c3b2'); // Teal for profit
    expect(svg).toContain('<path d="M');
    expect(svg).toContain('<circle');
    expect(svg).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
  });

  it('renders red stroke and fill for negative drawdown session', () => {
    const samples: BalanceSample[] = [
      { timestamp: 1000, balance: 100, pnl: 0 },
      { timestamp: 2000, balance: 80, pnl: -20 },
      { timestamp: 3000, balance: 50, pnl: -50 },
    ];

    const svg = generateSparklineSvg(samples, 300, 70);
    expect(svg).toContain('#ff4a4a'); // Red for loss
    expect(svg).toContain('<line'); // Zero reference line
    expect(svg).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
  });
});

describe('installSessionVelocityRadar', () => {
  let doc: Document;

  beforeEach(() => {
    vi.useFakeTimers();
    doc = document.implementation.createHTMLDocument('Casino Tab');
    doc.body.innerHTML = `
      <div class="user-balance" data-value="100.00">$100.00</div>
      <button class="spin-btn" data-test="spin-button">SPIN</button>
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes radar and samples balance on spin button click', () => {
    const radar = installSessionVelocityRadar(doc, { initialBalance: 100 });
    const initialState = radar.getState();
    expect(initialState.startingBalance).toBe(100);

    // Simulate balance change after spin
    const balanceEl = doc.querySelector('.user-balance')!;
    balanceEl.setAttribute('data-value', '80.00');
    balanceEl.textContent = '$80.00';

    const spinBtn = doc.querySelector('.spin-btn') as HTMLButtonElement;
    spinBtn.click();

    // Advance timers for scheduled post-spin samples
    vi.advanceTimersByTime(2000);

    const updatedState = radar.getState();
    expect(updatedState.currentBalance).toBe(80);
    expect(updatedState.netPnl).toBe(-20);

    radar.stop();
  });

  it('supports explicit reset with custom baseline', () => {
    const radar = installSessionVelocityRadar(doc);
    radar.sample(150);
    expect(radar.getState().currentBalance).toBe(150);

    radar.reset(200);
    const resetState = radar.getState();
    expect(resetState.startingBalance).toBe(200);
    expect(resetState.netPnl).toBe(0);
    expect(resetState.samples.length).toBe(1);

    radar.stop();
  });
});

describe('cross-tab session', () => {
  afterEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
    document.body.innerHTML = '';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  function mockStorage(initial: Record<string, unknown> = {}) {
    const store: Record<string, unknown> = { ...initial };
    const writes: unknown[] = [];
    (globalThis as { chrome?: unknown }).chrome = {
      storage: {
        local: {
          get: (keys: string[], cb: (res: Record<string, unknown>) => void) => {
            const res: Record<string, unknown> = {};
            for (const key of keys) res[key] = store[key];
            cb(res);
          },
          set: (items: Record<string, unknown>) => {
            writes.push(items);
            Object.assign(store, items);
          },
        },
      },
    };
    return { store, writes };
  }

  it('rejects a stale session and a different casino host', () => {
    const fresh = recordBalanceSample(resetSessionPnl(100, Date.now()), 80, Date.now());
    expect(canAdoptStoredSession({ ...fresh, host: 'stake.com' }, 'stake.com')).toBe(true);
    expect(canAdoptStoredSession({ ...fresh, host: 'roobet.com' }, 'stake.com')).toBe(false);
    expect(canAdoptStoredSession({ ...fresh, host: 'stake.com', lastUpdated: Date.now() - SESSION_CROSS_TAB_MAX_AGE_MS - 1000 }, 'stake.com')).toBe(false);
    expect(canAdoptStoredSession({ ...fresh, host: '' }, 'stake.com')).toBe(true);
  });

  it('ignores hidden documents and nested frames', () => {
    expect(isCrossTabSessionOwner({ visibilityState: 'hidden', defaultView: null } as Document)).toBe(false);
    const view = { top: null as Window | null };
    view.top = {} as Window;
    expect(isCrossTabSessionOwner({ visibilityState: 'visible', defaultView: view } as unknown as Document)).toBe(false);
    expect(isCrossTabSessionOwner({ visibilityState: 'visible', defaultView: null } as Document)).toBe(true);
  });

  it('continues the same-host session when another tab opens', () => {
    const saved = recordBalanceSample(resetSessionPnl(200, Date.now() - 20_000), 150, Date.now() - 5_000);
    saved.host = window.location.hostname;
    mockStorage({ [TILTCHECK_SESSION_PNL_KEY]: saved });
    document.body.innerHTML = '<div class="user-balance" data-value="100.00">$100.00</div>';

    const radar = installSessionVelocityRadar(document);
    expect(radar.getState().startingBalance).toBe(200);
    expect(radar.getState().host).toBe(window.location.hostname);
    radar.stop();
  });

  it('starts fresh on a different casino instead of stealing the other session', () => {
    const saved = recordBalanceSample(resetSessionPnl(200, Date.now() - 20_000), 150, Date.now() - 5_000);
    saved.host = 'stake.com';
    const { store } = mockStorage({ [TILTCHECK_SESSION_PNL_KEY]: saved });
    document.body.innerHTML = '<div class="user-balance" data-value="100.00">$100.00</div>';

    const radar = installSessionVelocityRadar(document);
    expect(radar.getState().startingBalance).toBe(100);
    expect((store[TILTCHECK_SESSION_PNL_KEY] as SessionPnlState).host).toBe(window.location.hostname);
    radar.stop();
  });

  it('does not write the shared session while the tab is hidden', () => {
    const { writes } = mockStorage();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.body.innerHTML = '<div class="user-balance" data-value="100.00">$100.00</div>';

    const radar = installSessionVelocityRadar(document, { initialBalance: 80 });
    radar.sample(40);
    expect(writes).toHaveLength(0);
    expect(radar.getState().currentBalance).toBe(80);
    radar.stop();
  });
});
