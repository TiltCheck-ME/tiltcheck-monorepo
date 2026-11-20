/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-19 */
/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const configState = vi.hoisted(() => ({ enabled: false, endpoint: '' }));

vi.mock('../../src/config.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config.ts')>();
  return {
    ...actual,
    isBackendFeatureEnabled: (name: string) => (name === 'betaTelemetry' ? configState.enabled : false),
    get BETA_TELEMETRY_ENDPOINT() { return configState.endpoint; },
  };
});

import {
  BETA_TELEMETRY_COUNTS_KEY,
  BETA_TELEMETRY_LAST_SENT_KEY,
  BETA_TELEMETRY_OPT_IN_KEY,
  BETA_TELEMETRY_RETRY_KEY,
  BETA_RETRY_BASE_MS,
  BETA_SEND_INTERVAL_MS,
  flushBetaTelemetry,
} from '../../src/beta-telemetry.ts';
import {
  BETA_FLUSH_ALARM_NAME,
  BETA_FLUSH_ALARM_PERIOD_MINUTES,
  __resetBetaTelemetryAlarmForTests,
  ensureBetaFlushAlarm,
  initBetaTelemetryAlarm,
} from '../../src/beta-telemetry-alarm.ts';

// Fake endpoint only. fetch is always stubbed: no test reaches the real worker.
const FAKE_ENDPOINT = 'https://beta.example.test/beta/counts';

let store: Record<string, unknown>;
let alarms: Map<string, { name: string; periodInMinutes?: number; delayInMinutes?: number }>;
let alarmListeners: Array<(alarm: { name: string }) => void>;
let startupListeners: Array<() => void>;
let installedListeners: Array<() => void>;
let fetchMock: ReturnType<typeof vi.fn>;

function okResponse(body: unknown = { ok: true }, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function installChrome(): void {
  store = {};
  alarms = new Map();
  alarmListeners = [];
  startupListeners = [];
  installedListeners = [];
  vi.stubGlobal('chrome', {
    runtime: {
      getManifest: () => ({ version: '1.2.3' }),
      onStartup: { addListener: vi.fn((fn: () => void) => startupListeners.push(fn)) },
      onInstalled: { addListener: vi.fn((fn: () => void) => installedListeners.push(fn)) },
    },
    alarms: {
      get: vi.fn(async (name: string) => alarms.get(name)),
      create: vi.fn(async (name: string, info: { periodInMinutes?: number; delayInMinutes?: number }) => {
        alarms.set(name, { name, ...info });
      }),
      onAlarm: { addListener: vi.fn((fn: (a: { name: string }) => void) => alarmListeners.push(fn)) },
    },
    storage: {
      local: {
        get: vi.fn(async (keys: string[]) => Object.fromEntries(keys.filter((k) => k in store).map((k) => [k, store[k]]))),
        set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(store, JSON.parse(JSON.stringify(items))); }),
      },
    },
  });
  fetchMock = vi.fn(async () => okResponse());
  vi.stubGlobal('fetch', fetchMock);
}

function configure(): void {
  Object.assign(configState, { enabled: true, endpoint: FAKE_ENDPOINT });
}

function optInWith(counts: Record<string, number>): void {
  store[BETA_TELEMETRY_OPT_IN_KEY] = true;
  store[BETA_TELEMETRY_COUNTS_KEY] = counts;
}

async function fireAlarm(name = BETA_FLUSH_ALARM_NAME): Promise<void> {
  for (const fn of alarmListeners) fn({ name });
  await vi.waitFor(async () => { await new Promise((r) => setTimeout(r, 0)); });
  await new Promise((r) => setTimeout(r, 5));
}

