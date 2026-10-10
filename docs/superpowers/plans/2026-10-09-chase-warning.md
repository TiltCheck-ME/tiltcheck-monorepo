<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 -->

# Chase Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the last spin lost and the next stake is bigger, show one chase toast. The spin still goes through, and the two-second lock does not change.

**Architecture:** A Core module reads `betAmount` and `balance` from the existing `CASINO_SELECTORS` list. It remembers one in-memory number, `lastLosingStake`. The toast is a second node in the pace lock's open shadow root. `content.ts` installs and stops it with the same enforcement switch as the pace lock.

**Tech Stack:** TypeScript, Chrome extension Manifest V3 content script, Vitest, jsdom.

## Global Constraints

- Toast text is exactly: No cap, the last one lost and this stake is bigger. That's the chase.
- The toast shows on the spin that places the bigger stake. That spin is not blocked. `lockUntil` does not change.
- One toast node. A later raise after another loss may show the same node again.
- A bigger stake after a win stays quiet. The same stake after a loss stays quiet. A smaller stake after a loss stays quiet.
- `lastLosingStake` is in memory only. A reload clears it. It is not written to `chrome.storage`. There is no session log.
- `CHASE_SETTLE_MS` is 5000. The first balance that differs from the start is the result. Lower records that stake. Higher clears it. No change means no result.
- A null `lastLosingStake` does not toast.
- Strip currency symbols and commas. One number or the read is skipped. A skipped stake does not toast and does not update `lastLosingStake`. A skipped balance does not count as a result.
- Use `CASINO_SELECTORS` in `apps/chrome-extension/src/extractor.ts` for `betAmount` and `balance` only. Do not construct `CasinoDataExtractor`. Do not call `AnalyzerClient`. Do not compute RTP. Do not call `recordBet`.
- The chase line is a second element in `#tiltcheck-pace-host`'s open shadow root. It does not replace the pace toast. The stylesheet stays inside that root.
- Enforcement off installs neither the pace lock nor this warning. No new setting.
- Do not call `triggerTouchGrassTimeout`. Do not change `PACE_LOCK_MS`.
- Do not edit `tilt-detector.ts`, `touch-grass-timeout.ts`, `pro-monolith-bootstrap.ts`, or `apps/web/src/app/touch-grass/page.tsx`.
- Homepage change is one appended sentence on `HOME_LAUNCH.lede`. Do not change the three cards, the install steps, or `SITE_ONE_LINER`.
- Copyright header on every touched file: `© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09`.
- Out of scope: session stats, an RTP check, a research writeup, a longer freeze, the two-minute cover, and any tip or wallet work.

---

### Task 1: Chase warning module

**Files:**
- Create: `apps/chrome-extension/src/chase-warning.ts`
- Test: `apps/chrome-extension/tests/unit/chase-warning.test.ts`

**Interfaces:**
- Consumes: `CASINO_SELECTORS` from `./extractor.js`. `PACE_HOST_ID` from `./spin-pace-lock.js`. The caller passes `lockUntil: () => number`.
- Produces: `parseMoney(text: string | null): number | null`, `CHASE_SETTLE_MS`, `CHASE_TOAST_TEXT`, `installChaseWarning(doc: Document, lockUntil: () => number): ChaseHandle`
- `ChaseHandle` is `{ stop(): void; lastLosingStake(): number | null }`

- [ ] **Step 1: Write the failing test**

Create `apps/chrome-extension/tests/unit/chase-warning.test.ts`. Copyright header dated 2026-10-09. `@vitest-environment jsdom`. The fixture appends `#tiltcheck-pace-host` with an open shadow root, a `button.spin-button`, a `[data-bet]`, and a `[data-balance]`. It does not call `installSpinPaceLock`. `lockUntil` is a mutable function the test controls, defaulting to `() => 0`.

```ts
function chaseToast(): HTMLElement | null {
  return document.getElementById('tiltcheck-pace-host')?.shadowRoot?.querySelector('.chase-toast') ?? null;
}
```

Assertions, each its own `it`:

