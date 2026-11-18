/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
/**
 * choices-screen.ts
 * Private "your call" prompt. Replaces automatic full-site lockouts from tilt
 * signals, and is what the walk-away number shows when it hits.
 *
 * Choices: Cash out / Lock half / Ping my buddy / Touch Grass 5 min / Keep playing (logged).
 * Nothing locks unless the player picks it.
 *
 * Privacy: the screen renders only on this device. The choice log is
 * chrome.storage.local, holds no amounts, game names, or balances, and is never sent.
 * A buddy ping carries only the trigger kind ('walk_away' or 'tilt'), nothing else.
 */

import { isTouchGrassActive, triggerTouchGrassTimeout } from './touch-grass-timeout.js';
import { triggerAutoVault, triggerCashoutNavigation } from './cashout-router.js';
import { recordActivityFeedEvent } from './activity-feed.js';
import { isBackendFeatureEnabled } from './config.js';

export const CHOICES_ROOT_ID = 'tiltcheck-choices-root';
export const CHOICE_LOG_KEY = 'tiltcheck_choice_log';
export const MAX_CHOICE_LOG_ENTRIES = 100;
/** Touch Grass the player picked: 5 minutes. */
export const TOUCH_GRASS_CHOICE_MS = 5 * 60_000;
/** Same trigger will not re-open the screen inside this window. */
export const CHOICES_REPEAT_COOLDOWN_MS = 3 * 60_000;
/**
 * Set by the background worker from GET /buddy/status (true only while the
 * player has at least one active buddy). Read here so the button only shows
 * when a ping can go somewhere.
 */
export const BUDDY_PAIRED_KEY = 'tiltcheck_buddy_paired';

let buddyPaired = false;
let buddySyncStarted = false;

/** "Ping my buddy" shows only with the backend feature on and an active pair. */
export function isBuddyPingAvailable(): boolean {
  return isBackendFeatureEnabled('buddyPing') && buddyPaired;
}

/**
 * Mirror the paired flag from chrome.storage.local into this bundle. Call once
 * at content-script boot (each bundle keeps its own copy). Safe to call again.
 */
export function syncBuddyPingAvailability(): void {
  if (buddySyncStarted) return;
  buddySyncStarted = true;
  try {
    void Promise.resolve(chrome.storage.local.get([BUDDY_PAIRED_KEY]))
      .then((res) => {
        buddyPaired = res?.[BUDDY_PAIRED_KEY] === true;
      })
      .catch(() => {});
    chrome.storage.onChanged?.addListener?.((changes, area) => {
      if (area === 'local' && BUDDY_PAIRED_KEY in changes) buddyPaired = changes[BUDDY_PAIRED_KEY]?.newValue === true;
    });
  } catch {
    // No extension context (tests, detached frames).
  }
}

export type ChoiceTrigger = 'walk_away_up' | 'walk_away_down' | 'tilt';
export type ChoiceId = 'cash_out' | 'lock_half' | 'ping_buddy' | 'touch_grass' | 'keep_playing' | 'dismissed';

export interface ChoiceLogEntry {
  ts: number;
  trigger: ChoiceTrigger;
  choice: ChoiceId;
  host: string;
}

export interface ChoicesScreenOptions {
  trigger: ChoiceTrigger;
  headline?: string;
  reason: string;
  /** Local-only amount for "Lock half". Return null to hide the button. */
  lockHalfAmount?: () => number | null;
  buddyPingAvailable?: boolean;
  onChoice?: (choice: ChoiceId) => void;
  now?: number;
}

const lastShownAt: Partial<Record<ChoiceTrigger, number>> = {};

export function resetChoicesScreenForTests(): void {
  buddyPaired = false;
  buddySyncStarted = false;
  for (const key of Object.keys(lastShownAt) as ChoiceTrigger[]) {
    delete lastShownAt[key];
  }
}

/**
 * Half the session profit when up; half the balance when not. Local only.
 */
export function computeLockHalfAmount(baseline: number | null, current: number | null): number | null {
  if (current === null || !Number.isFinite(current) || current <= 0) return null;
  const base = baseline !== null && Number.isFinite(baseline) && current > baseline ? current - baseline : current;
  const half = Math.floor((base / 2) * 100) / 100;
  return half >= 0.01 ? half : null;
}

