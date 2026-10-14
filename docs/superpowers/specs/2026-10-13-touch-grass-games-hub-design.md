<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 -->

# Touch Grass games hub — design spec

Status: Draft (awaiting founder review of this file)
Owner: founder (solo)
Surface: `apps/web` `/touch-grass`, Pro overlay in `apps/chrome-extension`, trivia via `apps/degens-activity` + `apps/game-arena`, DA&D via TiltCheck-ME/DegensAgainstDecency
Date: 2026-10-13

Tracking: GitHub issues and PRs only. No Notion board this cycle.

`/touch-grass` stops being the crisis page and becomes the off-ramp games hub. Crisis copy and 1-800-GAMBLER leave the main column and live on the site footer / legal only.

## Problem

`/touch-grass` today is a recovery lecture: stop playing, tell someone, call 1-800-GAMBLER. Getting-started labels it Help. That is a real page, and it is the wrong page for someone who already hit the brakes and needs something to do that is not a spin.

TiltCheck already has the substitute games: Live Trivia (degens-activity / game-arena / `/tools/degens-arena`) and Degens Against Decency (`TiltCheck-ME/DegensAgainstDecency`). They are scattered. The Pro overlay covers the casino tab for about two minutes and currently gives the player a countdown and nothing else. The superseded side-panel spec refused to navigate or open `/touch-grass`. That leftover is why the pause feels like a blank wall.

## Mission

Make `/touch-grass` the games hub for two titles: Live Trivia and Degens Against Decency. Embed the clients on that URL. When a trivia drop is actually running, say so. During the Pro cover, iframe the hub in pause mode so the player has a table to sit at while the clock runs. The haze still owns the casino tab. The countdown still owns the leash.

## Locked decisions

- Replace the crisis page. Do not stack crisis + games. Do not keep `/touch-grass` as Help.
- V1 titles: Live Trivia and Degens Against Decency only. Royale, dad-bot, trivia.live as a separate PWA, and catalog cards for other repos stay out.
- Promote live drops only when a round is actually running. Honesty required. Empty feed is not a fake jackpot.
- Play surface: embed same-origin clients on `/touch-grass`. Discord Activity iframes on tiltcheck.me are not the plan.
- Approach B: same-origin shells. Overlay iframes `/touch-grass?mode=pause`. Pause mode hides treasury, jackpot, and join-drop CTAs until the timer ends.
- Overlay handoff is during the cover, not after. Closing the iframe does not lift the haze.
- 1-800-GAMBLER and the old stop-playing copy move to footer / legal only. Not the hub hero.
- Guests can land and watch. Joining a live table uses the auth those clients already have. No new login. No wallet. No custody. No tip rail on this page.
- Core two-second spin lock, Cooldown, `#541`, `#542`, and `@solana/pay` 1.x are out of scope.

## Surfaces

### Public hub — `apps/web/src/app/touch-grass`

Two panes. Copy is degen and blunt: this is the off-ramp, not therapy.

- `/touch-grass` — hub chrome, live-drop badge, two embeds.
- `/touch-grass/trivia` — same-origin trivia client (degens-activity / game-arena stack, rewrite or same-origin iframe).
- `/touch-grass/dad` — same-origin DA&D client. Vendor or port from `TiltCheck-ME/DegensAgainstDecency`, or proxy a host we control that sets `frame-ancestors` to `https://tiltcheck.me`. If the card client is still Discord-only when this ships, the dad pane is an honest "open in Discord" card. The hub still ships. DA&D does not block Trivia.

Getting-started, sitemap, and any Help label that points here get rewritten to games hub / off-ramp. `/tools/degens-arena` 307s to `/touch-grass/trivia`. One story.

### Live state

Round state has one source of truth: the trivia manager API that `apps/degens-activity` already consumes from `apps/game-arena`. The hub does not invent a second feed and does not scrape Discord. If that API says a round is live: LIVE DROP, game name, start time, join path on the public hub only. If it says idle: "No drop running. Play a practice table or wait." `soon™` is sarcasm for an empty feed, not a countdown we invented. If the API is down: "round status unknown." Never paint LIVE from stale copy.