- `parseMoney('$1,250.50')` is `1250.5`, `parseMoney('5 10')` is `null`, `parseMoney('Spin')` is `null`.
- Click stake `1` balance `100`, then set balance text to `90` and `vi.advanceTimersByTime(250)`. `lastLosingStake()` is `1`. Set stake to `2`, click, and the button listener count is `2`. `chaseToast()?.textContent` is `CHASE_TOAST_TEXT` and `querySelectorAll('.chase-toast').length` is `1`.
- After that loss, click stake `2` with balance moving `90` to `110`. Toast display is `none`. `lastLosingStake()` is `null`.
- After a loss at `5`, click stake `5`. Toast display is not `block`.
- After a loss at `5`, click stake `4`. Toast display is not `block`.
- Set `lastLosingStake` via a real loss at `3`, then click stake `nope`. `lastLosingStake()` is still `3`. Toast display is not `block`.
- Click stake `1` balance `100` and `vi.advanceTimersByTime(5000)` without changing the balance. `lastLosingStake()` is `null`.
- Loss at `1`, raise to `2`, drop balance again, raise to `3`. Still one `.chase-toast`.
- After a loss, set `lockUntil` to `() => Date.now() + 10_000`, click a bigger stake. Toast display is not `block`. `lastLosingStake()` is unchanged. The button listener still runs.
- `shadowRoot.querySelector('style')` text contains `.chase-toast`. `document.head.querySelector('style')` is `null`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @tiltcheck/chrome-extension exec vitest --run tests/unit/chase-warning.test.ts`

Expected: FAIL. Cannot find module `../../src/chase-warning.js`.

- [ ] **Step 3: Write the module**

Create `apps/chrome-extension/src/chase-warning.ts`.

`parseMoney` splits on whitespace, removes commas from each token, then removes every character that is not a digit, dot, or minus. Exactly one token matching `/^-?\d+(\.\d+)?$/` returns `Number(token)`. Anything else returns `null`.

`readField` uses the first `CASINO_SELECTORS` entry where `hostname.includes(entry.domain)` or `entry.domain === '*'`. It reads `betAmount` or `balance` with `querySelector`, then `data-value`, the `value` attribute, or `textContent`, then `parseMoney`.

`installChaseWarning` requires `#tiltcheck-pace-host` with an open shadow root. It appends one `style` (if `.chase-toast` is not already styled) and one `.chase-toast` node. Capture listener: ignore non-spin targets; if `Date.now() < lockUntil()` return without `preventDefault`. If stake or balance is `null`, return without writing `lastLosingStake`. If `lastLosingStake` is a number and stake is greater, set toast `display` to `block`. Poll every 250ms. First different balance: lower stores the stake, higher stores `null`, then stop the poll. At 5000ms with no change, stop the poll and leave the stored stake. `stop()` removes the listener, clears the poll, and hides the toast. It does not remove the host.

Do not edit `spin-pace-lock.ts` in this task.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @tiltcheck/chrome-extension exec vitest --run tests/unit/chase-warning.test.ts tests/unit/spin-pace-lock.test.ts`

Expected: PASS. Pace-lock tests still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/chrome-extension/src/chase-warning.ts apps/chrome-extension/tests/unit/chase-warning.test.ts
git commit -m "feat(extension): warn when the stake climbs after a loss"
```

---

### Task 2: Install with the pace lock

**Files:**
- Modify: `apps/chrome-extension/src/content.ts`
- Modify: `apps/chrome-extension/tests/unit/content.test.ts`

**Interfaces:**
- Consumes: `installChaseWarning` and `ChaseHandle` from `./chase-warning.js`. `PaceLockHandle.lockUntil()` from Task 1.
- Produces: `syncPaceLock(true)` installs the pace lock, then the chase warning with `() => paceLock.lockUntil()`. `syncPaceLock(false)` stops the chase warning, then the pace lock.

- [ ] **Step 1: Write the failing test**

In `content.test.ts`, add:

- Enforcement on (do not store `null` for a missing opt-in key) and a flush: `#tiltcheck-pace-host` shadow root contains `.chase-toast`.
- Enforcement off (`tiltcheck_touch_grass_opt_in: false`): after a spin click and a flush, `.chase-toast` is absent and the pace host is absent.
- `content.ts` source does not contain `triggerTouchGrassTimeout`, `AnalyzerClient`, or `recordBet(`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @tiltcheck/chrome-extension exec vitest --run tests/unit/content.test.ts`

Expected: FAIL. `.chase-toast` is missing when enforcement is on.

- [ ] **Step 3: Wire Core**

In `content.ts`, import `installChaseWarning` and `ChaseHandle`. Hold `chaseWarning` next to `paceLock`. Update `syncPaceLock` only. Do not reflow the file. Do not add a storage key.

```ts
function syncPaceLock(enabled: boolean): void {
  if (enabled && !paceLock) {
    paceLock = installSpinPaceLock();
    chaseWarning = installChaseWarning(document, () => paceLock?.lockUntil() ?? 0);
    return;
  }
  if (!enabled && (paceLock || chaseWarning)) {
    chaseWarning?.stop();
    chaseWarning = null;
    paceLock?.stop();
    paceLock = null;
  }
}
```

Update the copyright date to 2026-10-09 if that line is touched.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @tiltcheck/chrome-extension exec vitest --run tests/unit/content.test.ts tests/unit/chase-warning.test.ts tests/unit/spin-pace-lock.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/chrome-extension/src/content.ts apps/chrome-extension/tests/unit/content.test.ts
git commit -m "feat(extension): install the chase warning with the pace lock"
```

---

### Task 3: Homepage sentence

**Files:**
- Modify: `apps/web/src/lib/home-launch-copy.ts`
- Modify: `apps/web/src/lib/home-launch-copy.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `HOME_LAUNCH.lede` equals the current sentence plus ` If the last spin lost and the next stake is bigger, it says so. The spin still goes through.`

- [ ] **Step 1: Write the failing test**

Change the lede assertion in `home-launch-copy.test.ts` to the full new string. Leave the card, install-step, mock, and `SITE_ONE_LINER` assertions as they are. Update the copyright date to 2026-10-09.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest --run apps/web/src/lib/home-launch-copy.test.ts`

Expected: FAIL. The lede does not yet include the chase sentence.

- [ ] **Step 3: Update the lede**

In `home-launch-copy.ts`, append the sentence to `lede`. Change nothing else. Update the copyright date to 2026-10-09.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest --run apps/web/src/lib/home-launch-copy.test.ts`

Expected: PASS. 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/home-launch-copy.ts apps/web/src/lib/home-launch-copy.test.ts
git commit -m "docs(web): mention the chase warning on the homepage"
```