/**
 * The only payload a buddy ping may carry. No amount, no game, no balance, no site.
 */
export function buildBuddyPingMessage(trigger: ChoiceTrigger): { type: 'buddy_ping'; reason: 'walk_away' | 'tilt' } {
  return { type: 'buddy_ping', reason: trigger === 'tilt' ? 'tilt' : 'walk_away' };
}

export function sanitizeChoiceLog(raw: unknown): ChoiceLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (e): e is ChoiceLogEntry =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as ChoiceLogEntry).ts === 'number' &&
        typeof (e as ChoiceLogEntry).trigger === 'string' &&
        typeof (e as ChoiceLogEntry).choice === 'string'
    )
    .map((e) => ({ ts: e.ts, trigger: e.trigger, choice: e.choice, host: typeof e.host === 'string' ? e.host : '' }))
    .slice(-MAX_CHOICE_LOG_ENTRIES);
}

export async function recordPrivateChoice(entry: ChoiceLogEntry): Promise<void> {
  try {
    const stored = await chrome.storage.local.get([CHOICE_LOG_KEY]);
    const log = sanitizeChoiceLog(stored[CHOICE_LOG_KEY]);
    log.push({ ts: entry.ts, trigger: entry.trigger, choice: entry.choice, host: entry.host });
    await chrome.storage.local.set({ [CHOICE_LOG_KEY]: log.slice(-MAX_CHOICE_LOG_ENTRIES) });
  } catch {
    // Storage unavailable in test harnesses without a mock.
  }
}

export async function getPrivateChoiceLog(): Promise<ChoiceLogEntry[]> {
  try {
    const stored = await chrome.storage.local.get([CHOICE_LOG_KEY]);
    return sanitizeChoiceLog(stored[CHOICE_LOG_KEY]);
  } catch {
    return [];
  }
}

const CHOICE_FEED_COPY: Record<ChoiceId, string> = {
  cash_out: 'Your call: you chose Cash out',
  lock_half: 'Your call: you chose Lock half',
  ping_buddy: 'Your call: you pinged your buddy',
  touch_grass: 'Your call: you chose Touch Grass 5 min',
  keep_playing: 'Your call: you kept playing (logged)',
  dismissed: 'Your call: prompt closed',
};

function injectStyles(root: HTMLElement): void {
  const style = document.createElement('style');
  style.textContent = `
    #${CHOICES_ROOT_ID} { position: fixed; inset: 0; z-index: 2147483646; display: flex; align-items: center; justify-content: center;
      background: rgba(5, 7, 10, 0.72); font-family: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace; }
    #${CHOICES_ROOT_ID} .tc-choices-card { background: #0f1115; border: 2px solid #17c3b2; border-radius: 8px; color: #fff;
      padding: 1.25rem 1.25rem 1rem; width: min(26rem, 92vw); box-sizing: border-box; box-shadow: 0 8px 32px rgba(0,0,0,0.85); }
    #${CHOICES_ROOT_ID} .tc-choices-eyebrow { font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: #17c3b2; font-weight: 800; }
    #${CHOICES_ROOT_ID} h2 { font-size: 1.05rem; margin: 0.35rem 0 0.5rem; }
    #${CHOICES_ROOT_ID} p { font-size: 0.82rem; line-height: 1.45; color: #cbd5e1; margin: 0 0 0.9rem; }
    #${CHOICES_ROOT_ID} .tc-choices-actions { display: flex; flex-direction: column; gap: 0.45rem; }
    #${CHOICES_ROOT_ID} button { font: inherit; font-size: 0.85rem; font-weight: 700; padding: 0.6rem 0.75rem; border-radius: 5px;
      border: 1px solid #283347; background: #161b24; color: #fff; cursor: pointer; text-align: left; }
    #${CHOICES_ROOT_ID} button[data-choice="cash_out"] { background: #17c3b2; color: #05070a; border-color: #17c3b2; }
    #${CHOICES_ROOT_ID} button[data-choice="keep_playing"] { color: #94a3b8; }
    #${CHOICES_ROOT_ID} button:focus-visible { outline: 2px solid #ffffff; outline-offset: 2px; }
    #${CHOICES_ROOT_ID} .tc-choices-foot { font-size: 0.68rem; color: #64748b; margin-top: 0.6rem; }
  `;
  root.appendChild(style);
}

