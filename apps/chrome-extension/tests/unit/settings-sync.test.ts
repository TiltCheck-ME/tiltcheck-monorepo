/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */
/**
 * Dashboard settings sync: pull, cache, safe defaults, and the one write (on/off).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PLAYER_SETTINGS,
  sanitizePlayerSettings,
  settingsToStorage,
  withDefaults,
} from '../../src/player-settings.js';
import {
  SETTINGS_API_URL,
  SETTINGS_CACHE_KEY,
  SETTINGS_SYNC_ALARM,
  SETTINGS_SYNC_STATUS_KEY,
  installSettingsSync,
  pullSettings,
  setExtensionEnabled,
} from '../../src/settings-sync.js';
import { PLAYER_SETTINGS_DEFAULTS } from '../../../../scripts/pages-product-data.mjs';

const TOKEN = 'discord_access_token_abcdefghijklmnop';

function mockChrome(initial: Record<string, unknown> = {}) {
  const state: Record<string, unknown> = { ...initial };
  const alarms: Array<(a: { name: string }) => void> = [];
  const changed: Array<(c: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void> = [];
  const chromeMock = {
    alarms: { create: vi.fn(), onAlarm: { addListener: (l: (a: { name: string }) => void) => alarms.push(l) } },
    runtime: { onMessage: { addListener: vi.fn() } },
    storage: {
      onChanged: { addListener: (l: (typeof changed)[number]) => changed.push(l) },
      local: {
        get: vi.fn(async (keys: string[]) => {
          const out: Record<string, unknown> = {};
          for (const k of keys) if (k in state) out[k] = state[k];
          return out;
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(state, items);
        }),
      },
    },
  };
  (globalThis as unknown as { chrome: unknown }).chrome = chromeMock;
  return { state, chromeMock, alarms, changed };
}

const signedIn = { authToken: TOKEN, userData: { id: '42', discordId: '42', username: 'degen' } };

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

describe('player settings schema', () => {
  it('extension defaults match the dashboard defaults', () => {
    expect({ ...DEFAULT_PLAYER_SETTINGS }).toEqual({ ...PLAYER_SETTINGS_DEFAULTS });
  });

  it('drops unknown keys and bad values instead of guessing', () => {
    const clean = sanitizePlayerSettings({
      winSkimPercent: 500,
      hourlyWage: 30,
      tiltSensitivity: 'yolo',
      nopeGames: ['plinko', 'Bad Slug!', 'plinko', 'crash'],
      evil: '<script>',
      goals: [{ id: 'rent', name: 'Rent <b>', targetAmount: 900, metric: 'balance' }, { id: 'x', name: '', targetAmount: 5 }],
    });
    expect(clean).toEqual({
      hourlyWage: 30,
      nopeGames: ['plinko', 'crash'],
      goals: [{ id: 'rent', name: 'Rent b', targetAmount: 900, metric: 'balance', enabled: true }],
    });
  });

  it('maps settings onto the storage keys the content script reads', () => {
    const out = settingsToStorage(withDefaults({ enabled: false, autoBreakHours: 72, sounds: false, soundVolume: 0.5 }), 120);
    expect(out.tiltcheck_enabled).toBe(false);
    expect(out.tiltcheck_auto_lock_duration).toBe(72 * 3600);
    expect(out.tiltcheck_audio_alerts_config).toEqual({ enabled: false, volume: 0.5 });
    expect(out.tiltcheck_bonus_tracker_config).toMatchObject({ currentWagered: 120, active: false });
    expect(out).not.toHaveProperty('tiltcheck_cashout_goals');
  });
});

describe('pullSettings', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('signed out: applies safe defaults and never calls the worker', async () => {
    const { state } = mockChrome({ tiltcheck_profit_lock_trailing_percent: 80 });
    const fetchMock = vi.fn();
    const status = await pullSettings(fetchMock as unknown as typeof fetch, 1000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(status.state).toBe('signed_out');
    expect(state.tiltcheck_profit_lock_trailing_percent).toBe(DEFAULT_PLAYER_SETTINGS.winSkimPercent);
    expect(state[SETTINGS_SYNC_STATUS_KEY]).toEqual({ state: 'signed_out', at: 1000 });
  });

  it('signed in: pulls with the Discord token, caches, and applies', async () => {
    const { state } = mockChrome(signedIn);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ settings: { winSkimPercent: 30, nopeList: true, nopeGames: ['plinko'] }, updatedAt: 555 }));
    const status = await pullSettings(fetchMock as unknown as typeof fetch, 2000);
    expect(fetchMock).toHaveBeenCalledWith(SETTINGS_API_URL, expect.objectContaining({ method: 'GET', headers: { Authorization: `Bearer ${TOKEN}` } }));
    expect(status).toEqual({ state: 'synced', at: 2000, updatedAt: 555 });
    expect(state.tiltcheck_profit_lock_trailing_percent).toBe(30);
    expect(state.tiltcheck_game_block_opt_in).toBe(true);
    expect(state.tiltcheck_blocked_games).toEqual(['plinko']);
    expect(state[SETTINGS_CACHE_KEY]).toMatchObject({ userId: '42', updatedAt: 555, settings: { winSkimPercent: 30 } });
  });

  it('a pull never overrides the local on/off switch', async () => {
    const { state } = mockChrome({ ...signedIn, tiltcheck_enabled: false });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ settings: { enabled: true }, updatedAt: 1 }));
    await pullSettings(fetchMock as unknown as typeof fetch);
    expect(state.tiltcheck_enabled).toBe(false);
  });

  it('offline with a cached copy: keeps the cached settings', async () => {
    const { state } = mockChrome({
      ...signedIn,
      [SETTINGS_CACHE_KEY]: { userId: '42', settings: { hourlyWage: 60 }, updatedAt: 9, fetchedAt: 1 },
    });
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const status = await pullSettings(fetchMock as unknown as typeof fetch, 3000);
    expect(status).toEqual({ state: 'cached', at: 3000, updatedAt: 9 });
    expect(state.tiltcheck_hourly_wage).toBe(60);
  });

  it('offline with no cache (or a cache from another account): safe defaults', async () => {
    const { state } = mockChrome({
      ...signedIn,
      [SETTINGS_CACHE_KEY]: { userId: 'someone-else', settings: { hourlyWage: 999 }, updatedAt: 9, fetchedAt: 1 },
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'down' }, 503));
    const status = await pullSettings(fetchMock as unknown as typeof fetch, 4000);
    expect(status.state).toBe('defaults');
    expect(state.tiltcheck_hourly_wage).toBe(DEFAULT_PLAYER_SETTINGS.hourlyWage);
  });

  it('expired Discord token: reports expired and keeps the cached copy', async () => {
    const { state } = mockChrome({
      ...signedIn,
      [SETTINGS_CACHE_KEY]: { userId: '42', settings: { winSkim: false }, updatedAt: 7, fetchedAt: 1 },
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'not signed in' }, 401));
    const status = await pullSettings(fetchMock as unknown as typeof fetch, 5000);
    expect(status.state).toBe('expired');
    expect(state.tiltcheck_profit_lock_enabled).toBe(false);
  });
});

describe('setExtensionEnabled (the only write)', () => {
  it('saves locally and sends only { enabled } to the worker', async () => {
    const { state } = mockChrome(signedIn);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, settings: { enabled: false }, updatedAt: 10 }));
    const r = await setExtensionEnabled(false, fetchMock as unknown as typeof fetch);
    expect(r).toEqual({ saved: true, synced: true });
    expect(state.tiltcheck_enabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SETTINGS_API_URL);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ settings: { enabled: false } });
  });

  it('works signed out and offline (local only)', async () => {
    const { state } = mockChrome();
    const fetchMock = vi.fn();
    expect(await setExtensionEnabled(false, fetchMock as unknown as typeof fetch)).toEqual({ saved: true, synced: false });
    expect(state.tiltcheck_enabled).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('installSettingsSync', () => {
  it('pulls on start, every 15 minutes, and on sign-in', async () => {
    const { chromeMock, alarms, changed } = mockChrome(signedIn);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ settings: {}, updatedAt: null }));
    installSettingsSync(fetchMock as unknown as typeof fetch);
    await new Promise((r) => setTimeout(r, 0));
    expect(chromeMock.alarms.create).toHaveBeenCalledWith(SETTINGS_SYNC_ALARM, { periodInMinutes: 15 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    alarms.forEach((l) => l({ name: SETTINGS_SYNC_ALARM }));
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    changed.forEach((l) => l({ authToken: { oldValue: null, newValue: TOKEN } }, 'local'));
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
