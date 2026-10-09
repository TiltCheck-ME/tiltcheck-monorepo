<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-09 -->

# Touch Grass side panel — design spec

Status: Approved (design)
Owner: founder (solo)
Surface: Chrome extension Touch Grass overlay (`apps/chrome-extension/src/touch-grass-timeout.ts`)
Date: 2026-10-09

## Problem

Touch Grass already covers the casino tab for two minutes. The player who is in "don't stop me" mode has nothing to look at except the pause. Sending them to `/touch-grass` hides the countdown. The countdown is the leash. They need something to do that is not a spin, while the timer stays on screen.

## Mission

The haze stays a full-screen lock. The center stays the countdown, the breath ring, and the rotating line. A side panel offers three off-screen actions for that cover. The player can see the clock run out while they do one.

## Locked behavior

- The cover still lasts `TOUCH_GRASS_DURATION_MS` (120000). There is no early exit, no minimum shorter than that, and no path that lifts the haze because a label was seen.
- A second call to `triggerTouchGrassTimeout` while a cover is up does nothing. It does not add a second panel and it does not reset the clock.
- Escape, clicks, and the labels do not dismiss the cover. The existing capture blockers stay.
- The panel does not navigate, does not call the network, and does not link to a casino or to `/touch-grass`.
- `/touch-grass` stays the recovery page it already is. This work does not edit `apps/web/src/app/touch-grass/page.tsx`.
- The public homepage stays as written. `apps/web/src/lib/home-launch-copy.ts` keeps the sentence "You cannot close it early."
- The existing headline, breath hint, foot line, and `BREAK_MESSAGES` stay. This work does not rewrite them.

## Panel copy

One line, then three labels. The line is:

It's giving 'don't stop me.' Cool. Clock's still running. These are here so you don't just sit there and degen the rest.

The labels are plain text. They are not buttons, links, inputs, or checkboxes. They have no click handler and no `role="button"`.

## Lists

List A, in this order:

1. Stand up
2. Get water
3. Text a person

List B, in this order:

1. Stand up
2. Look out a window
3. Unclench your hands

One cover shows one list for the whole two minutes. The list does not rotate while that cover is up. The next cover shows the other list.

## Layout

The panel is an extra column inside the existing `#tiltcheck-lockdown-root` dialog. It is not a new page and it does not replace the center.

When the viewport is at least 960px wide, the center column stays on the left and the panel sits on the right, beside the timer.

Below 960px, the existing center column renders first and the panel renders under it. The countdown stays above the labels.

## Memory

The extension stores the list it is showing in `chrome.storage.local` under the key `tiltcheck_touch_grass_last_action_list`. The only legal values are `a` and `b`.

When a cover starts:

1. Read the key.
2. If the value is `a`, the next list is B. If the value is `b`, the next list is A. If the key is missing, unreadable, or any other value, the next list is A.
3. Write the list that will be shown.
4. If that write fails, show list A for this cover.
5. Render the panel, then start the countdown.

A page reload destroys the haze, because the overlay lives in the page. The next time the cover fires, that fire is a new cover and it uses the other list. The in-memory cover never swaps lists on its own.

## Tests

Unit tests on the extension. A test may pass a short `durationMs`. The production default stays 120000.

- The panel shows the locked line and exactly three labels.
- No panel node is a `button`, `a`, or `input`, and none has `role="button"`.
- Empty storage shows list A and stores `a`.
- The following cover shows list B and stores `b`.
- The cover after that shows list A again.
- A failed read, or a stored value other than `a` or `b`, shows list A.
- A failed write shows list A.
- A second trigger while the cover is up leaves one panel and does not reset the timer.
- Clicking a label does not remove `#tiltcheck-lockdown-root`.
- The haze stays until the supplied duration hits zero.

## Out of scope

Rewriting the rotating signal lines, changing the two-minute default, adding a dismiss control, adding checkmarks, opening `/touch-grass` from the overlay, and any tip or wallet work.
