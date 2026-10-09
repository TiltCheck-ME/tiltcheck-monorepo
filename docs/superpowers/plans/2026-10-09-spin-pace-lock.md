<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 -->

# Spin Pace Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After every spin, lock the spin button for two seconds, show a countdown chip on it, and toast a locked click without covering the tab.

**Architecture:** A Core content-script module installs one capture listener and one open shadow root. The allowed spin finishes, then a microtask starts `lockUntil`. The chip catches clicks the disabled button will not fire. `content.ts` stops constructing `TiltDetector` and stops calling `triggerTouchGrassTimeout`. The homepage and its meta description stop selling the two-minute cover.

**Tech Stack:** TypeScript, Chrome extension Manifest V3 content script, Vitest, jsdom.

## Global Constraints

- `PACE_LOCK_MS` is 2000. It does not read `tiltcheck_touch_grass_duration_ms`.
- The lock is an in-memory timestamp. A reload clears it. It is not written to `chrome.storage`.
- A non-spin click does not start the lock, does not toast, and is not swallowed.
- A spin click while `Date.now() < lockUntil` is swallowed (`preventDefault` and `stopPropagation`). `lockUntil` does not change.
- Toast text is exactly: No cap, the balance is still catching that last spin.
- One toast. A second swallowed click does not add another. The toast leaves when the lock ends.
- The chip shows `2`, then `1`, via `Math.ceil(remainingMs / 1000)`. It never shows `0`.
- The casino button label is not rewritten.
- Core does not call `triggerTouchGrassTimeout`.
- No side panel on any viewport.
- This path does not construct, sign, or send a transaction.
- Spin control matches `button[class*="bet"]`, `button[class*="spin"]`, `[data-action="bet"]`, or `[data-action="spin"]`, or a descendant of one, via `closest`.
- One shared `lockUntil` for every match. A redrawn control is disabled on the 250ms tick.
- Toast and chip live in one open shadow root on `#tiltcheck-pace-host`. The stylesheet stays inside that root.
- The host is `pointer-events: none`. The chip is `pointer-events: auto` so a click on a disabled button still reaches the toast.
- The allowed spin's own listener runs. The lock starts in a setTimeout of 0 after the click, because a microtask runs before the casino handler finishes. Disabling during capture would eat the spin.
- When `enforcementEnabled` is false, the pace lock is not installed. Default stays on.
- Do not edit `tilt-detector.ts`, `touch-grass-timeout.ts`, `pro-monolith-bootstrap.ts`, or `apps/web/src/app/touch-grass/page.tsx`.
- Do not build `docs/superpowers/specs/2026-10-09-touch-grass-side-panel-design.md`.
- Copyright header on every touched file: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09`.

---

### Task 1: Pace lock module

**Files:**
- Create: `apps/chrome-extension/src/spin-pace-lock.ts`
- Test: `apps/chrome-extension/tests/unit/spin-pace-lock.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `installSpinPaceLock(doc?: Document): PaceLockHandle`, `PACE_LOCK_MS`, `PACE_TOAST_TEXT`, `PACE_HOST_ID`, `SPIN_CONTROL_SELECTOR`
- `PaceLockHandle` is `{ stop(): void; lockUntil(): number }`

- [ ] **Step 1: Write the failing test**

Create `apps/chrome-extension/tests/unit/spin-pace-lock.test.ts`:

```ts
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 */
/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installSpinPaceLock,
  PACE_HOST_ID,
  PACE_LOCK_MS,
  PACE_TOAST_TEXT,
} from '../../src/spin-pace-lock.js';

function spinButton(label = 'Spin'): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'spin-button';
  button.textContent = label;
  document.body.appendChild(button);
  return button;
}

function chip(): HTMLElement | null {
  return document.getElementById(PACE_HOST_ID)?.shadowRoot?.querySelector('.chip') ?? null;
}

function toast(): HTMLElement | null {
  return document.getElementById(PACE_HOST_ID)?.shadowRoot?.querySelector('.toast') ?? null;
}

async function flush(): Promise<void> {
  await Promise.resolve();
}

describe('installSpinPaceLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T15:00:00.000Z'));
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('locks an allowed spin for 2000ms and shows 2', async () => {
    const button = spinButton();
    let spins = 0;
    button.addEventListener('click', () => {
      spins += 1;
    });
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(spins).toBe(1);
    await flush();
    expect(handle.lockUntil()).toBe(Date.now() + PACE_LOCK_MS);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Spin');
    expect(chip()?.textContent).toBe('2');
    handle.stop();
  });

  it('shows 1 after 1000ms and keeps the button disabled', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    vi.advanceTimersByTime(1000);
    expect(chip()?.textContent).toBe('1');
    expect(button.disabled).toBe(true);
    handle.stop();
  });

  it('swallows a spin click during the lock without adding time', async () => {
    const button = spinButton();
    let spins = 0;
    button.addEventListener('click', () => {
      spins += 1;
    });
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    const until = handle.lockUntil();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(spins).toBe(1);
    expect(handle.lockUntil()).toBe(until);
    expect(toast()?.textContent).toBe(PACE_TOAST_TEXT);
    expect(toast()?.style.display).toBe('block');
    expect(document.querySelectorAll('.toast').length).toBe(0);
    handle.stop();
  });

  it('shows the toast when the click lands on the chip', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    chip()?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    chip()?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(document.getElementById(PACE_HOST_ID)?.shadowRoot?.querySelectorAll('.toast').length).toBe(1);
    expect(toast()?.style.display).toBe('block');
    handle.stop();
  });

  it('restores the button and clears the chip and toast at 2000ms', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    chip()?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    vi.advanceTimersByTime(PACE_LOCK_MS);
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Spin');
    expect(chip()?.style.display).toBe('none');
    expect(toast()?.style.display).toBe('none');
    handle.stop();
  });

  it('ignores a click that is not a spin control', async () => {
    const other = document.createElement('button');
    other.textContent = 'Chat';
    document.body.appendChild(other);
    const handle = installSpinPaceLock();
    other.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    expect(handle.lockUntil()).toBe(0);
    expect(document.getElementById(PACE_HOST_ID)?.shadowRoot?.querySelector('.chip')?.style.display).not.toBe('flex');
    handle.stop();
  });

  it('starts a fresh 2000ms lock on the next allowed spin', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    vi.advanceTimersByTime(PACE_LOCK_MS);
    const start = Date.now();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    expect(handle.lockUntil()).toBe(start + PACE_LOCK_MS);
    handle.stop();
  });

  it('disables a spin button inserted during the lock', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    const redrawn = spinButton('Spin again');
    vi.advanceTimersByTime(250);
    expect(redrawn.disabled).toBe(true);
    handle.stop();
  });

  it('keeps the stylesheet inside the shadow root', async () => {
    const button = spinButton();
    const handle = installSpinPaceLock();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
    const root = document.getElementById(PACE_HOST_ID)?.shadowRoot;
    expect(root?.querySelector('style')?.textContent).toContain('pointer-events: none');
    expect(document.head.querySelector('style')).toBeNull();
    expect(document.body.querySelector(':scope > style')).toBeNull();
    handle.stop();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @tiltcheck/chrome-extension exec vitest --run tests/unit/spin-pace-lock.test.ts`

Expected: FAIL. Cannot find module `../../src/spin-pace-lock.js`.

- [ ] **Step 3: Write the module**

Create `apps/chrome-extension/src/spin-pace-lock.ts`:

