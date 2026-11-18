/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 */
/**
 * reverse-withdrawal-shield.ts
 * Redemption guard (PocketCheck).
 *
 * Casinos stall redemptions hoping the player hits "Cancel Withdrawal" /
 * "Cancel Redemption" and plays the money back. On supported casinos this
 * intercepts that click with a confirm step ("This is money you already won.
 * Reverse it?") and a 10-second hold before the reverse goes through.
 * The player still decides; nothing is permanently disabled.
 *
 * Each guard event is logged privately in chrome.storage.local (time, site,
 * outcome). No amounts. Never sent anywhere.
 *
 * Non-custodial: operates entirely client-side with zero custody of player funds.
 */

export const TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY =
  'tiltcheck_reverse_withdrawal_shield_enabled';

export const GUARD_DIALOG_ID = 'tiltcheck-redemption-guard';
export const REDEMPTION_GUARD_LOG_KEY = 'tiltcheck_redemption_guard_log';
export const MAX_REDEMPTION_GUARD_LOG_ENTRIES = 100;
/** How long "Reverse it" stays disabled after the confirm step opens. */
export const REDEMPTION_HOLD_MS = 10_000;
export const REDEMPTION_GUARD_QUESTION = 'This is money you already won. Reverse it?';

export type RedemptionGuardOutcome = 'kept' | 'reversed';

export interface RedemptionGuardLogEntry {
  ts: number;
  host: string;
  outcome: RedemptionGuardOutcome;
}

export const CANCEL_WITHDRAWAL_SELECTORS: readonly string[] = [
  '[data-test*="cancel-withdrawal"]',
  '[data-testid*="cancel-withdrawal"]',
  '[data-test*="cancel-payout"]',
  '[data-testid*="cancel-payout"]',
  '[data-test*="reverse-withdrawal"]',
  '[data-testid*="reverse-withdrawal"]',
  '[data-action*="cancel-withdrawal"]',
  '[data-action*="cancel-cashout"]',
  '[data-action*="cancel-redemption"]',
  '[data-testid*="cancel-redemption"]',
  '[data-test*="cancel-redemption"]',
  '.cancel-withdrawal-btn',
  '.reverse-withdrawal-btn',
  '.pending-withdrawal-cancel',
  '.transaction-cancel-btn',
  'button[name="cancelWithdrawal"]',
  'button[name="reverseWithdrawal"]',
  'a[href*="cancel-withdrawal"]',
  'a[href*="cancel-cashout"]',
  'a[href*="cancel-redemption"]',
];

const EXPLICIT_TEXT_REGEX =
  /\b(cancel\s+withdrawal|reverse\s+withdrawal|cancel\s+cashout|cancel\s+payout|cancel\s+redemption|reverse\s+cashout|cancel\s+pending|reclaim\s+funds|cancelar\s+retirada|cancelar\s+retiro|annuler\s+le\s+retrait|auszahlung\s+stornieren)\b/i;

const SLUG_REGEX =
  /(cancel[-_]withdrawal|reverse[-_]withdrawal|cancel[-_]cashout|cancel[-_]payout|cancel[-_]redemption|reverse[-_]cashout|cancel[-_]pending)/i;

const GENERIC_CANCEL_TEXT_REGEX =
  /\b(cancel|reverse|stornieren|annuler|cancelar|reclaim)\b/i;

const PENDING_CONTEXT_REGEX =
  /\b(pending|processing|under\s+review|in\s+review|requested|submitted|en\s+attente|ausstehend|pendiente)\b/i;

const WITHDRAWAL_CONTEXT_REGEX =
  /\b(withdraw|withdrawal|cashout|payout|redemption|retrait|auszahlung|retirada|retiro)\b/i;

const EXCLUDED_MODAL_REGEX =
  /\b(close|dismiss|back|exit|settings|profile|avatar|password|2fa|login|register)\b/i;

let inMemoryShieldEnabled = true;

export function isReverseWithdrawalShieldEnabled(): boolean {
  return inMemoryShieldEnabled;
}

export function setInMemoryShieldEnabled(enabled: boolean): void {
  inMemoryShieldEnabled = enabled;
}

export async function setReverseWithdrawalShieldEnabled(enabled: boolean): Promise<void> {
  inMemoryShieldEnabled = enabled;
  try {
    await chrome.storage.local.set({
      [TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY]: inMemoryShieldEnabled,
    });
  } catch {
    // Storage unavailable in test harnesses without mock
  }
}

