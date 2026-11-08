/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */
/**
 * reverse-withdrawal-shield.ts
 * DOM Reverse-Withdrawal Shield (Cashier Protection).
 *
 * Neutralizes "Cancel Withdrawal", "Reverse Withdrawal", "Cancel Cashout",
 * and "Cancel Redemption" triggers during pending payout periods.
 * Prevents players on tilt from reversing settled or pending cashouts back
 * into playable casino balance.
 *
 * Non-custodial: operates entirely client-side with zero custody of player funds.
 */

export const TILTCHECK_REVERSE_WITHDRAWAL_SHIELD_ENABLED_KEY =
  'tiltcheck_reverse_withdrawal_shield_enabled';

export const ALERT_ID = 'tiltcheck-reverse-withdrawal-alert';
export const ALERT_DISMISS_MS = 4000;

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
 * Preemptively visually neutralizes a reverse-withdrawal element.
 */
export function neutralizeCancelElement(el: Element): void {
  if (el.getAttribute('data-tiltcheck-shield') === 'blocked') {
    return;
  }

  el.setAttribute('data-tiltcheck-shield', 'blocked');
  if ('disabled' in el) {
    (el as HTMLButtonElement).disabled = true;
  }

  const existingStyle = el.getAttribute('style') || '';
  el.setAttribute(
    'style',
    existingStyle +
      '; opacity: 0.35 !important; cursor: not-allowed !important; pointer-events: none !important; filter: grayscale(1) !important;'
  );
  el.setAttribute(
    'title',
    'Cashout Protected: TiltCheck Reverse-Withdrawal Shield is Active. Let your hit clear.'
  );
}

export interface ReverseWithdrawalShieldHandle {
  stop: () => void;
  updateEnabled: (enabled: boolean) => void;
  scanNow: () => number;
}

/**
 * Installs the Reverse-Withdrawal Shield DOM interceptor and observer.
 */
export function installReverseWithdrawalShield(
  doc: Document = document
): ReverseWithdrawalShieldHandle {
  let stopped = false;
  let alertTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let observer: MutationObserver | null = null;

  void loadReverseWithdrawalShieldEnabled();

  const showAlert = (message: string) => {
    let alertEl = doc.getElementById(ALERT_ID);
    if (!alertEl) {
      alertEl = doc.createElement('div');
      alertEl.id = ALERT_ID;
      alertEl.setAttribute('role', 'alert');
      alertEl.setAttribute('aria-live', 'assertive');
      alertEl.style.cssText = [
        'position: fixed',
        'top: 1.5rem',
        'left: 50%',
        'transform: translateX(-50%)',
        'z-index: 2147483647',
        'background: #0f1115',
        'border: 2px solid #17c3b2',
        'border-radius: 6px',
        'color: #ffffff',
        'padding: 0.85rem 1.25rem',
        'font-family: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace',
        'font-size: 0.875rem',
        'font-weight: 700',
        'box-shadow: 0 4px 24px rgba(0, 0, 0, 0.85)',
        'text-align: center',
        'pointer-events: none',
        'max-width: 90vw',
        'box-sizing: border-box',
      ].join(';');
      (doc.body ?? doc.documentElement).appendChild(alertEl);
    }

    alertEl.textContent = message;

    if (alertTimeoutId !== null) {
      clearTimeout(alertTimeoutId);
      alertTimeoutId = null;
    }

    alertTimeoutId = setTimeout(() => {
      alertTimeoutId = null;
      alertEl?.remove();
    }, ALERT_DISMISS_MS);
  };

  const scanAndNeutralize = (): number => {
    if (stopped || !inMemoryShieldEnabled) return 0;
    let count = 0;

    // 1. Check known selectors
    for (const selector of CANCEL_WITHDRAWAL_SELECTORS) {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((el) => {
        if (el.getAttribute('data-tiltcheck-shield') !== 'blocked') {
          neutralizeCancelElement(el);
          count++;
        }
      });
    }

    // 2. Scan buttons and links
    const candidates = doc.querySelectorAll('button, a, [role="button"]');
    candidates.forEach((el) => {
      if (el.getAttribute('data-tiltcheck-shield') !== 'blocked' && isCancelWithdrawalTarget(el)) {
        neutralizeCancelElement(el);
        count++;
      }
    });

    return count;
  };

  const onActionCapture = (event: Event) => {
    if (stopped || !inMemoryShieldEnabled) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    if (!isCancelWithdrawalTarget(target)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    neutralizeCancelElement(target);

    showAlert(
      'Cashout Protected: Reverse-Withdrawal Shield is active. Do not donate your hit back to the house. Let your cashout clear.'
    );
  };

  const onKeydownCapture = (event: KeyboardEvent) => {
    if (stopped || !inMemoryShieldEnabled) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    if (!isCancelWithdrawalTarget(target)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    neutralizeCancelElement(target);

    showAlert(
      'Cashout Protected: Reverse-Withdrawal Shield is active. Do not donate your hit back to the house. Let your cashout clear.'
    );
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
          scanAndNeutralize();
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

  // Setup DOM MutationObserver
  try {
    if (typeof MutationObserver !== 'undefined' && doc.body) {
      observer = new MutationObserver(() => {
        scanAndNeutralize();
      });
      observer.observe(doc.body, { childList: true, subtree: true });
    }
  } catch {
    // Observer unavailable in mocked test environments
  }

  // Initial scan
  scanAndNeutralize();

  return {
    stop: () => {
      stopped = true;
      if (alertTimeoutId !== null) {
        clearTimeout(alertTimeoutId);
        alertTimeoutId = null;
      }
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

      const alertEl = doc.getElementById(ALERT_ID);
      alertEl?.remove();
    },
    updateEnabled: (enabled: boolean) => {
      inMemoryShieldEnabled = enabled;
      if (enabled) {
        scanAndNeutralize();
      }
    },
    scanNow: () => scanAndNeutralize(),
  };
}
