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
let setUninstallURL: ReturnType<typeof vi.fn>;

function installChrome(): void {
  store = {};
  setUninstallURL = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('chrome', {
    runtime: { getManifest: () => ({ version: '1.2.3' }), setUninstallURL },
    storage: {
      local: {
        get: vi.fn(async (keys: string[]) => Object.fromEntries(keys.filter((k) => k in store).map((k) => [k, store[k]]))),
        set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(store, JSON.parse(JSON.stringify(items))); }),
      },
    },
  });
}

beforeEach(() => {
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
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
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

  it('keeps counts when the send fails', async () => {
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
