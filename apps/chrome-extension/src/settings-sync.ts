/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */

/**
 * Pulls the player's dashboard settings from the CollectClock worker and applies them.
 *
 * - Pull on sign-in and every ~15 minutes (background alarm).
 * - Cache the last good copy in chrome.storage.
 * - Signed out: safe defaults. Offline / worker down: the cached copy, or safe defaults if none.
 * - The only thing the extension ever writes back is the popup on/off switch.
 */

import { EXT_CONFIG } from './config.js';
import { TILTCHECK_ENABLED_KEY, TILTCHECK_BONUS_TRACKER_CONFIG_KEY } from './core-options.js';
import {
  DEFAULT_PLAYER_SETTINGS,
  sanitizePlayerSettings,
  settingsToStorage,
  withDefaults,
  type PlayerSettings,
} from './player-settings.js';

export const SETTINGS_API_URL = `${EXT_CONFIG.WORKER_API_URL}/settings`;
export const SETTINGS_SYNC_ALARM = 'tiltcheck_settings_sync';
export const SETTINGS_SYNC_PERIOD_MINUTES = 15;
export const SETTINGS_CACHE_KEY = 'tiltcheck_settings_cache';
export const SETTINGS_SYNC_STATUS_KEY = 'tiltcheck_settings_sync_status';
const FETCH_TIMEOUT_MS = 10_000;

export type SyncState = 'synced' | 'cached' | 'defaults' | 'signed_out' | 'expired';

export interface SyncStatus {
  state: SyncState;
  at: number;
  updatedAt?: number | null;
}

export interface SettingsCache {
  userId: string;
  settings: Partial<PlayerSettings>;
  updatedAt: number | null;
  fetchedAt: number;
}

type FetchLike = typeof fetch;

interface AuthSnapshot {
  token: string | null;
  userId: string | null;
}

async function readAuth(): Promise<AuthSnapshot> {
  const stored = await chrome.storage.local.get(['authToken', 'userData', 'tiltguard_user_id']);
  const token = typeof stored.authToken === 'string' && stored.authToken.length >= 20 ? stored.authToken : null;
  const user = stored.userData as { discordId?: string; id?: string } | null | undefined;
  const userId = (user && (user.discordId || user.id)) || (typeof stored.tiltguard_user_id === 'string' ? stored.tiltguard_user_id : null);
  return { token, userId: userId ? String(userId) : null };
}

async function currentBonusWagered(): Promise<number> {
  try {
    const stored = await chrome.storage.local.get([TILTCHECK_BONUS_TRACKER_CONFIG_KEY]);
    const cfg = stored[TILTCHECK_BONUS_TRACKER_CONFIG_KEY] as { currentWagered?: number } | undefined;
    return Number(cfg?.currentWagered) || 0;
  } catch {
    return 0;
  }
}

async function localEnabled(): Promise<boolean> {
  try {
    const stored = await chrome.storage.local.get([TILTCHECK_ENABLED_KEY]);
    return stored[TILTCHECK_ENABLED_KEY] !== false;
  } catch {
    return true;
  }
}

/**
 * Write settings into the keys the content script reads.
 * The on/off switch is local: the player flips it in the popup, so a pull never
 * overrides what they just did on this computer.
 */
export async function applySettings(settings: PlayerSettings, opts: { keepLocalEnabled?: boolean } = {}): Promise<void> {
  const effective: PlayerSettings = { ...settings };
  if (opts.keepLocalEnabled !== false) {
    effective.enabled = await localEnabled();
  }
  await chrome.storage.local.set(settingsToStorage(effective, await currentBonusWagered()));
}

async function setStatus(status: SyncStatus): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_SYNC_STATUS_KEY]: status });
}

