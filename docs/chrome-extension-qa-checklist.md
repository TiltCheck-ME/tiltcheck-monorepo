# Chrome Extension QA Checklist

Use this checklist before shipping updates to `apps/chrome-extension`.

## Preflight

- Reload extension in `chrome://extensions` (Developer mode on).
- Open a supported site tab (`stake`, `roobet`, etc.).
- Click the extension icon to confirm sidebar opens.

## Core Sidebar Behavior

- Icon click toggles sidebar on/off.
- `Minimize` switches to rail mode; `Expand` restores full width.
- `Hide` closes sidebar.
- Page content margin adjusts correctly when open/minimized/hidden.

## Preference Persistence

- Minimize sidebar, refresh tab, re-open sidebar -> stays minimized.
- Toggle `Show Pro Tools`, refresh tab -> same Pro Tools state persists.

## Simple vs Pro Tools

- Default state is simple mode (Pro tools hidden).
- `Show Pro Tools` reveals advanced controls.
- `Hide Pro Tools` hides advanced controls and closes advanced panels.

## Auth + Demo

- Demo mode still loads without login.
- `Connect Discord` is visible in sidebar during demo mode.
- After auth, account strip reflects connected state.

## Brand + Voice Consistency

- Header/actions use clear labels and non-corporate wording.
- Confirm key copy appears:
  - `Live Signals`
  - `Show Pro Tools` / `Hide Pro Tools`
  - `Community Signal`
  - `Network issue. Try again.`
- Footer tagline appears (not as headline): `Made for degens, by degens.`

## Empty + Error States

- Fairness history empty state renders helpful text.
- Vault timeline empty state renders helpful text.
- Simulated API/offline issues show calm, actionable language:
  - `...unavailable right now`
  - `...did not...`
  - `Try again.`

## Smoke Tests

From `apps/chrome-extension`:

- `npm run build`
- `npx vitest run tests/unit/message-contracts.test.ts`

Expected:

- Build succeeds.
- Message contract tests pass.

## Ship Gate

Only ship when all checklist sections pass.