export async function loadReverseWithdrawalShieldEnabled(): Promise<boolean> {
  try {
    const stored = await chrome.storage.local.get([
      TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY,
    ]);
    const val = stored[TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY];
    if (typeof val === 'boolean') {
      inMemoryShieldEnabled = val;
    }
  } catch {
    // Ignore storage failure
  }
  return inMemoryShieldEnabled;
}

/**
 * Evaluates whether a DOM element is a reverse-withdrawal trigger.
 */
export function isCancelWithdrawalTarget(target: Element): boolean {
  const container =
    target.closest(
      'button, a, [role="button"], input[type="submit"], input[type="button"], ' +
        CANCEL_WITHDRAWAL_SELECTORS.join(', ')
    ) ?? target;

  if (container.closest(`#${GUARD_DIALOG_ID}`)) {
    return false;
  }

  const text = (container.textContent ?? '').trim();
  const textLower = text.toLowerCase();
  if (textLower.includes('shield') || textLower.includes('tiltcheck')) {
    return false;
  }

  // 1. Selector match
  for (const selector of CANCEL_WITHDRAWAL_SELECTORS) {
    try {
      if (container.matches(selector) || container.querySelector(selector) !== null) {
        return true;
      }
    } catch {
      // Ignore
    }
  }

  // 2. Direct attribute checks (data-action, data-test, data-testid, aria-label, title, href, name)
  const attrsToCheck = [
    container.getAttribute('data-action'),
    container.getAttribute('data-test'),
    container.getAttribute('data-testid'),
    container.getAttribute('aria-label'),
    container.getAttribute('title'),
    container.getAttribute('href'),
    container.getAttribute('name'),
  ];
  for (const attr of attrsToCheck) {
    if (attr && (EXPLICIT_TEXT_REGEX.test(attr) || SLUG_REGEX.test(attr))) {
      return true;
    }
  }

  // 3. Normalized href on anchor elements
  const hrefAttr = container.getAttribute('href') || (container as HTMLAnchorElement).href;
  if (hrefAttr && SLUG_REGEX.test(hrefAttr)) {
    return true;
  }

  // 4. Explicit text pattern match
  if (EXPLICIT_TEXT_REGEX.test(text) || SLUG_REGEX.test(text)) {
    return true;
  }

  // 5. Contextual match: Generic "Cancel" or "Reverse" in a pending withdrawal container
  if (GENERIC_CANCEL_TEXT_REGEX.test(text)) {
    // Look up to 4 levels or to table row/card
    const contextEl =
      container.closest('tr, [role="row"], .transaction, .withdrawal-item, .pending-item, li, article') ??
      container.parentElement?.parentElement ??
      container.parentElement;

    if (contextEl) {
      const contextText = (contextEl.textContent ?? '').trim();
      const hasPending = PENDING_CONTEXT_REGEX.test(contextText);
      const hasWithdrawal = WITHDRAWAL_CONTEXT_REGEX.test(contextText);
      const isExcluded = EXCLUDED_MODAL_REGEX.test(contextText);

      if (hasPending && hasWithdrawal && !isExcluded) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Tags a reverse-withdrawal control so the player can see it is guarded.
 * The control stays clickable; the click goes through the confirm step.
 */
export function markGuardedCancelElement(el: Element): void {
  if (el.getAttribute('data-tiltcheck-shield') === 'guarded') {
    return;
  }
  el.setAttribute('data-tiltcheck-shield', 'guarded');
  el.setAttribute(
    'title',
    'TiltCheck Keep the Win: reversing this cashout takes a confirm and a 10-second hold.'
  );
}

export async function recordRedemptionGuardEvent(entry: RedemptionGuardLogEntry): Promise<void> {
  try {
    const stored = await chrome.storage.local.get([REDEMPTION_GUARD_LOG_KEY]);
    const raw = stored[REDEMPTION_GUARD_LOG_KEY];
    const log: RedemptionGuardLogEntry[] = Array.isArray(raw) ? raw : [];
    log.push({ ts: entry.ts, host: entry.host, outcome: entry.outcome });
    await chrome.storage.local.set({
      [REDEMPTION_GUARD_LOG_KEY]: log.slice(-MAX_REDEMPTION_GUARD_LOG_ENTRIES),
    });
  } catch {
    // Storage unavailable in test harnesses without mock
  }
}

export interface ReverseWithdrawalShieldHandle {
  stop: () => void;
  updateEnabled: (enabled: boolean) => void;
  scanNow: () => number;
  isConfirmOpen: () => boolean;
}

export interface ReverseWithdrawalShieldOptions {
  holdMs?: number;
}

function resolveTriggerElement(target: Element): Element {
  return (
    target.closest(
      'button, a, [role="button"], input[type="submit"], input[type="button"], ' +
        CANCEL_WITHDRAWAL_SELECTORS.join(', ')
    ) ?? target
  );
}

/**
 * Installs the redemption guard: click/keyboard interception, confirm step with
 * a hold, and an observer that tags new cancel controls.
 */
export function installReverseWithdrawalShield(
  doc: Document = document,
  options: ReverseWithdrawalShieldOptions = {}
): ReverseWithdrawalShieldHandle {
  const holdMs = options.holdMs ?? REDEMPTION_HOLD_MS;
  let stopped = false;
  let observer: MutationObserver | null = null;
  let holdTimer: ReturnType<typeof setInterval> | null = null;
  /** Elements the player confirmed; their next click goes through once. */
  const allowOnce = new WeakSet<Element>();

  void loadReverseWithdrawalShieldEnabled();

  const host = () => doc.location?.hostname ?? '';

  const closeDialog = () => {
    if (holdTimer !== null) {
      clearInterval(holdTimer);
      holdTimer = null;
    }
    doc.getElementById(GUARD_DIALOG_ID)?.remove();
  };

  const openConfirm = (trigger: Element) => {
    if (doc.getElementById(GUARD_DIALOG_ID)) return;

    const root = doc.createElement('div');
    root.id = GUARD_DIALOG_ID;
    root.setAttribute('role', 'alertdialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', `${GUARD_DIALOG_ID}-q`);
    root.style.cssText = [
      'position: fixed',
      'inset: 0',
      'z-index: 2147483647',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'background: rgba(5, 7, 10, 0.72)',
      'font-family: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace',
    ].join(';');

    const card = doc.createElement('div');
    card.style.cssText = [
      'background: #0f1115',
      'border: 2px solid #17c3b2',
      'border-radius: 8px',
      'color: #ffffff',
      'padding: 1.25rem',
      'width: min(24rem, 92vw)',
      'box-sizing: border-box',
      'box-shadow: 0 8px 32px rgba(0, 0, 0, 0.85)',
    ].join(';');

    const eyebrow = doc.createElement('div');
    eyebrow.textContent = 'Keep the Win';
    eyebrow.style.cssText = 'font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;color:#17c3b2;font-weight:800;';

    const question = doc.createElement('p');
    question.id = `${GUARD_DIALOG_ID}-q`;
    question.textContent = REDEMPTION_GUARD_QUESTION;
    question.style.cssText = 'font-size:1rem;font-weight:700;margin:0.4rem 0 0.5rem;';

    const sub = doc.createElement('p');
    sub.textContent = 'Sites slow-walk payouts hoping you play it back. Letting it clear is the win.';
    sub.style.cssText = 'font-size:0.8rem;color:#cbd5e1;margin:0 0 0.9rem;line-height:1.45;';

    const btnStyle =
      'font:inherit;font-size:0.85rem;font-weight:700;padding:0.6rem 0.75rem;border-radius:5px;cursor:pointer;width:100%;margin-top:0.45rem;';

    const keepBtn = doc.createElement('button');
    keepBtn.type = 'button';
    keepBtn.dataset.guard = 'keep';
    keepBtn.textContent = 'Keep my cashout';
    keepBtn.style.cssText = btnStyle + 'background:#17c3b2;color:#05070a;border:1px solid #17c3b2;';

    const reverseBtn = doc.createElement('button');
    reverseBtn.type = 'button';
    reverseBtn.dataset.guard = 'reverse';
    reverseBtn.disabled = true;
    reverseBtn.style.cssText = btnStyle + 'background:#161b24;color:#94a3b8;border:1px solid #283347;';

    const startedAt = Date.now();
    const renderCountdown = () => {
      const left = Math.max(0, Math.ceil((holdMs - (Date.now() - startedAt)) / 1000));
      if (left > 0) {
        reverseBtn.disabled = true;
        reverseBtn.textContent = `Reverse it (wait ${left}s)`;
      } else {
        reverseBtn.disabled = false;
        reverseBtn.textContent = 'Reverse it anyway';
        if (holdTimer !== null) {
          clearInterval(holdTimer);
          holdTimer = null;
        }
      }
    };
    renderCountdown();
    holdTimer = setInterval(renderCountdown, 250);

    keepBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void recordRedemptionGuardEvent({ ts: Date.now(), host: host(), outcome: 'kept' });
      closeDialog();
    });

    reverseBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (reverseBtn.disabled || Date.now() - startedAt < holdMs) return;
      void recordRedemptionGuardEvent({ ts: Date.now(), host: host(), outcome: 'reversed' });
      closeDialog();
      allowOnce.add(trigger);
      try {
        (trigger as HTMLElement).click();
      } catch {
        allowOnce.delete(trigger);
      }
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        void recordRedemptionGuardEvent({ ts: Date.now(), host: host(), outcome: 'kept' });
        closeDialog();
      }
    });

    card.append(eyebrow, question, sub, keepBtn, reverseBtn);
    root.appendChild(card);
    (doc.body ?? doc.documentElement).appendChild(root);
    try {
      keepBtn.focus();
    } catch {
      // Focus can fail in detached test documents.
    }
  };

  const scanAndMark = (): number => {
    if (stopped || !inMemoryShieldEnabled) return 0;
    let count = 0;

    for (const selector of CANCEL_WITHDRAWAL_SELECTORS) {
      doc.querySelectorAll(selector).forEach((el) => {
        if (el.getAttribute('data-tiltcheck-shield') !== 'guarded') {
          markGuardedCancelElement(el);
          count++;
        }
      });
    }

    doc.querySelectorAll('button, a, [role="button"]').forEach((el) => {
      if (el.getAttribute('data-tiltcheck-shield') !== 'guarded' && isCancelWithdrawalTarget(el)) {
        markGuardedCancelElement(el);
        count++;
      }
    });

    return count;
  };

  const intercept = (event: Event, target: Element) => {
    const trigger = resolveTriggerElement(target);
    if (allowOnce.has(trigger)) {
      // Player confirmed and waited out the hold. Let this one click through.
      if (event.type === 'click') {
        allowOnce.delete(trigger);
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    markGuardedCancelElement(trigger);
    if (event.type === 'click' || event.type === 'keydown') {
      openConfirm(trigger);
    }
  };

  const onActionCapture = (event: Event) => {
    if (stopped || !inMemoryShieldEnabled) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(`#${GUARD_DIALOG_ID}`)) return;
    if (!isCancelWithdrawalTarget(target)) return;
    intercept(event, target);
  };

  const onKeydownCapture = (event: KeyboardEvent) => {
    if (stopped || !inMemoryShieldEnabled) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(`#${GUARD_DIALOG_ID}`)) return;
    if (!isCancelWithdrawalTarget(target)) return;
    intercept(event, target);
  };

  const onStorageChanged = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: string
  ) => {
    if (area !== 'local') return;
    if (TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY in changes) {
      const val = changes[TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY]?.newValue;
      if (typeof val === 'boolean') {
        inMemoryShieldEnabled = val;
        if (inMemoryShieldEnabled) {
          scanAndMark();
        } else {
          closeDialog();
        }
      }
    }
  };

  try {
    chrome.storage?.onChanged?.addListener?.(onStorageChanged);
  } catch {
    // Storage listener unavailable in test harnesses without mock
  }

  doc.addEventListener('click', onActionCapture, true);
  doc.addEventListener('mousedown', onActionCapture, true);
  doc.addEventListener('pointerdown', onActionCapture, true);
  doc.addEventListener('keydown', onKeydownCapture, true);

  try {
    if (typeof MutationObserver !== 'undefined' && doc.body) {
      observer = new MutationObserver(() => {
        scanAndMark();
      });
      observer.observe(doc.body, { childList: true, subtree: true });
    }
  } catch {
    // Observer unavailable in mocked test environments
  }

  scanAndMark();

  return {
    stop: () => {
      stopped = true;
      closeDialog();
      doc.removeEventListener('click', onActionCapture, true);
      doc.removeEventListener('mousedown', onActionCapture, true);
      doc.removeEventListener('pointerdown', onActionCapture, true);
      doc.removeEventListener('keydown', onKeydownCapture, true);

      try {
        chrome.storage?.onChanged?.removeListener?.(onStorageChanged);
      } catch {
        // Ignore
      }

      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
    updateEnabled: (enabled: boolean) => {
      inMemoryShieldEnabled = enabled;
      if (enabled) {
        scanAndMark();
      } else {
        closeDialog();
      }
    },
    scanNow: () => scanAndMark(),
    isConfirmOpen: () => doc.getElementById(GUARD_DIALOG_ID) !== null,
  };
}