export function isChoicesScreenOpen(doc: Document = document): boolean {
  return doc.getElementById(CHOICES_ROOT_ID) !== null;
}

/**
 * Show the private choices screen. Returns false when it is already open, a
 * Touch Grass pause is running, or the same trigger fired in the last few minutes.
 */
export function showChoicesScreen(doc: Document, opts: ChoicesScreenOptions): boolean {
  const now = opts.now ?? Date.now();
  if (isChoicesScreenOpen(doc) || isTouchGrassActive()) return false;
  const last = lastShownAt[opts.trigger];
  if (last !== undefined && now - last < CHOICES_REPEAT_COOLDOWN_MS) return false;
  lastShownAt[opts.trigger] = now;

  const host = doc.location?.hostname ?? '';
  const buddyAvailable = opts.buddyPingAvailable ?? isBuddyPingAvailable();
  const lockHalf = opts.lockHalfAmount?.() ?? null;

  const root = doc.createElement('div');
  root.id = CHOICES_ROOT_ID;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', `${CHOICES_ROOT_ID}-title`);
  injectStyles(root);

  const card = doc.createElement('div');
  card.className = 'tc-choices-card';

  const eyebrow = doc.createElement('div');
  eyebrow.className = 'tc-choices-eyebrow';
  eyebrow.textContent = 'Private. Only you see this.';

  const title = doc.createElement('h2');
  title.id = `${CHOICES_ROOT_ID}-title`;
  title.textContent = opts.headline ?? 'Your call.';

  const reason = doc.createElement('p');
  reason.textContent = opts.reason;

  const actions = doc.createElement('div');
  actions.className = 'tc-choices-actions';

  const foot = doc.createElement('div');
  foot.className = 'tc-choices-foot';
  foot.textContent = 'Made for Degens. By Degens.';

  let closed = false;
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      finish('dismissed');
    }
  };

  function close(): void {
    closed = true;
    doc.removeEventListener('keydown', onKeydown, true);
    root.remove();
  }

  function finish(choice: ChoiceId): void {
    if (closed) return;
    void recordPrivateChoice({ ts: Date.now(), trigger: opts.trigger, choice, host });
    void recordActivityFeedEvent(CHOICE_FEED_COPY[choice], choice === 'keep_playing' ? 'warn' : 'info');
    opts.onChoice?.(choice);
    close();
  }

  const add = (choice: ChoiceId, label: string, action: () => void) => {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.dataset.choice = choice;
    btn.textContent = label;
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    });
    actions.appendChild(btn);
    return btn;
  };

  const first = add('cash_out', 'Cash out', () => {
    finish('cash_out');
    triggerCashoutNavigation(doc);
  });

  if (lockHalf !== null) {
    add('lock_half', 'Lock half', () => {
      finish('lock_half');
      void triggerAutoVault(lockHalf, 'usd', doc).then((res) => {
        if (!res.vaulted) {
          // No vault on this site (or it failed): send them to the cashier instead.
          triggerCashoutNavigation(doc);
        }
      });
    });
  }

  if (buddyAvailable) {
    add('ping_buddy', 'Ping my buddy', () => {
      try {
        // Only buildBuddyPingMessage() goes out: { type, reason }. No amounts.
        chrome.runtime?.sendMessage?.(buildBuddyPingMessage(opts.trigger));
      } catch {
        // Extension context gone; the choice is still logged.
      }
      finish('ping_buddy');
    });
  }

  add('touch_grass', 'Touch Grass 5 min', () => {
    finish('touch_grass');
    triggerTouchGrassTimeout('You picked a 5-minute break. Respect.', TOUCH_GRASS_CHOICE_MS);
  });

  add('keep_playing', 'Keep playing (logged)', () => {
    finish('keep_playing');
  });

  card.append(eyebrow, title, reason, actions, foot);
  root.appendChild(card);
  (doc.body ?? doc.documentElement).appendChild(root);
  doc.addEventListener('keydown', onKeydown, true);
  try {
    first.focus();
  } catch {
    // Focus can fail in detached test documents.
  }
  return true;
}
