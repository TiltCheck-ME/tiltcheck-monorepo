/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-19 */
/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const configState = vi.hoisted(() => ({ enabled: false, endpoint: '', uninstall: '', fallback: '' }));

vi.mock('../../src/config.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config.ts')>();
  return {
    ...actual,
    isBackendFeatureEnabled: (name: string) => (name === 'betaTelemetry' ? configState.enabled : false),
    get BETA_TELEMETRY_ENDPOINT() { return configState.endpoint; },
    get BETA_UNINSTALL_URL() { return configState.uninstall; },
    get FEEDBACK_FALLBACK_URL() { return configState.fallback; },
  };
});

import {
  BETA_EVENTS,
  BETA_TELEMETRY_COUNTS_KEY,
  BETA_TELEMETRY_OPT_IN_KEY,
  BETA_TELEMETRY_RETRY_KEY,
  BETA_MAX_BATCH_COUNT,
  BETA_RETRY_BASE_MS,
  BETA_SEND_INTERVAL_MS,
  buildBetaPayload,
  flushBetaTelemetry,
  getBetaCounts,
  isBetaTelemetryOptedIn,
  recordBetaEvent,
  sanitizeBetaCounts,
  setBetaTelemetryOptIn,
} from '../../src/beta-telemetry.ts';
import { formatBetaCounts, initBetaPanel, sendFeedback } from '../../src/beta-panel.ts';

let store: Record<string, unknown>;
let manifestVersion = '1.2.3';

function okResponse(body: unknown = { ok: true }, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/**
 * Mirror of the worker's validator (workers/collectclock-api/src/beta.js, PR #758).
 * Keep in sync: every payload the extension sends must pass it.
 */
const WORKER_BETA_EVENTS = ['install', 'nudge_shown', 'break_taken', 'keep_win_hold', 'cash_out', 'ask_question', 'protection_turned_off'];
function workerAccepts(b: any, now = Date.now()): boolean {
  const DAY = 86400000;
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  if (!b || typeof b !== 'object' || Array.isArray(b)) return false;
  const keys = Object.keys(b);
  if (keys.length !== 4 || !['schema', 'version', 'day', 'counts'].every((k) => keys.includes(k))) return false;
  if (b.schema !== 1) return false;
  if (typeof b.version !== 'string' || b.version.length > 20 || !/^(?:\d{1,4}(?:\.\d{1,4}){0,3}|unknown)$/.test(b.version)) return false;
  if (typeof b.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.day)) return false;
  const t = Date.parse(b.day + 'T00:00:00Z');
  if (!Number.isFinite(t) || iso(t) !== b.day) return false;
  const today = Date.parse(iso(now) + 'T00:00:00Z');
  if (t < today - 2 * DAY || t > today + DAY) return false;
  const c = b.counts;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
  const names = Object.keys(c);
  if (names.length === 0 || names.length > WORKER_BETA_EVENTS.length) return false;
  return names.every((n) => WORKER_BETA_EVENTS.includes(n) && Number.isInteger(c[n]) && c[n] >= 0 && c[n] <= 10000);
}
let setUninstallURL: ReturnType<typeof vi.fn>;

function installChrome(): void {
  store = {};
  setUninstallURL = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('chrome', {
    runtime: { getManifest: () => ({ version: manifestVersion }), setUninstallURL },
    storage: {
      local: {
        get: vi.fn(async (keys: string[]) => Object.fromEntries(keys.filter((k) => k in store).map((k) => [k, store[k]]))),
        set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(store, JSON.parse(JSON.stringify(items))); }),
      },
    },
  });
}

