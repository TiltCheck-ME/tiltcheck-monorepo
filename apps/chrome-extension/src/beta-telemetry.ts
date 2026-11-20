/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-19 */

/**
 * beta-telemetry.ts
 * Opt-in, anonymous beta counts.
 *
 * - OFF by default. Nothing is counted or stored until the user switches the
 *   opt-in toggle on in Settings. Switching it off deletes the local counts.
 * - Only whole-number counters for a fixed list of event names. No user id,
 *   install id, wallet address, username, URL, casino, game, or bet amount is
 *   ever recorded: recordBetaEvent() takes an event name and nothing else.
 * - Counts live in chrome.storage.local. The sender is a stub until a backend
 *   exists: it makes no network call unless BACKEND_FEATURES.betaTelemetry is
 *   on AND BETA_TELEMETRY_ENDPOINT is set (see config.ts).
 */

import {
  BETA_TELEMETRY_ENDPOINT,
  BETA_UNINSTALL_URL,
  TELEMETRY_REQUEST_HEADERS,
  getHubEndpoint,
  isBackendFeatureEnabled,
} from './config.js';

export const BETA_TELEMETRY_OPT_IN_KEY = 'tiltcheck_beta_telemetry_opt_in';
export const BETA_TELEMETRY_COUNTS_KEY = 'tiltcheck_beta_telemetry_counts';
export const BETA_TELEMETRY_LAST_SENT_KEY = 'tiltcheck_beta_telemetry_last_sent';
export const BETA_TELEMETRY_INSTALL_COUNTED_KEY = 'tiltcheck_beta_telemetry_install_counted';

/** The only events that can ever be counted. */
export const BETA_EVENTS = [
  /** Counted once per browser profile, the first time the user opts in. */
  'install',
  /** A nudge toast or warning was shown (heater, chase, cash-out goal, profit floor). */
  'nudge_shown',
  /** A Touch Grass break started. */
  'break_taken',
  /** Keep the Win blocked a cancel/reverse-cashout click. */
  'keep_win_hold',
  /** TiltCheck sent the user to the casino cashier (one-click cash-out). */
  'cash_out',
  /** A question was asked through Ask. Reserved: the extension has no Ask surface yet. */
  'ask_question',
  /** The user switched off a protection in Settings. Reserved: not wired yet (see PR). */
  'protection_turned_off',
] as const;

export type BetaEvent = (typeof BETA_EVENTS)[number];
export type BetaCounts = Partial<Record<BetaEvent, number>>;

export const BETA_SEND_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_COUNT = 1_000_000;

function isBetaEvent(name: unknown): name is BetaEvent {
  return typeof name === 'string' && (BETA_EVENTS as readonly string[]).includes(name);
}

function storageArea(): chrome.storage.LocalStorageArea | null {
  try {
    return typeof chrome !== 'undefined' && chrome?.storage?.local ? chrome.storage.local : null;
  } catch {
    return null;
  }
}