beforeEach(() => {
  Object.assign(configState, { enabled: false, endpoint: '' });
  installChrome();
  __resetBetaTelemetryAlarmForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('beta counts alarm: registration', () => {
  it('creates one daily alarm and registers alarm, startup and install listeners once', async () => {
    initBetaTelemetryAlarm();
    initBetaTelemetryAlarm();
    await new Promise((r) => setTimeout(r, 0));
    expect(alarmListeners).toHaveLength(1);
    expect(startupListeners).toHaveLength(1);
    expect(installedListeners).toHaveLength(1);
    expect(alarms.get(BETA_FLUSH_ALARM_NAME)).toEqual({
      name: BETA_FLUSH_ALARM_NAME,
      delayInMinutes: 1440,
      periodInMinutes: 1440,
    });
    expect(BETA_FLUSH_ALARM_PERIOD_MINUTES).toBe(1440);
  });

  it('does not re-create (and reset) an existing daily alarm on service-worker wake', async () => {
    alarms.set(BETA_FLUSH_ALARM_NAME, { name: BETA_FLUSH_ALARM_NAME, periodInMinutes: 1440 });
    await ensureBetaFlushAlarm();
    expect((chrome.alarms.create as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('survives a missing chrome.alarms API', async () => {
    vi.stubGlobal('chrome', { runtime: {}, storage: (globalThis as any).chrome.storage });
    await expect(ensureBetaFlushAlarm()).resolves.toBeUndefined();
    expect(() => initBetaTelemetryAlarm()).not.toThrow();
  });
});

describe('beta counts alarm: reuses the sender rules', () => {
  it('sends nothing while opted out (the default), even when configured', async () => {
    configure();
    store[BETA_TELEMETRY_COUNTS_KEY] = { nudge_shown: 3 };
    initBetaTelemetryAlarm();
    await fireAlarm();
    for (const fn of startupListeners) fn();
    await new Promise((r) => setTimeout(r, 5));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store[BETA_TELEMETRY_OPT_IN_KEY]).toBeUndefined();
  });

  it('sends nothing when opted in but the build flag or endpoint is missing', async () => {
    optInWith({ nudge_shown: 3 });
    initBetaTelemetryAlarm();
    await fireAlarm();
    configState.enabled = true; // flag on, endpoint still empty
    await fireAlarm();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never sends an empty batch', async () => {
    configure();
    optInWith({});
    initBetaTelemetryAlarm();
    await fireAlarm();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores other alarms (e.g. cooldown sync)', async () => {
    configure();
    optInWith({ nudge_shown: 1 });
    initBetaTelemetryAlarm();
    await fireAlarm('tiltcheck_cooldown_sync');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opted in + configured: the alarm sends once, a second alarm the same day does not', async () => {
    configure();
    optInWith({ nudge_shown: 2, break_taken: 1 });
    initBetaTelemetryAlarm();
    await fireAlarm();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(FAKE_ENDPOINT);
    expect(JSON.parse(init.body).counts).toEqual({ nudge_shown: 2, break_taken: 1 });
    expect(store[BETA_TELEMETRY_COUNTS_KEY]).toEqual({});

    store[BETA_TELEMETRY_COUNTS_KEY] = { nudge_shown: 5 };
    await fireAlarm();
    for (const fn of startupListeners) fn();
    await new Promise((r) => setTimeout(r, 5));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not double-send when the popup already flushed today', async () => {
    configure();
    optInWith({ cash_out: 1 });
    expect(await flushBetaTelemetry()).toBe('sent'); // popup open
    store[BETA_TELEMETRY_COUNTS_KEY] = { cash_out: 1 };
    initBetaTelemetryAlarm();
    await fireAlarm();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends again once a day has passed since the last send', async () => {
    configure();
    optInWith({ cash_out: 1 });
    store[BETA_TELEMETRY_LAST_SENT_KEY] = Date.now() - BETA_SEND_INTERVAL_MS - 1000;
    initBetaTelemetryAlarm();
    await fireAlarm();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('respects the 429/network backoff window', async () => {
    configure();
    optInWith({ cash_out: 1 });
    store[BETA_TELEMETRY_RETRY_KEY] = { at: Date.now() + BETA_RETRY_BASE_MS, attempts: 1 };
    initBetaTelemetryAlarm();
    await fireAlarm();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a failed alarm send backs off (1h first) and keeps the counts', async () => {
    configure();
    optInWith({ cash_out: 1 });
    fetchMock.mockResolvedValueOnce(okResponse({ error: 'rate' }, 429));
    initBetaTelemetryAlarm();
    const before = Date.now();
    await fireAlarm();
    const retry = store[BETA_TELEMETRY_RETRY_KEY] as { at: number; attempts: number };
    expect(retry.attempts).toBe(1);
    expect(retry.at).toBeGreaterThanOrEqual(before + BETA_RETRY_BASE_MS);
    expect(store[BETA_TELEMETRY_COUNTS_KEY]).toEqual({ cash_out: 1 });
  });

  it('drops the batch on 400', async () => {
    configure();
    optInWith({ cash_out: 1 });
    fetchMock.mockResolvedValueOnce(okResponse({ error: 'bad' }, 400));
    initBetaTelemetryAlarm();
    await fireAlarm();
    expect(store[BETA_TELEMETRY_COUNTS_KEY]).toEqual({});
  });

  it('browser startup triggers one attempt', async () => {
    configure();
    optInWith({ break_taken: 1 });
    initBetaTelemetryAlarm();
    for (const fn of startupListeners) fn();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});

describe('beta counts flush: one sender at a time across popup and service worker', () => {
  function fakeLocks() {
    const held = new Set<string>();
    return {
      request: vi.fn(async (name: string, _opts: { ifAvailable: boolean }, cb: (lock: unknown) => Promise<unknown>) => {
        if (held.has(name)) return cb(null);
        held.add(name);
        try { return await cb({ name }); } finally { held.delete(name); }
      }),
    };
  }

  it('concurrent popup + alarm flushes make exactly one request', async () => {
    configure();
    optInWith({ nudge_shown: 1 });
    vi.stubGlobal('navigator', { locks: fakeLocks() });
    let release!: () => void;
    fetchMock.mockImplementationOnce(() => new Promise((r) => { release = () => r(okResponse()); }));
    const a = flushBetaTelemetry();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const b = await flushBetaTelemetry();
    expect(b).toBe('busy');
    release();
    expect(await a).toBe('sent');
    expect(await flushBetaTelemetry()).toBe('too-soon');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('manifest', () => {
  it('declares the alarms permission (already present before this change)', () => {
    for (const rel of ['../../manifest.json', '../../src/manifest.json']) {
      const m = JSON.parse(readFileSync(path.join(__dirname, rel), 'utf8'));
      expect(m.permissions).toContain('alarms');
      expect(m.background.service_worker).toBe('background.js');
    }
  });

  it('background.js loads the alarm bundle with importScripts and build.js emits it', () => {
    const bg = readFileSync(path.join(__dirname, '../../src/background.js'), 'utf8');
    expect(bg).toContain("importScripts('beta-telemetry-alarm.js')");
    const build = readFileSync(path.join(__dirname, '../../build.js'), 'utf8');
    expect(build).toContain("dist/beta-telemetry-alarm.js");
  });
});
