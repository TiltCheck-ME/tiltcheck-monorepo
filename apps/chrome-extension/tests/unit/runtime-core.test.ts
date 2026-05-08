/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RuntimeEventBus,
  RuntimeLogger,
  RuntimeStorageDriver,
  createFeatureFlagRegistry,
  createInjectedRuntimeCore,
  createMemoryStorageDriver,
  createSafeRuntimeStorage,
} from '../../src/runtime/index.js';

interface TestEvents {
  round: { amount: number };
}

type TestFlag = 'stake-sensor' | 'bonus-watch';

function createSink() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('runtime core primitives', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as typeof globalThis & { chrome?: unknown }).chrome;
  });

  it('routes events, supports unsubscribe, and contains handler failures', async () => {
    const sink = createSink();
    const logger = new RuntimeLogger({ namespace: 'runtime-test', sink });
    const bus = new RuntimeEventBus<TestEvents>({ logger });
    const listener = vi.fn();

    const unsubscribe = bus.on('round', listener);
    bus.on('round', () => {
      throw new Error('listener cooked');
    });

    await bus.emit('round', { amount: 25 });

    expect(listener).toHaveBeenCalledWith({ amount: 25 });
    expect(sink.error).toHaveBeenCalledWith(
      '[runtime-test] Event handler failed for round',
      expect.any(Error),
    );

    unsubscribe();
    await bus.emit('round', { amount: 50 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('enables and disables module feature flags with change notifications', () => {
    const changes: unknown[] = [];
    const flags = createFeatureFlagRegistry<TestFlag>({
      defaults: {
        'stake-sensor': { enabled: true, description: 'Stake domain sensor' },
        'bonus-watch': false,
      },
      onChange: (change) => changes.push(change),
    });

    expect(flags.isEnabled('stake-sensor')).toBe(true);
    expect(flags.isEnabled('bonus-watch')).toBe(false);

    flags.enableModule('bonus-watch');
    flags.disableModule('stake-sensor');

    expect(flags.isEnabled('bonus-watch')).toBe(true);
    expect(flags.isEnabled('stake-sensor')).toBe(false);
    expect(changes).toEqual([
      { name: 'bonus-watch', enabled: true, previous: false, source: 'runtime' },
      { name: 'stake-sensor', enabled: false, previous: true, source: 'runtime' },
    ]);
  });

  it('falls back to memory storage when the primary driver is blocked', async () => {
    const sink = createSink();
    const blockedDriver: RuntimeStorageDriver = {
      name: 'blocked-storage',
      get: vi.fn().mockRejectedValue(new Error('storage blocked')),
      set: vi.fn().mockRejectedValue(new Error('storage blocked')),
      remove: vi.fn().mockRejectedValue(new Error('storage blocked')),
      clear: vi.fn().mockRejectedValue(new Error('storage blocked')),
    };
    const storage = createSafeRuntimeStorage({
      drivers: [blockedDriver, createMemoryStorageDriver({ namespace: 'runtime-test' })],
      logger: new RuntimeLogger({ namespace: 'runtime-test', sink }),
    });

    await expect(storage.set('module-state', { enabled: true })).resolves.toBeUndefined();
    await expect(storage.get('module-state')).resolves.toEqual({ enabled: true });

    expect(storage.activeDriverName).toBe('memory');
    expect(sink.warn).toHaveBeenCalledWith(
      '[runtime-test] Storage set failed on blocked-storage; falling back',
      expect.any(Error),
    );
  });

  it('creates a shared runtime core and publishes feature flag changes', async () => {
    const runtime = createInjectedRuntimeCore<TestFlag>({
      namespace: 'runtime-test',
      loggerOptions: {
        sink: createSink(),
      },
      defaultFlags: {
        'stake-sensor': true,
      },
    });
    const changeListener = vi.fn();

    runtime.events.on('feature-flags:changed', changeListener);
    runtime.flags.disable('stake-sensor');

    await vi.waitFor(() => {
      expect(changeListener).toHaveBeenCalledWith({
        name: 'stake-sensor',
        enabled: false,
        previous: true,
        source: 'runtime',
      });
    });

    await runtime.storage.set('last-module', 'stake-sensor');
    await expect(runtime.storage.get('last-module')).resolves.toBe('stake-sensor');
  });
});