async function readStore(keys: string[]): Promise<Record<string, unknown>> {
  const area = storageArea();
  if (!area) return {};
  try {
    const result = await area.get(keys);
    return result && typeof result === 'object' ? (result as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function writeStore(items: Record<string, unknown>): Promise<void> {
  const area = storageArea();
  if (!area) return;
  try {
    await area.set(items);
  } catch {
    /* storage unavailable: drop silently, counts are best-effort */
  }
}

/** Keep only known event names with whole, non-negative counts. */
export function sanitizeBetaCounts(raw: unknown): BetaCounts {
  const out: BetaCounts = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isBetaEvent(name)) continue;
    const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
    if (n > 0) out[name] = Math.min(n, MAX_COUNT);
  }
  return out;
}

export async function isBetaTelemetryOptedIn(): Promise<boolean> {
  const stored = await readStore([BETA_TELEMETRY_OPT_IN_KEY]);
  return stored[BETA_TELEMETRY_OPT_IN_KEY] === true;
}

export async function getBetaCounts(): Promise<BetaCounts> {
  const stored = await readStore([BETA_TELEMETRY_COUNTS_KEY]);
  return sanitizeBetaCounts(stored[BETA_TELEMETRY_COUNTS_KEY]);
}

// Serialize increments inside one context so quick bursts do not drop counts.
let queue: Promise<void> = Promise.resolve();

/**
 * Add one to an event's count. Does nothing unless the user opted in.
 * Takes only the event name, so no other data can ride along.
 */
export function recordBetaEvent(event: BetaEvent): Promise<void> {
  if (!isBetaEvent(event)) return Promise.resolve();
  queue = queue
    .then(async () => {
      if (!(await isBetaTelemetryOptedIn())) return;
      const counts = await getBetaCounts();
      counts[event] = Math.min((counts[event] ?? 0) + 1, MAX_COUNT);
      await writeStore({ [BETA_TELEMETRY_COUNTS_KEY]: counts });
    })
    .catch(() => undefined);
  return queue;
}

/** Fire-and-forget wrapper for call sites in guards and overlays. */
export function countBetaEvent(event: BetaEvent): void {
  void recordBetaEvent(event);
}

function extensionVersion(): string {
  try {
    const v = chrome?.runtime?.getManifest?.()?.version;
    return typeof v === 'string' ? v.slice(0, 20) : 'unknown';
  } catch {
    return 'unknown';
  }
}

export interface BetaTelemetryPayload {
  schema: 1;
  /** Extension version, so counts can be split by beta build. Not an identifier. */
  version: string;
  /** UTC day the batch was sent, YYYY-MM-DD. No time of day. */
  day: string;
  counts: BetaCounts;
}

export function buildBetaPayload(counts: BetaCounts, now: Date = new Date()): BetaTelemetryPayload {
  return {
    schema: 1,
    version: extensionVersion(),
    day: now.toISOString().slice(0, 10),
    counts: sanitizeBetaCounts(counts),
  };
}

export function isBetaSenderConfigured(): boolean {
  return isBackendFeatureEnabled('betaTelemetry') && BETA_TELEMETRY_ENDPOINT.trim() !== '';
}

function resolveEndpoint(): string {
  const raw = BETA_TELEMETRY_ENDPOINT.trim();
  return /^https:\/\//i.test(raw) ? raw : getHubEndpoint(raw);
}

/**
 * Send the batch at most once a day. Stubbed: returns 'not-configured' with no
 * network call until the backend flag and endpoint are both set.
 */
export async function flushBetaTelemetry(
  now: number = Date.now(),
): Promise<'opted-out' | 'not-configured' | 'too-soon' | 'empty' | 'sent' | 'failed'> {
  if (!(await isBetaTelemetryOptedIn())) return 'opted-out';
  if (!isBetaSenderConfigured()) return 'not-configured';
  const stored = await readStore([BETA_TELEMETRY_LAST_SENT_KEY]);
  const last = typeof stored[BETA_TELEMETRY_LAST_SENT_KEY] === 'number' ? (stored[BETA_TELEMETRY_LAST_SENT_KEY] as number) : 0;
  if (now - last < BETA_SEND_INTERVAL_MS) return 'too-soon';
  const counts = await getBetaCounts();
  if (Object.keys(counts).length === 0) return 'empty';
  try {
    const res = await fetch(resolveEndpoint(), {
      method: 'POST',
      headers: TELEMETRY_REQUEST_HEADERS,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(buildBetaPayload(counts, new Date(now))),
    });
    if (!res.ok) return 'failed';
  } catch {
    return 'failed';
  }
  // Subtract what was sent so counts recorded during the request are kept.
  queue = queue.then(async () => {
    const current = await getBetaCounts();
    for (const [name, sent] of Object.entries(counts) as [BetaEvent, number][]) {
      const left = (current[name] ?? 0) - sent;
      if (left > 0) current[name] = left;
      else delete current[name];
    }
    await writeStore({ [BETA_TELEMETRY_COUNTS_KEY]: current, [BETA_TELEMETRY_LAST_SENT_KEY]: now });
  }).catch(() => undefined);
  await queue;
  return 'sent';
}

function applyUninstallUrl(optedIn: boolean): void {
  try {
    if (!chrome?.runtime?.setUninstallURL) return;
    const base = BETA_UNINSTALL_URL.trim();
    if (!optedIn || !base || !/^https:\/\//i.test(base)) {
      void chrome.runtime.setUninstallURL('');
      return;
    }
    const url = new URL(base);
    url.searchParams.set('v', extensionVersion());
    void chrome.runtime.setUninstallURL(url.toString());
  } catch {
    /* not available in this context */
  }
}

/**
 * Switch the opt-in. Turning it on counts this install once. Turning it off
 * deletes every local count and the send timestamp.
 */
export async function setBetaTelemetryOptIn(optedIn: boolean): Promise<void> {
  if (optedIn) {
    const stored = await readStore([BETA_TELEMETRY_INSTALL_COUNTED_KEY]);
    await writeStore({ [BETA_TELEMETRY_OPT_IN_KEY]: true });
    if (stored[BETA_TELEMETRY_INSTALL_COUNTED_KEY] !== true) {
      await recordBetaEvent('install');
      await writeStore({ [BETA_TELEMETRY_INSTALL_COUNTED_KEY]: true });
    }
  } else {
    await writeStore({
      [BETA_TELEMETRY_OPT_IN_KEY]: false,
      [BETA_TELEMETRY_COUNTS_KEY]: {},
      [BETA_TELEMETRY_LAST_SENT_KEY]: 0,
    });
  }
  applyUninstallUrl(optedIn);
}
