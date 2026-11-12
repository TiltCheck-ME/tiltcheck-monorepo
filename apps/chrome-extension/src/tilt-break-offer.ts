/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 */
/**
 * tilt-break-offer.ts
 * In-page "want a break?" offer on the casino tab when the tilt score crosses the player's
 * trigger score. It only ASKS. Same pattern as the site's "No take-backs" confirmation:
 * - the lock button stays disabled until the first-person checkbox is ticked, and is
 *   re-checked on click;
 * - "Not now" (or Esc) closes it without locking and starts the 30-minute quiet period;
 * - role="dialog" + aria-modal, focus starts on the checkbox, Tab stays inside, focus goes
 *   back where it was on close.
 * The dialog lives in a closed shadow root so the casino page's own scripts and CSS can't
 * reach in and tick or click it.
 */

import {
  executeTiltAutoLock,
  loadTiltOfferContext,
  recordTiltOfferDismissal,
  shouldOfferTiltBreak,
  type TiltOfferDismissal,
  type TriggerAutoLockResult,
} from './tilt-auto-lock.js';

export const TILT_OFFER_COPY = Object.freeze({
  title: 'This is going sideways.',
  body: "Tilt score's at {score}. The next spin doesn't know you're due. Want to sit out for {length}?",
  fine: 'Deposit buttons stay grey until {end}. No cancel, no early exit. You can make it longer. That\u2019s it.',
  check: "I know I'm the one choosing this, and I can't undo it.",
  go: 'Lock me out for {length}',
  notNow: 'Not now',
});

export const TILT_OFFER_HOST_ID = 'tiltcheck-tilt-break-offer';

export type TiltOfferChoice = 'accepted' | 'dismissed';

export interface TiltOfferHandle {
  /** Resolves once with the player's choice. */
  result: Promise<TiltOfferChoice>;
  /** The dialog's shadow root (closed to the page; exposed here for tests). */
  root: ShadowRoot;
  host: HTMLElement;
  close(): void;
}

/** "1 hour", "12 hours", "1 day", "3 days". */
export function formatBreakLength(seconds: number): string {
  const hours = Math.max(1, Math.round(seconds / 3600));
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

function formatEnd(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return new Date(ms).toString();
  }
}

const STYLES = `
:host { all: initial; }
.backdrop { position: fixed; inset: 0; background: rgba(4,6,10,0.72); z-index: 2147483646; }
.box { position: fixed; z-index: 2147483647; left: 50%; top: 50%; transform: translate(-50%,-50%);
  width: min(380px, calc(100vw - 32px)); box-sizing: border-box; padding: 20px;
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  background: #0b0f15; color: #f8fafc; border: 1px solid rgba(23,195,178,0.45); border-radius: 12px;
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.45;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
h2 { margin: 0 0 8px; font-size: 18px; font-weight: 800; color: #17c3b2; }
p { margin: 0 0 10px; }
.fine { color: #94a3b8; font-size: 12px; }
label { display: flex; gap: 10px; align-items: flex-start; min-height: 48px; padding: 8px 0; cursor: pointer; font-weight: 600; }
input { width: 20px; height: 20px; margin: 2px 0 0; flex: none; accent-color: #17c3b2; }
.actions { display: flex; gap: 10px; margin-top: 6px; }
button { flex: 1; min-height: 48px; border-radius: 8px; font: inherit; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.15); }
.not-now { background: transparent; color: #f8fafc; }
.go { background: #17c3b2; color: #04110f; border-color: #17c3b2; }
.go[disabled] { opacity: 0.45; cursor: not-allowed; }
button:focus-visible, input:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
`;

let openHandle: TiltOfferHandle | null = null;

export function isTiltOfferOpen(): boolean {
  return openHandle !== null;
}

/**
 * Shows the offer. Nothing is locked here; the caller acts on the result.
 */