```ts
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 */

export const PACE_LOCK_MS = 2000;
export const PACE_TICK_MS = 250;
export const PACE_TOAST_TEXT = "No cap, the balance is still catching that last spin.";
export const PACE_HOST_ID = 'tiltcheck-pace-host';

export const SPIN_CONTROL_SELECTOR = [
  'button[class*="bet"]',
  'button[class*="spin"]',
  '[data-action="bet"]',
  '[data-action="spin"]',
].join(', ');

export type PaceLockHandle = {
  stop: () => void;
  lockUntil: () => number;
};

export function installSpinPaceLock(doc: Document = document): PaceLockHandle {
  let lockUntil = 0;
  let anchor: Element | null = null;
  let tickId: ReturnType<typeof setInterval> | null = null;
  const disabledByLock = new Set<HTMLButtonElement>();

  const host = doc.createElement('div');
  host.id = PACE_HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });

  const style = doc.createElement('style');
  style.textContent = `
    :host { position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; }
    .chip {
      position: fixed;
      display: none;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      background: rgba(15, 17, 21, 0.88);
      color: #ffffff;
      font: 700 1.25rem ui-monospace, monospace;
    }
    .toast {
      position: fixed;
      display: none;
      left: 50%;
      top: 1rem;
      transform: translateX(-50%);
      max-width: 22rem;
      padding: 0.75rem 1rem;
      pointer-events: none;
      background: #0f1115;
      color: #ffffff;
      font: 600 0.875rem ui-monospace, monospace;
    }
  `;

  const chip = doc.createElement('div');
  chip.className = 'chip';
  const toast = doc.createElement('div');
  toast.className = 'toast';
  toast.textContent = PACE_TOAST_TEXT;
  shadow.append(style, chip, toast);
  doc.body.append(host);

  const matches = (): HTMLElement[] =>
    Array.from(doc.querySelectorAll<HTMLElement>(SPIN_CONTROL_SELECTOR));

  const showToast = (): void => {
    toast.style.display = 'block';
  };

  const hideToast = (): void => {
    toast.style.display = 'none';
  };

  const placeChip = (target: Element): void => {
    const rect = target.getBoundingClientRect();
    chip.style.display = 'flex';
    chip.style.left = `${rect.left}px`;
    chip.style.top = `${rect.top}px`;
    chip.style.width = `${Math.max(rect.width, 48)}px`;
    chip.style.height = `${Math.max(rect.height, 32)}px`;
  };

  const release = (): void => {
    if (tickId !== null) {
      clearInterval(tickId);
      tickId = null;
    }
    for (const button of disabledByLock) {
      button.disabled = false;
    }
    disabledByLock.clear();
    chip.style.display = 'none';
    hideToast();
    anchor = null;
    lockUntil = 0;
  };

  const applyLockVisuals = (): void => {
    const left = lockUntil - Date.now();
    if (left <= 0) {
      release();
      return;
    }
    chip.textContent = String(Math.ceil(left / 1000));
    const current = matches();
    for (const el of current) {
      if (el instanceof HTMLButtonElement) {
        el.disabled = true;
        disabledByLock.add(el);
      }
    }
    const liveAnchor = anchor && anchor.isConnected ? anchor : (current[0] ?? null);
    anchor = liveAnchor;
    if (liveAnchor) {
      placeChip(liveAnchor);
    } else {
      chip.style.display = 'none';
    }
  };

  const startLock = (spin: Element): void => {
    lockUntil = Date.now() + PACE_LOCK_MS;
    anchor = spin;
    hideToast();
    applyLockVisuals();
    if (tickId !== null) {
      clearInterval(tickId);
    }
    tickId = setInterval(applyLockVisuals, PACE_TICK_MS);
  };

  const swallow = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    showToast();
  };

  const onDocumentClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const spin = target.closest(SPIN_CONTROL_SELECTOR);
    if (!spin) return;
    if (Date.now() < lockUntil) {
      swallow(event);
      return;
    }
    queueMicrotask(() => {
      if (!spin.isConnected) return;
      startLock(spin);
    });
  };

  const onChipClick = (event: Event): void => {
    if (Date.now() >= lockUntil) return;
    swallow(event);
  };

  chip.addEventListener('click', onChipClick);
  doc.addEventListener('click', onDocumentClick, true);

  const stop = (): void => {
    doc.removeEventListener('click', onDocumentClick, true);
    release();
    host.remove();
  };

  return {
    stop,
    lockUntil: () => lockUntil,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @tiltcheck/chrome-extension exec vitest --run tests/unit/spin-pace-lock.test.ts`

Expected: PASS. 9 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/chrome-extension/src/spin-pace-lock.ts apps/chrome-extension/tests/unit/spin-pace-lock.test.ts
git commit -m "feat(extension): lock the spin button for two seconds"
```

---

### Task 2: Wire Core and drop the cover

**Files:**
- Modify: `apps/chrome-extension/src/content.ts`
- Modify: `apps/chrome-extension/tests/unit/content.test.ts`
- Modify: `apps/chrome-extension/README.md`
- Test: `apps/chrome-extension/tests/unit/content.test.ts`

**Interfaces:**
- Consumes: `installSpinPaceLock` from `./spin-pace-lock.js`
- Produces: Core installs the pace lock only when `loadCoreCircuitBreakerOptions().enforcementEnabled` is true. Core does not import `triggerTouchGrassTimeout`.

- [ ] **Step 1: Write the failing test**

Add these tests to `apps/chrome-extension/tests/unit/content.test.ts` inside the existing `describe`. Keep the chrome mock helper. Update the file copyright date to 2026-10-09.

```ts
it('does not call the full-screen cover from Core', async () => {
  vi.doMock('../../src/touch-grass-timeout.js', () => ({
    triggerTouchGrassTimeout: vi.fn(),
  }));
  createChromeMock();
  await import('../../src/content.ts');
  await flush();
  vi.advanceTimersByTime(10_000);
  const cover = await import('../../src/touch-grass-timeout.js');
  expect(cover.triggerTouchGrassTimeout).not.toHaveBeenCalled();
});