beforeEach(() => {
  manifestVersion = '1.2.3';
  Object.assign(configState, { enabled: false, endpoint: '', uninstall: '', fallback: '' });
  installChrome();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('beta telemetry: opt-in only', () => {
  it('is off by default and counts nothing until the user opts in', async () => {
    expect(await isBetaTelemetryOptedIn()).toBe(false);
    await recordBetaEvent('nudge_shown');
    await recordBetaEvent('break_taken');
    expect(store[BETA_TELEMETRY_COUNTS_KEY]).toBeUndefined();
    expect(await getBetaCounts()).toEqual({});
  });

  it('counts the install once on first opt-in, then counts events', async () => {
    await setBetaTelemetryOptIn(true);
    await recordBetaEvent('nudge_shown');
    await recordBetaEvent('nudge_shown');
    await recordBetaEvent('keep_win_hold');
    expect(await getBetaCounts()).toEqual({ install: 1, nudge_shown: 2, keep_win_hold: 1 });

    await setBetaTelemetryOptIn(false);
    await setBetaTelemetryOptIn(true);
    expect((await getBetaCounts()).install).toBeUndefined();
  });

  it('opting out deletes local counts', async () => {
    await setBetaTelemetryOptIn(true);
    await recordBetaEvent('cash_out');
    await setBetaTelemetryOptIn(false);
    expect(store[BETA_TELEMETRY_OPT_IN_KEY]).toBe(false);
    expect(await getBetaCounts()).toEqual({});
    await recordBetaEvent('cash_out');
    expect(await getBetaCounts()).toEqual({});
  });

  it('ignores unknown event names and junk counts', async () => {
    await setBetaTelemetryOptIn(true);
    await recordBetaEvent('wallet:abc' as never);
    expect(Object.keys(await getBetaCounts())).toEqual(['install']);
    expect(sanitizeBetaCounts({ nudge_shown: 2.7, userId: 5, break_taken: -1, cash_out: 'x' })).toEqual({ nudge_shown: 2 });
  });

  it('survives a missing chrome API (tests, page contexts)', async () => {
    vi.stubGlobal('chrome', undefined);
    await expect(recordBetaEvent('nudge_shown')).resolves.toBeUndefined();
    expect(await isBetaTelemetryOptedIn()).toBe(false);
  });
});

describe('beta telemetry: payload carries counts only', () => {
  it('has only schema, version, day and known counters', () => {
    const payload = buildBetaPayload({ nudge_shown: 3, cash_out: 1 }, new Date('2026-11-19T22:15:00Z'));
    expect(payload).toEqual({ schema: 1, version: '1.2.3', day: '2026-11-19', counts: { nudge_shown: 3, cash_out: 1 } });
    const json = JSON.stringify(payload);
    for (const banned of ['userId', 'user_id', 'wallet', 'username', 'url', 'http', 'amount', 'bet', 'casino', 'session']) {
      expect(json.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it('keeps the event list fixed', () => {
    expect([...BETA_EVENTS]).toEqual(['install', 'nudge_shown', 'break_taken', 'keep_win_hold', 'cash_out', 'ask_question', 'protection_turned_off']);
  });
});

describe('beta telemetry: sender is a stub until configured', () => {
  it('makes no network call while the flag or endpoint is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await flushBetaTelemetry()).toBe('opted-out');
    await setBetaTelemetryOptIn(true);
    expect(await flushBetaTelemetry()).toBe('not-configured');
    configState.enabled = true;
    expect(await flushBetaTelemetry()).toBe('not-configured');
    configState.enabled = false;
    configState.endpoint = '/beta/counts';
    expect(await flushBetaTelemetry()).toBe('not-configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('when configured, posts counts without cookies once a day and subtracts what was sent', async () => {
    Object.assign(configState, { enabled: true, endpoint: '/beta/counts' });
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    await setBetaTelemetryOptIn(true);
    await recordBetaEvent('break_taken');

    const now = Date.parse('2026-11-19T12:00:00Z');
    expect(await flushBetaTelemetry(now)).toBe('sent');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://collectclock-api.j-chapman7.workers.dev/beta/counts');
    expect(init.credentials).toBe('omit');
    expect(init.headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(init.body)).toEqual({ schema: 1, version: '1.2.3', day: '2026-11-19', counts: { install: 1, break_taken: 1 } });
    expect(await getBetaCounts()).toEqual({});

    await recordBetaEvent('nudge_shown');
    expect(await flushBetaTelemetry(now + 60_000)).toBe('too-soon');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps counts when the send fails (and backs off)', async () => {
    Object.assign(configState, { enabled: true, endpoint: 'https://example.invalid/counts' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await setBetaTelemetryOptIn(true);
    expect(await flushBetaTelemetry()).toBe('failed');
    expect(await getBetaCounts()).toEqual({ install: 1 });
  });

  it('sets an uninstall page only when opted in and configured', async () => {
    await setBetaTelemetryOptIn(true);
    expect(setUninstallURL).toHaveBeenLastCalledWith('');
    configState.uninstall = 'https://tiltcheck.me/bye';
    await setBetaTelemetryOptIn(true);
    expect(setUninstallURL).toHaveBeenLastCalledWith('https://tiltcheck.me/bye?v=1.2.3');
    await setBetaTelemetryOptIn(false);
    expect(setUninstallURL).toHaveBeenLastCalledWith('');
  });
});

describe('Send feedback', () => {
  it('needs a Discord session and makes no call without one', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await sendFeedback('hello', async () => '')).toEqual({ ok: false, reason: 'signed-out' });
    expect(await sendFeedback('   ', async () => 'sess')).toEqual({ ok: false, reason: 'empty' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts only kind + message to the worker /support route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    expect(await sendFeedback('  Touch Grass froze on Stake  ', async () => 'sess-1')).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://collectclock-api.j-chapman7.workers.dev/support');
    expect(init.headers.Authorization).toBe('Bearer sess-1');
    expect(JSON.parse(init.body)).toEqual({ kind: 'feedback', message: 'Touch Grass froze on Stake' });
  });

  it('maps 401 and 429 to plain reasons', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    expect(await sendFeedback('x', async () => 's')).toEqual({ ok: false, reason: 'rate-limited' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    expect(await sendFeedback('x', async () => 's')).toEqual({ ok: false, reason: 'signed-out' });
  });
});

describe('Beta panel wiring', () => {
  function mountPanel(): void {
    document.body.innerHTML = `
      <input type="checkbox" id="beta-telemetry-toggle" />
      <p id="beta-telemetry-counts" style="display:none;"></p>
      <button id="btn-send-feedback"></button>
      <div id="feedback-form" style="display:none;"><textarea id="feedback-message"></textarea>
      <button id="btn-feedback-submit"></button><span id="feedback-status"></span>
      <a id="feedback-fallback-link" href="#" style="display:none;"></a></div>`;
  }

  it('starts unchecked, and the toggle switches counting on and off', async () => {
    mountPanel();
    await initBetaPanel(document);
    const toggle = document.getElementById('beta-telemetry-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await vi.waitFor(async () => expect(await isBetaTelemetryOptedIn()).toBe(true));
    await vi.waitFor(() => expect(document.getElementById('beta-telemetry-counts')!.textContent).toContain('install 1'));
  });

  it('shows the fallback link only when one is configured', async () => {
    mountPanel();
    await initBetaPanel(document);
    expect((document.getElementById('feedback-fallback-link') as HTMLElement).style.display).toBe('none');
    configState.fallback = 'https://discord.gg/example';
    mountPanel();
    await initBetaPanel(document);
    const link = document.getElementById('feedback-fallback-link') as HTMLAnchorElement;
    expect(link.style.display).toBe('block');
    expect(link.href).toBe('https://discord.gg/example');
  });

  it('formats counts in plain words', () => {
    expect(formatBetaCounts({})).toBe('Nothing counted yet.');
    expect(formatBetaCounts({ nudge_shown: 2, keep_win_hold: 1 })).toBe('Counted on this device so far: nudges 2, Keep the Win holds 1.');
  });
});

describe('guards feed the counters (only when opted in)', () => {
  it('Keep the Win counts one hold per press, not per pointer event', async () => {
    const { installReverseWithdrawalShield, setInMemoryShieldEnabled } = await import('../../src/reverse-withdrawal-shield.ts');
    document.body.innerHTML = '<button id="cw">Cancel withdrawal</button>';
    const handle = installReverseWithdrawalShield(document);
    setInMemoryShieldEnabled(true);
    const btn = document.getElementById('cw')!;

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(await getBetaCounts()).toEqual({});

    await setBetaTelemetryOptIn(true);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 10_000);
    for (const type of ['pointerdown', 'mousedown', 'click']) {
      btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
    }
    vi.useRealTimers();
    await vi.waitFor(async () => expect((await getBetaCounts()).keep_win_hold).toBe(1));
    handle.stop?.();
  });
});

describe('beta telemetry: live worker contract', () => {
  const NOW = Date.parse('2026-11-20T02:30:00Z');
  async function optInWith(counts: Record<string, number>) {
    Object.assign(configState, { enabled: true, endpoint: '/beta/counts' });
    await setBetaTelemetryOptIn(true);
    store[BETA_TELEMETRY_COUNTS_KEY] = counts;
  }

  it('uses the same event keys the worker accepts', () => {
    expect([...BETA_EVENTS]).toEqual(WORKER_BETA_EVENTS);
  });

  it('sends JSON the worker validator accepts, with only Content-Type, under 1 KB', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    await optInWith(Object.fromEntries(WORKER_BETA_EVENTS.map((e) => [e, 9999])));
    expect(await flushBetaTelemetry(NOW)).toBe('sent');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://collectclock-api.j-chapman7.workers.dev/beta/counts');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(new TextEncoder().encode(init.body).byteLength).toBeLessThanOrEqual(1024);
    const body = JSON.parse(init.body);
    expect(workerAccepts(body, NOW)).toBe(true);
    expect(body.day).toBe('2026-11-20'); // UTC day, not Central
  });

  it('caps each count at 10,000 per batch and keeps the rest for the next one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    await optInWith({ nudge_shown: 25_000 });
    expect(await flushBetaTelemetry(NOW)).toBe('sent');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.counts).toEqual({ nudge_shown: BETA_MAX_BATCH_COUNT });
    expect(workerAccepts(body, NOW)).toBe(true);
    expect(await getBetaCounts()).toEqual({ nudge_shown: 15_000 });
  });

  it('sends "unknown" when the manifest version is not 1-4 short numbers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    for (const v of ['1.2.3.4.5', '1.2.3-beta', '12345.0', '']) {
      manifestVersion = v;
      expect(buildBetaPayload({ cash_out: 1 }).version, v).toBe('unknown');
    }
    manifestVersion = '9999.0.0.1';
    expect(buildBetaPayload({ cash_out: 1 }).version).toBe('9999.0.0.1');
  });

  it('never sends an empty batch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await optInWith({});
    expect(await flushBetaTelemetry(NOW)).toBe('empty');
    store[BETA_TELEMETRY_COUNTS_KEY] = { nudge_shown: 0, junk: 4 };
    expect(await flushBetaTelemetry(NOW)).toBe('empty');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('drops the batch on 400 instead of retrying it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ error: 'bad request' }, 400));
    vi.stubGlobal('fetch', fetchMock);
    await optInWith({ cash_out: 2 });
    expect(await flushBetaTelemetry(NOW)).toBe('dropped');
    expect(await getBetaCounts()).toEqual({});
    expect(store[BETA_TELEMETRY_RETRY_KEY]).toEqual({ at: 0, attempts: 0 });
    await recordBetaEvent('cash_out');
    expect(await flushBetaTelemetry(NOW + 60_000)).toBe('too-soon');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps counts and backs off 1h, 2h, 4h on 429 and network errors, then sends', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okResponse({ error: 'try again tomorrow' }, 429))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(okResponse({ error: 'x' }, 503))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    await optInWith({ break_taken: 3 });

    expect(await flushBetaTelemetry(NOW)).toBe('failed');
    expect(store[BETA_TELEMETRY_RETRY_KEY]).toEqual({ at: NOW + BETA_RETRY_BASE_MS, attempts: 1 });
    expect(await flushBetaTelemetry(NOW + BETA_RETRY_BASE_MS - 1)).toBe('backing-off');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    let t = NOW + BETA_RETRY_BASE_MS;
    expect(await flushBetaTelemetry(t)).toBe('failed');
    expect(store[BETA_TELEMETRY_RETRY_KEY]).toEqual({ at: t + 2 * BETA_RETRY_BASE_MS, attempts: 2 });
    t += 2 * BETA_RETRY_BASE_MS;
    expect(await flushBetaTelemetry(t)).toBe('failed');
    expect(store[BETA_TELEMETRY_RETRY_KEY]).toEqual({ at: t + 4 * BETA_RETRY_BASE_MS, attempts: 3 });
    expect(await getBetaCounts()).toEqual({ break_taken: 3 });

    t += 4 * BETA_RETRY_BASE_MS;
    expect(await flushBetaTelemetry(t)).toBe('sent');
    expect(await getBetaCounts()).toEqual({});
    expect(store[BETA_TELEMETRY_RETRY_KEY]).toEqual({ at: 0, attempts: 0 });
    expect(await flushBetaTelemetry(t + BETA_SEND_INTERVAL_MS - 1)).toBe('too-soon');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('caps backoff at a day', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({}, 429)));
    await optInWith({ cash_out: 1 });
    store[BETA_TELEMETRY_RETRY_KEY] = { at: 0, attempts: 10 };
    expect(await flushBetaTelemetry(NOW)).toBe('failed');
    expect(store[BETA_TELEMETRY_RETRY_KEY]).toEqual({ at: NOW + BETA_SEND_INTERVAL_MS, attempts: 11 });
  });

  it('treats the worker health JSON (route missing) as a failure, not a send', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ ok: true, service: 'collectclock-api' })));
    await optInWith({ cash_out: 1 });
    expect(await flushBetaTelemetry(NOW)).toBe('failed');
    expect(await getBetaCounts()).toEqual({ cash_out: 1 });
  });

  it('with the real config, sends nothing before opt-in and the toggle starts off', async () => {
    const real = await vi.importActual<typeof import('../../src/config.ts')>('../../src/config.ts');
    expect(real.BACKEND_FEATURES.betaTelemetry).toBe(true);
    expect(real.BETA_TELEMETRY_ENDPOINT).toBe('/beta/counts');
    Object.assign(configState, { enabled: true, endpoint: real.BETA_TELEMETRY_ENDPOINT });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await recordBetaEvent('nudge_shown');
    expect(await flushBetaTelemetry(NOW)).toBe('opted-out');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await isBetaTelemetryOptedIn()).toBe(false);
  });
});