export function showTiltBreakOffer(params: {
  tiltRisk: number;
  durationSec: number;
  now?: number;
  doc?: Document;
}): TiltOfferHandle {
  const doc = params.doc ?? document;
  if (openHandle) openHandle.close();

  const length = formatBreakLength(params.durationSec);
  const endMs = (params.now ?? Date.now()) + params.durationSec * 1000;
  const c = TILT_OFFER_COPY;

  const host = doc.createElement('div');
  host.id = TILT_OFFER_HOST_ID;
  const root = host.attachShadow({ mode: 'closed' });

  const style = doc.createElement('style');
  style.textContent = STYLES;
  const backdrop = doc.createElement('div');
  backdrop.className = 'backdrop';

  const box = doc.createElement('div');
  box.className = 'box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'tc-offer-title');
  box.setAttribute('aria-describedby', 'tc-offer-body tc-offer-fine');
  box.tabIndex = -1;

  const title = doc.createElement('h2');
  title.id = 'tc-offer-title';
  title.textContent = c.title;
  const body = doc.createElement('p');
  body.id = 'tc-offer-body';
  body.textContent = c.body.replace('{score}', `${Math.round(params.tiltRisk)}/100`).replace('{length}', length);
  const fine = doc.createElement('p');
  fine.id = 'tc-offer-fine';
  fine.className = 'fine';
  fine.textContent = c.fine.replace('{end}', formatEnd(endMs));

  const label = doc.createElement('label');
  const check = doc.createElement('input');
  check.type = 'checkbox';
  check.id = 'tc-offer-check';
  const checkText = doc.createElement('span');
  checkText.textContent = c.check;
  label.append(check, checkText);

  const actions = doc.createElement('div');
  actions.className = 'actions';
  const notNow = doc.createElement('button');
  notNow.type = 'button';
  notNow.className = 'not-now';
  notNow.id = 'tc-offer-not-now';
  notNow.textContent = c.notNow;
  const go = doc.createElement('button');
  go.type = 'button';
  go.className = 'go';
  go.id = 'tc-offer-go';
  go.textContent = c.go.replace('{length}', length);
  actions.append(notNow, go);

  box.append(title, body, fine, label, actions);
  root.append(style, backdrop, box);

  const sync = () => {
    go.disabled = !check.checked;
    go.setAttribute('aria-disabled', check.checked ? 'false' : 'true');
  };
  sync();

  const opener = doc.activeElement as HTMLElement | null;
  let resolveFn: (v: TiltOfferChoice) => void = () => {};
  const result = new Promise<TiltOfferChoice>((r) => { resolveFn = r; });
  let done = false;

  const finish = (choice: TiltOfferChoice) => {
    if (done) return;
    done = true;
    doc.removeEventListener('keydown', onKey, true);
    host.remove();
    if (openHandle === handle) openHandle = null;
    try { opener?.focus?.(); } catch { /* ignore */ }
    resolveFn(choice);
  };

  const focusables = () => [check, notNow, go].filter((n) => !(n as HTMLButtonElement).disabled) as HTMLElement[];

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      e.stopPropagation();
      finish('dismissed');
      return;
    }
    if (e.key === 'Tab') {
      const f = focusables();
      const active = root.activeElement as HTMLElement | null;
      e.preventDefault();
      e.stopPropagation();
      const i = active ? f.indexOf(active) : -1;
      const next = e.shiftKey ? (i <= 0 ? f[f.length - 1] : f[i - 1]) : (i < 0 || i === f.length - 1 ? f[0] : f[i + 1]);
      next?.focus();
    }
  }

  check.addEventListener('change', sync);
  check.addEventListener('click', () => setTimeout(sync, 0));
  notNow.addEventListener('click', () => finish('dismissed'));
  go.addEventListener('click', () => {
    // Belt and braces: never lock without the box ticked, even if `disabled` was stripped.
    if (!check.checked) { sync(); return; }
    finish('accepted');
  });
  doc.addEventListener('keydown', onKey, true);

  (doc.body ?? doc.documentElement).appendChild(host);
  setTimeout(() => { try { check.focus(); } catch { /* ignore */ } }, 0);

  const handle: TiltOfferHandle = {
    result,
    root,
    host,
    close: () => finish('dismissed'),
  };
  openHandle = handle;
  return handle;
}

export type TiltOfferOutcome =
  | { outcome: 'not_offered' }
  | { outcome: 'dismissed'; dismissal: TiltOfferDismissal }
  | { outcome: 'accepted'; lock: TriggerAutoLockResult };

let inFlight = false;

/**
 * Called on every tilt tick. Shows the offer when the rules allow it, and starts the lock
 * only if the player ticks the box and presses the button.
 * `onShown` lets tests (and callers) get the handle while the offer is waiting.
 */
export async function maybeOfferTiltBreak(params: {
  tiltRisk: number;
  indicators?: string[];
  doc?: Document;
  now?: () => number;
  onShown?: (h: TiltOfferHandle) => void;
}): Promise<TiltOfferOutcome> {
  if (inFlight || openHandle) return { outcome: 'not_offered' };
  inFlight = true;
  try {
    const clock = params.now ?? Date.now;
    const ctx = await loadTiltOfferContext();
    const offer = shouldOfferTiltBreak({
      tiltRisk: params.tiltRisk,
      threshold: ctx.threshold,
      autoLockEnabled: ctx.enabled,
      cooldownActiveUntil: ctx.cooldownActiveUntil,
      lastDismissal: ctx.lastDismissal,
      offerOpen: openHandle !== null,
      now: clock(),
    });
    if (!offer) return { outcome: 'not_offered' };

    const handle = showTiltBreakOffer({
      tiltRisk: params.tiltRisk,
      durationSec: ctx.duration,
      now: clock(),
      doc: params.doc,
    });
    params.onShown?.(handle);
    const choice = await handle.result;

    if (choice === 'accepted') {
      const lock = await executeTiltAutoLock({
        confirmed: true,
        tiltRisk: params.tiltRisk,
        wallet: ctx.wallet,
        indicators: params.indicators,
        duration: ctx.duration,
        openPrompt: false,
        now: clock(),
      });
      return { outcome: 'accepted', lock };
    }

    const dismissal = { at: clock(), score: params.tiltRisk };
    await recordTiltOfferDismissal(dismissal);
    return { outcome: 'dismissed', dismissal };
  } finally {
    inFlight = false;
  }
}
