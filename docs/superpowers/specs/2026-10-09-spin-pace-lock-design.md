<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 -->

# Spin pace lock — design spec

Status: Approved (design)
Owner: founder (solo)
Surface: Chrome extension Core on a casino tab (`apps/chrome-extension/src/content.ts`)
Date: 2026-10-09

This replaces the side-panel design in `docs/superpowers/specs/2026-10-09-touch-grass-side-panel-design.md`. Do not build that panel.

## Problem

A full-screen halt after a fast mash freezes the tab and does not show a slower pace. The player clicks faster than the balance can update, then gets stopped. That is frustrating. The help is a two-second gap on the spin button, with the remaining time visible.

## Mission

Every spin goes through. The spin button then locks for two seconds. A countdown chip sits on that button. A click during the lock does not spin and does not add time. One toast names why. At zero the button works, and the next spin starts a fresh two seconds. Calm play gets the same lock. There is no side panel on a phone or a desktop.

## Locked behavior

- `PACE_LOCK_MS` is 2000. It does not read `tiltcheck_touch_grass_duration_ms`.
- The lock is an in-memory timestamp, `lockUntil`, set to `Date.now() + 2000` when an allowed spin goes through. A reload clears it. It is not written to `chrome.storage`.
- A click that is not the spin control does not start the lock, does not show the toast, and is not swallowed.
- A spin click while `Date.now() < lockUntil` is swallowed (`preventDefault` and `stopPropagation`). `lockUntil` does not change.
- The toast shows only for that swallowed click. The text is: No cap, the balance is still catching that last spin.
- One toast. A second swallowed click does not add another. The toast leaves when the lock ends.
- The chip shows `2`, then `1`, using `Math.ceil(remainingMs / 1000)`. It does not show `0`. At zero the chip and the toast leave, and every spin button that this lock disabled is enabled again.
- The casino button's own label is not rewritten.
- Core does not call `triggerTouchGrassTimeout`. The two-minute cover does not fire from Core.
- No layout adds a side panel.
- This path does not construct, sign, or send a transaction. It does not hold funds.

## Spin control

A spin control is an element matching one of these, or a descendant of one:

- `button[class*="bet"]`
- `button[class*="spin"]`
- `[data-action="bet"]`
- `[data-action="spin"]`

The click target uses `closest` against that list. All matches on the page share one `lockUntil`. A control the site redraws while the lock is up is disabled again and the chip moves onto it.

While the lock is up, a 250ms tick disables current matches and repositions the chip. The tick stops at zero.

## Our UI

The toast and the chip are the only injected UI. They live in one open shadow root on a host with `id="tiltcheck-pace-host"`, appended to `document.body`. The stylesheet is inside that shadow root. No pace-lock style tag is added to the casino document.

The host uses `pointer-events: none` so it does not eat the click. The capture listener on the document does the swallowing, and it returns immediately unless the target is a spin control. It does not call `recordClick`.

The chip is positioned from `getBoundingClientRect` of the spin control that started the lock, and it follows that control on the tick. If that node is gone, the chip anchors to another current match. If none exist, the chip is not shown, and a swallowed click still shows the toast.

## Core wiring

`startCoreCircuitBreaker` in `apps/chrome-extension/src/content.ts` no longer constructs `TiltDetector`, no longer registers the document listener that only calls `recordClick`, and no longer runs the two-second poll that calls `triggerTouchGrassTimeout`.

When `enforcementEnabled` is false, the pace lock is not installed. The default stays on (`tiltcheck_touch_grass_opt_in` unset means enabled). This work does not add a new setting.

`apps/chrome-extension/src/tilt-detector.ts` and `apps/chrome-extension/src/touch-grass-timeout.ts` stay. `apps/chrome-extension/src/pro-monolith-bootstrap.ts` stays unchanged. Pro stays off.

`apps/web/src/app/touch-grass/page.tsx` stays unchanged.

## Homepage

Homepage copy lives in `apps/web/src/lib/home-launch-copy.ts`. `SITE_ONE_LINER` in `apps/web/src/lib/site-copy.ts` is the homepage meta description and was updated with the homepage.

Lede:

Download the zip and load it in Chrome. Open a casino you already use. Every spin locks the spin button for two seconds. The countdown sits on the button. Click it early and the click does not go through.

Card one title: Locks the spin.

Card one body: Every spin goes through, then the spin button locks for two seconds. Other clicks on the page do not start the lock.

Card two title: Swallows the mash.

Card two body: A click while the button is locked does not spin and does not add time. The line is: No cap, the balance is still catching that last spin.

Card three title: Gives the button back.

Card three body: At zero the button works again. The next spin starts a fresh two seconds.

Install step three:

Open a supported casino and play. Every spin locks the button for two seconds.

Mock status: Button locked. Mock signal: 2s. Mock footer: Balance still catching up. The chip line "Does not touch your wallet" stays.

The homepage must not say the tab is covered, must not say two minutes, and must not say the pause cannot be closed early.

## Tests

Unit tests with jsdom. Fake timers are allowed. Production `PACE_LOCK_MS` stays 2000.

- An allowed spin sets the lock for 2000ms, disables the button, and the chip shows 2.
- After 1000ms the chip shows 1 and the button is still disabled.
- A spin click during the lock does not run the spin control's own click listener, does not change `lockUntil`, and shows one toast with the locked line.
- A second spin click during the lock still leaves one toast.
- At 2000ms the button is enabled, its original text is unchanged, and the chip and the toast are gone.
- A click outside the spin control does not set a lock.
- Two allowed spins, with the lock expired between them, each get their own 2000ms.
- A spin button inserted during the lock is disabled before the lock ends.
- The pace-lock stylesheet is inside the shadow root and not on `document.head` or as a direct child of `document.body`.
- Core's circuit breaker no longer calls `triggerTouchGrassTimeout`.
- `home-launch-copy.ts` matches the strings in this spec.

## Out of scope

The side panel, the two-minute cover on the Core path, checkmarks, opening `/touch-grass` from the casino tab, rewriting `BREAK_MESSAGES`, editing Pro, and any tip or wallet work.