### Pro overlay — `apps/chrome-extension/src/touch-grass-timeout.ts`

The cover still lasts `TOUCH_GRASS_DURATION_MS` (120000). Escape, clicks, and iframe close do not dismiss it. A second trigger while a cover is up still does nothing.

The cover chrome stays: countdown, existing blockers. It adds an iframe to `https://tiltcheck.me/touch-grass?mode=pause` (dev: the local web origin). `mode=pause` is a query flag only. It does not mint a session, unlock Pro, or skip the timer.

Casino CSP may block `frame-src` to tiltcheck.me. If the iframe fails to load, fall back to the local no-network prompt set (stand up / get water / text a person). The cover never dies because an embed failed.

## Pause mode

`?mode=pause` on the hub:

- Renders Trivia and DA&D embeds.
- Hides treasury, jackpot, `/pay/jackpot`, and join-drop CTAs even if the feed says LIVE.
- Does not show 1-800-GAMBLER in the main column.
- Does not link to a casino.

After the timer ends, the player is back on the casino tab. They can open `/touch-grass` in a normal tab if they want the live drop. The overlay does not auto-navigate there when time is up.

## Data flow

```
overlay cover
  -> iframe GET /touch-grass?mode=pause
  -> hub fetches round status (existing endpoint)
  -> pause UI hides money CTAs
  -> embeds load /touch-grass/trivia and /touch-grass/dad

public GET /touch-grass
  -> same round status
  -> LIVE DROP badge + join path only when feed says live
  -> embeds load the same shells
```

No new auth service. Discord/activity tokens stay inside the existing clients. The hub does not pass casino cookies, wallet keys, or tip payloads into the embeds.

## Errors

| Failure | Behavior |
| :--- | :--- |
| Arena/trivia feed down | "round status unknown." No LIVE badge. |
| One embed 404/timeout | That pane: retry + Discord outbound. Other pane still works. |
| Casino CSP blocks overlay iframe | Local prompt fallback. Countdown stays. Cover stays. |
| DA&D web client not ready | Honest Discord card. Trivia still embeds. |
| Player closes iframe | Haze stays. Timer stays. |

## Testing

- Web copy/unit: `/touch-grass` is a games hub, not crisis Help. Main column does not include 1-800-GAMBLER.
- Getting-started no longer labels `/touch-grass` as Help.
- Sitemap entry title can stay "Touch Grass"; description must not call it a crisis page.
- `mode=pause` hides treasury/jackpot/join-drop strings in the hub chrome.
- Overlay: iframe `src` includes `mode=pause`; duration unchanged; iframe teardown does not dismiss the cover.
- Optional Playwright: `/touch-grass` shows two panes and empty-round copy when the feed is empty.

## Threat / RG notes

- Iframe targets are our origin only. No casino click-through from hub or overlay.
- No AutoClaimer. No custody. No tip rail.
- Drops are opt-in on the public hub after the player leaves pause mode. Pause mode is entertainment during a lock, not a payout surface.
- Content-script iframe to tiltcheck.me is a third-party frame on a casino origin. Treat it as untrusted to the casino, not as a privileged bridge. Do not forward casino DOM, cookies, or balances into the hub.
- Rollback: revert the hub page to the previous recovery copy and remove the overlay iframe. Overlay cover duration and blockers stay.

## Out of scope

- Core two-second spin lock default.
- Chase-warning slider / enforcement wiring.
- TiltCheck Royale, trivia.live PWA, dad-bot as a hub tile.
- Closing `#541` or `#542`.
- Prize-bearing trivia legal review. This spec allows a LIVE DROP badge when a round is live. It does not invent new payout rules.
- Bumping `@solana/pay` to 1.x.

## Success

A tilted degen who hits Pro Touch Grass can play Trivia or DA&D without spinning. They cannot cash a drop from inside the cover. A degen who opens tiltcheck.me/touch-grass on purpose sees the same two tables and a live badge only when a drop is actually running. The crisis lecture is gone from that URL.