async function fetchWithTimeout(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<Response> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null;
  try {
    return await fetchImpl(url, { ...init, ...(ctrl ? { signal: ctrl.signal } : {}) });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Pull settings from the worker and apply them. Never throws.
 */
export async function pullSettings(fetchImpl: FetchLike = fetch, now = Date.now()): Promise<SyncStatus> {
  let auth: AuthSnapshot;
  try {
    auth = await readAuth();
  } catch {
    auth = { token: null, userId: null };
  }

  if (!auth.token) {
    await applySettings(withDefaults(null));
    const status: SyncStatus = { state: 'signed_out', at: now };
    await setStatus(status);
    return status;
  }

  const cached = await readCache();
  const cacheForUser = cached && (!auth.userId || cached.userId === auth.userId) ? cached : null;

  try {
    const res = await fetchWithTimeout(fetchImpl, SETTINGS_API_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (res.status === 401) {
      // Discord token ran out. Keep what we had; the popup offers sign-in again.
      await applySettings(withDefaults(cacheForUser?.settings ?? null));
      const status: SyncStatus = { state: 'expired', at: now, updatedAt: cacheForUser?.updatedAt ?? null };
      await setStatus(status);
      return status;
    }
    if (!res.ok) throw new Error(`settings ${res.status}`);
    const body = (await res.json()) as { settings?: unknown; updatedAt?: unknown };
    const clean = sanitizePlayerSettings(body?.settings);
    const updatedAt = typeof body?.updatedAt === 'number' ? body.updatedAt : null;
    await chrome.storage.local.set({
      [SETTINGS_CACHE_KEY]: {
        userId: auth.userId ?? 'unknown',
        settings: clean,
        updatedAt,
        fetchedAt: now,
      } satisfies SettingsCache,
    });
    await applySettings(withDefaults(clean));
    const status: SyncStatus = { state: 'synced', at: now, updatedAt };
    await setStatus(status);
    return status;
  } catch {
    if (cacheForUser) {
      await applySettings(withDefaults(cacheForUser.settings));
      const status: SyncStatus = { state: 'cached', at: now, updatedAt: cacheForUser.updatedAt };
      await setStatus(status);
      return status;
    }
    await applySettings(withDefaults(null));
    const status: SyncStatus = { state: 'defaults', at: now };
    await setStatus(status);
    return status;
  }
}

export async function readCache(): Promise<SettingsCache | null> {
  try {
    const stored = await chrome.storage.local.get([SETTINGS_CACHE_KEY]);
    const c = stored[SETTINGS_CACHE_KEY] as SettingsCache | undefined;
    if (!c || typeof c !== 'object' || typeof c.userId !== 'string') return null;
    return { ...c, settings: sanitizePlayerSettings(c.settings) };
  } catch {
    return null;
  }
}

/**
 * The popup on/off switch. Saves locally right away (works signed out and offline),
 * then tells the dashboard if signed in. Returns whether the dashboard copy was updated.
 */
export async function setExtensionEnabled(enabled: boolean, fetchImpl: FetchLike = fetch): Promise<{ saved: boolean; synced: boolean }> {
  await chrome.storage.local.set({ [TILTCHECK_ENABLED_KEY]: enabled === true });
  let auth: AuthSnapshot;
  try {
    auth = await readAuth();
  } catch {
    return { saved: true, synced: false };
  }
  if (!auth.token) return { saved: true, synced: false };
  try {
    const res = await fetchWithTimeout(fetchImpl, SETTINGS_API_URL, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { enabled: enabled === true } }),
    });
    if (!res.ok) return { saved: true, synced: false };
    const body = (await res.json().catch(() => null)) as { settings?: unknown; updatedAt?: unknown } | null;
    if (body?.settings) {
      await chrome.storage.local.set({
        [SETTINGS_CACHE_KEY]: {
          userId: auth.userId ?? 'unknown',
          settings: sanitizePlayerSettings(body.settings),
          updatedAt: typeof body.updatedAt === 'number' ? body.updatedAt : null,
          fetchedAt: Date.now(),
        } satisfies SettingsCache,
      });
    }
    return { saved: true, synced: true };
  } catch {
    return { saved: true, synced: false };
  }
}

/**
 * Background wiring: pull at start-up, on sign-in/sign-out, and every 15 minutes.
 */
export function installSettingsSync(fetchImpl: FetchLike = fetch): void {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  try {
    chrome.alarms?.create?.(SETTINGS_SYNC_ALARM, { periodInMinutes: SETTINGS_SYNC_PERIOD_MINUTES });
  } catch {
    // Alarms unavailable
  }
  chrome.alarms?.onAlarm?.addListener?.((alarm) => {
    if (alarm?.name === SETTINGS_SYNC_ALARM) void pullSettings(fetchImpl);
  });
  chrome.storage.onChanged?.addListener?.((changes, area) => {
    if (area !== 'local') return;
    if ('authToken' in changes) {
      const before = changes.authToken?.oldValue;
      const after = changes.authToken?.newValue;
      if (before !== after) void pullSettings(fetchImpl);
    }
  });
  chrome.runtime?.onMessage?.addListener?.((message, _sender, sendResponse) => {
    if (message?.type === 'pull_player_settings') {
      void pullSettings(fetchImpl).then((status) => sendResponse(status));
      return true;
    }
    return false;
  });
  void pullSettings(fetchImpl);
}

export { DEFAULT_PLAYER_SETTINGS };
