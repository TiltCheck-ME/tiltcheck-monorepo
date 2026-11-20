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
 * - Counts live in chrome.storage.local. At most once a day, an opted-in
 *   install POSTs them to the collectclock-api worker's /beta/counts route
 *   (BACKEND_FEATURES.betaTelemetry + BETA_TELEMETRY_ENDPOINT in config.ts).
 *   The body matches the worker contract (workers/collectclock-api/src/beta.js):
 *   { schema: 1, version, day, counts }, JSON, <= 1 KB. A 400 drops the batch;
 *   a 429, server or network error retries later with backoff.
 */

import {
  BETA_TELEMETRY_ENDPOINT,
  BETA_UNINSTALL_URL,
  getWorkerEndpoint,
  isBackendFeatureEnabled,
} from './config.js';

export const BETA_TELEMETRY_OPT_IN_KEY = 'tiltcheck_beta_telemetry_opt_in';
export const BETA_TELEMETRY_COUNTS_KEY = 'tiltcheck_beta_telemetry_counts';
export const BETA_TELEMETRY_LAST_SENT_KEY = 'tiltcheck_beta_telemetry_last_sent';
export const BETA_TELEMETRY_INSTALL_COUNTED_KEY = 'tiltcheck_beta_telemetry_install_counted';
/** { at: number, attempts: number }: no send before `at` after a 429 or network error. */
export const BETA_TELEMETRY_RETRY_KEY = 'tiltcheck_beta_telemetry_retry';

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
/** Worker limits (workers/collectclock-api/src/beta.js). */
export const BETA_MAX_BATCH_COUNT = 10_000;
export const BETA_MAX_BODY_BYTES = 1024;
const VERSION_RE = /^(?:\d{1,4}(?:\.\d{1,4}){0,3}|unknown)$/;
/** Retry after a 429 or network error: 1h, 2h, 4h ... capped at a day. */
export const BETA_RETRY_BASE_MS = 60 * 60 * 1000;
export const BETA_RETRY_MAX_MS = 24 * 60 * 60 * 1000;
const BETA_REQUEST_HEADERS = Object.freeze({ 'Content-Type': 'application/json' });

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
    // The worker accepts 1-4 dot-separated numbers (up to 4 digits each) or "unknown".
    return typeof v === 'string' && v.length <= 20 && VERSION_RE.test(v) ? v : 'unknown';
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

/** Counts for one batch: known events, whole numbers 1..BETA_MAX_BATCH_COUNT (the rest waits for the next batch). */
function batchCounts(counts: BetaCounts): BetaCounts {
  const out: BetaCounts = {};
  for (const [name, n] of Object.entries(sanitizeBetaCounts(counts)) as [BetaEvent, number][]) {
    out[name] = Math.min(n, BETA_MAX_BATCH_COUNT);
  }
  return out;
}

export function buildBetaPayload(counts: BetaCounts, now: Date = new Date()): BetaTelemetryPayload {
  return {
    schema: 1,
    version: extensionVersion(),
    day: now.toISOString().slice(0, 10),
    counts: batchCounts(counts),
  };
}

export function isBetaSenderConfigured(): boolean {
  return isBackendFeatureEnabled('betaTelemetry') && BETA_TELEMETRY_ENDPOINT.trim() !== '';
}

function resolveEndpoint(): string {
  const raw = BETA_TELEMETRY_ENDPOINT.trim();
  return /^https:\/\//i.test(raw) ? raw : getWorkerEndpoint(raw);
}

function readRetry(raw: unknown): { at: number; attempts: number } {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const at = typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : 0;
  const attempts = typeof r.attempts === 'number' && Number.isFinite(r.attempts) ? Math.max(0, Math.floor(r.attempts)) : 0;
  return { at, attempts };
}

/** The live route answers { ok: true }; any other worker path answers 200 with its health JSON, so check the body. */
async function isAccepted(res: Response): Promise<boolean> {
  if (!res.ok) return false;
  try {
    const body = (await res.json()) as Record<string, unknown> | null;
    return !!body && body.ok === true && !('service' in body);
  } catch {
    return false;
  }
}

export type BetaFlushResult =
  | 'opted-out'
  | 'not-configured'
  | 'too-soon'
  | 'backing-off'
  | 'empty'
  | 'sent'
  | 'dropped'
  | 'failed';

/**
 * Send the batch at most once a day. Makes no network call unless the user
 * opted in and the backend flag and endpoint are both set, and never sends an
 * empty batch. 2xx { ok: true } subtracts what was sent; 400 (or a body the
 * worker would refuse) drops the batch; 429, other errors and network failures
 * keep the counts and wait 1h, 2h, 4h ... (max a day) before trying again.
 */
export async function flushBetaTelemetry(now: number = Date.now()): Promise<BetaFlushResult> {
  if (!(await isBetaTelemetryOptedIn())) return 'opted-out';
  if (!isBetaSenderConfigured()) return 'not-configured';
  const stored = await readStore([BETA_TELEMETRY_LAST_SENT_KEY, BETA_TELEMETRY_RETRY_KEY]);
  const last = typeof stored[BETA_TELEMETRY_LAST_SENT_KEY] === 'number' ? (stored[BETA_TELEMETRY_LAST_SENT_KEY] as number) : 0;
  if (now - last < BETA_SEND_INTERVAL_MS) return 'too-soon';
  const retry = readRetry(stored[BETA_TELEMETRY_RETRY_KEY]);
  if (now < retry.at) return 'backing-off';
  const counts = await getBetaCounts();
  if (Object.keys(counts).length === 0) return 'empty';

  const payload = buildBetaPayload(counts, new Date(now));
  const sent = payload.counts;
  const body = JSON.stringify(payload);

  // Forget the sent batch: subtract it so counts recorded meanwhile are kept.
  const settle = async () => {
    queue = queue.then(async () => {
      const current = await getBetaCounts();
      for (const [name, n] of Object.entries(sent) as [BetaEvent, number][]) {
        const left = (current[name] ?? 0) - n;
        if (left > 0) current[name] = left;
        else delete current[name];
      }
      await writeStore({
        [BETA_TELEMETRY_COUNTS_KEY]: current,
        [BETA_TELEMETRY_LAST_SENT_KEY]: now,
        [BETA_TELEMETRY_RETRY_KEY]: { at: 0, attempts: 0 },
      });
    }).catch(() => undefined);
    await queue;
  };

  if (Object.keys(sent).length === 0) return 'empty';
  if (new TextEncoder().encode(body).byteLength > BETA_MAX_BODY_BYTES) {
    await settle();
    return 'dropped';
  }

  const backOff = async () => {
    const attempts = retry.attempts + 1;
    const wait = Math.min(BETA_RETRY_BASE_MS * 2 ** (attempts - 1), BETA_RETRY_MAX_MS);
    await writeStore({ [BETA_TELEMETRY_RETRY_KEY]: { at: now + wait, attempts } });
  };

  let res: Response;
  try {
    res = await fetch(resolveEndpoint(), {
      method: 'POST',
      headers: BETA_REQUEST_HEADERS,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      body,
    });
  } catch {
    await backOff();
    return 'failed';
  }
  if (res.status === 400) {
    // The worker refused this batch; resending it would fail the same way.
    await settle();
    return 'dropped';
  }
  if (!(await isAccepted(res))) {
    await backOff();
    return 'failed';
  }
  await settle();
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
      [BETA_TELEMETRY_RETRY_KEY]: { at: 0, attempts: 0 },
    });
  }
  applyUninstallUrl(optedIn);
}