it('does not install the pace lock when enforcement is off', async () => {
  createChromeMock({ tiltcheck_touch_grass_opt_in: false });
  await import('../../src/content.ts');
  await flush();
  const button = document.createElement('button');
  button.className = 'spin-button';
  button.textContent = 'Spin';
  document.body.appendChild(button);
  button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await flush();
  expect(document.getElementById('tiltcheck-pace-host')).toBeNull();
  expect(button.disabled).toBe(false);
});
```

`vi.doMock` must run before the content import. `beforeEach` already calls `vi.resetModules()`. Put the `doMock` test before other imports of `content.ts` in that test only, which the reset handles.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @tiltcheck/chrome-extension exec vitest --run tests/unit/content.test.ts`

Expected: FAIL. The cover mock is called, or the pace host is missing because the lock is not installed yet and the enforcement-off test may pass early. The cover test must fail until the `triggerTouchGrassTimeout` calls are gone. If the mock is not reached because of the static import, change the assertion to read the source:

```ts
it('does not call the full-screen cover from Core', async () => {
  const source = await import('node:fs/promises').then((fs) =>
    fs.readFile(new URL('../../src/content.ts', import.meta.url), 'utf8')
  );
  expect(source).not.toContain('triggerTouchGrassTimeout');
});
```

Use that source assertion if `vi.doMock` does not intercept the static import. Expected before the edit: FAIL because `content.ts` contains `triggerTouchGrassTimeout`.

- [ ] **Step 3: Wire Core**

In `apps/chrome-extension/src/content.ts`:

- Update the copyright date to 2026-10-09.
- Remove the imports of `TiltDetector` and `triggerTouchGrassTimeout`.
- Add `import { installSpinPaceLock, type PaceLockHandle } from './spin-pace-lock.js';`
- Remove `tiltDetector`, `corePoll`, `coreClickListener`, and `touchGrassCooldownUntil`.
- Keep the export `TILTCHECK_CORE_RECORD_BET_EVENT`. Remove the `window.addEventListener` that calls `recordBet`. Pro still dispatches that event. Core ignores it.
- `refreshCoreOptions` only loads options. Delete the `tiltDetector?.setRiskProfile` line.
- Replace `startCoreCircuitBreaker` with this behavior. Keep `waitForDocumentEnd` and `installCoreOptionsListener`. Do not reformat the rest of the file.

```ts
let paceLock: PaceLockHandle | null = null;

function syncPaceLock(enabled: boolean): void {
  if (enabled && !paceLock) {
    paceLock = installSpinPaceLock();
    return;
  }
  if (!enabled && paceLock) {
    paceLock.stop();
    paceLock = null;
  }
}

async function startCoreCircuitBreaker(): Promise<void> {
  await waitForDocumentEnd();
  const opts = await refreshCoreOptions();
  installCoreOptionsListener();
  (window as TiltCheckWindow).__tiltcheckCoreShieldActive = true;
  syncPaceLock(opts.enforcementEnabled);
}
```

Inside `installCoreOptionsListener`, after `void refreshCoreOptions()`, the options listener must sync the lock. Change that branch to:

```ts
if (coreKeyTouched) {
  void refreshCoreOptions().then((opts) => {
    syncPaceLock(opts.enforcementEnabled);
  });
}
```

In `apps/chrome-extension/README.md`, update the copyright date to 2026-10-09 and replace the Core bullets:

```md
- Locks the spin button for two seconds after every spin
- A click during that lock does not spin. One line tells you the balance is still catching up
- **SusLink** can bounce critically sus casino URLs (API up)
- Read-only. No wallet keys. No Discord required. No HUD/sidebar until Pro is enabled
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @tiltcheck/chrome-extension exec vitest --run tests/unit/content.test.ts tests/unit/spin-pace-lock.test.ts`

