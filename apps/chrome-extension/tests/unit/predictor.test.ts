/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/sidebar/api.js', () => ({
  apiCall: vi.fn(async () => ({
    ok: true,
    stats: {
      predictions: [
        {
          id: 'drop-1',
          source: 'telegram',
          label: 'Test Drop',
          estimatedAt: Date.now() + 60_000,
          confidence: 0.8,
        },
      ],
    },
  })),
}));

describe('PredictorManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T00:00:00Z'));
    document.body.innerHTML = '<div id="predictor-list"></div>';
  });

  it('clears old polling and ticker timers before reinitializing', async () => {
    const { PredictorManager } = await import('../../src/sidebar/predictor.ts');
    const manager = new PredictorManager({} as any);
    const renderSpy = vi.spyOn(manager as any, 'render');

    await manager.init();
    await manager.init();
    renderSpy.mockClear();

    manager.destroy();
    await vi.advanceTimersByTimeAsync(301_000);

    expect(renderSpy).not.toHaveBeenCalled();
  });
});