Expected: PASS. Existing content-script contract tests still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/chrome-extension/src/content.ts apps/chrome-extension/tests/unit/content.test.ts apps/chrome-extension/README.md
git commit -m "feat(extension): pace spins in Core instead of covering the tab"
```

---

### Task 3: Homepage copy

**Files:**
- Modify: `apps/web/src/lib/home-launch-copy.ts`
- Modify: `apps/web/src/lib/home-launch-copy.test.ts`
- Modify: `apps/web/src/lib/site-copy.ts`

**Interfaces:**
- Consumes: none
- Produces: `HOME_LAUNCH` strings and `SITE_ONE_LINER` from the spec. `SITE_ONE_LINER` is the homepage meta description in `apps/web/src/app/layout.tsx`. Leaving it would still say the tab is covered for two minutes.

- [ ] **Step 1: Write the failing test**

Replace the second and third tests in `apps/web/src/lib/home-launch-copy.test.ts`. Update the copyright date to 2026-10-09.

```ts
it('explains the two-second spin lock and the scam-link check', () => {
  expect(HOME_LAUNCH.lede).toBe(
    'Download the zip and load it in Chrome. Open a casino you already use. Every spin locks the spin button for two seconds. The countdown sits on the button. Click it early and the click does not go through.',
  );
  expect(HOME_LAUNCH.cards.map((card) => card.title)).toEqual([
    'Locks the spin',
    'Swallows the mash',
    'Gives the button back',
  ]);
  expect(HOME_LAUNCH.cards[0]?.body).toBe(
    'Every spin goes through, then the spin button locks for two seconds. Other clicks on the page do not start the lock.',
  );
  expect(HOME_LAUNCH.cards[1]?.body).toBe(
    'A click while the button is locked does not spin and does not add time. The line is: No cap, the balance is still catching that last spin.',
  );
  expect(HOME_LAUNCH.cards[2]?.body).toBe(
    'At zero the button works again. The next spin starts a fresh two seconds.',
  );
  expect(HOME_LAUNCH.installSteps[2]).toBe(
    'Open a supported casino and play. Every spin locks the button for two seconds.',
  );
  expect(HOME_LAUNCH.mock).toMatchObject({
    status: 'Button locked',
    signal: '2s',
    footer: 'Balance still catching up',
    chip: 'Does not touch your wallet',
  });
  const blob = [
    HOME_LAUNCH.lede,
    ...HOME_LAUNCH.cards.map((card) => `${card.title} ${card.body}`),
    ...HOME_LAUNCH.installSteps,
    HOME_LAUNCH.mock.status,
    HOME_LAUNCH.mock.footer,
  ].join(' ');
  expect(blob).not.toContain('tab is covered');
  expect(blob).not.toContain('two minutes');
  expect(blob).not.toContain('cannot close it early');
  expect(HOME_LAUNCH.honesty.join(' ')).toContain('serious scam');
  expect(HOME_LAUNCH.honesty.join(' ')).not.toContain('Approved');
  expect(HOME_LAUNCH.honesty.join(' ')).not.toContain('Instant Redeem');
});

it('sets the share title and a short meta description', () => {
  expect(SITE_SEO_TITLE).toBe('TiltCheck | House always wins? FUCK THAT.');
  expect(SITE_ONE_LINER).toBe(
    'Chrome add-on that locks the spin button for two seconds after every spin on a casino tab.',
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run apps/web/src/lib/home-launch-copy.test.ts`

Expected: FAIL. The lede still mentions Touch Grass and two minutes.

- [ ] **Step 3: Update the copy**

In `apps/web/src/lib/home-launch-copy.ts`, set the copyright date to 2026-10-09 and replace `lede`, install step index 2, the three cards, and `mock.status`, `mock.signal`, and `mock.footer` with the strings asserted above. Leave `mock.chip` as `Does not touch your wallet`.

In `apps/web/src/lib/site-copy.ts`, set the copyright date to 2026-10-09 and set `SITE_ONE_LINER` to `Chrome add-on that locks the spin button for two seconds after every spin on a casino tab.`

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run apps/web/src/lib/home-launch-copy.test.ts`

Expected: PASS. 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/home-launch-copy.ts apps/web/src/lib/home-launch-copy.test.ts apps/web/src/lib/site-copy.ts
git commit -m "docs(web): sell the two-second spin lock"
```
