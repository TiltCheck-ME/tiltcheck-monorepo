<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 -->

# Cash-out Buddy + Redemption Guard

Status: steps 1-3 (extension) built on `feat/cashout-buddy`. Step 4 (Cash-out Buddy) is built minimally: pairing + plain-text ping in the `collectclock-api` worker (`workers/collectclock-api`, not deployed) and wired in the extension. Buttons, auto-ping and push are open questions (section 7). Step 5 (heater tip cap) is a follow-up note.

## 1. Problem

- TiltCheck locked players out of the whole site off a tilt score. That reads as punishment, and it hit the founder's own sessions too. New rule: **no automatic full-site lockouts from inferred tilt. Offer choices.** Locks the player set up themselves stay as they are.
- Reddit research on player pain points keeps landing on two:
  1. **Giving back wins.** The most upvoted fix is a win target set before the session plus "a good friend that will remind you".
  2. **Redemption stalling.** Casinos sit on pending redemptions/withdrawals and leave a "Cancel" / "Reverse" button live, betting the player reverses and plays the money back.
- Privacy rule (non-negotiable): **never broadcast wins, balances, or amounts to anyone else.** It invites begging and worse. A buddy ping carries no amount, no game, no balance, no site.

## 2. User flows

### 2.1 Walk-away number (built)
1. Popup > Settings > "Walk-Away Number": player enters "Walk away when up ($)" and/or "Walk away when down ($)", hits "Set lines". Either can be blank. Can be changed mid-session.
2. On a supported casino tab, the first readable balance is the session baseline.
3. When `balance - baseline >= up` or `baseline - balance >= down`, a private prompt opens: **Cash out / Lock half / Ping my buddy / Touch Grass 5 min / Keep playing (logged)**. Each side fires once per session; editing a line re-arms that side.
4. The prompt shows no amounts. "Ping my buddy" shows only while the player has an active buddy (see 2.4).

### 2.2 Tilt: choices instead of lockouts (built)
Every place that used to force a Touch Grass overlay or betting lock off a tilt inference now opens the same choices screen (headline "Tilt check. Your call."):
- Core: rapid-click bursts, `tiltcheck-tilt-signal` events, loss-chase stake ramps.
- Pro monolith: tilt score >= 80, `cooldown` intervention (was a forced 5-minute betting lock), `stop_loss_triggered` intervention.
- The 24h "auto-lock on Level 3+ tilt" now defaults **off** and runs only if the player switches it on (it is then a lock they set).
- Unchanged (player-set or explicit): per-game / per-provider / per-casino self-exclusion, on-chain cooldowns and the deposit barrier during them, the popup/runtime `trigger_touch_grass` request, the `tiltcheck-trigger-timeout` event, user-clicked "Take Break" buttons.
- The screen does not stack, does not open during a Touch Grass pause, and the same trigger will not reopen it for 3 minutes.

### 2.3 Redemption guard / PocketCheck (built)
1. On supported casinos (manifest content-script matches), a click, pointer-down, or Enter/Space on a cancel/reverse control for a pending withdrawal/redemption is intercepted. Detection reuses the existing selector/text/context matcher.
2. A confirm step opens: "This is money you already won. Reverse it?" with **Keep my cashout** (focused) and **Reverse it** (disabled, counts down 10 s).
3. Keep / Escape: closes, nothing reaches the site. Reverse (after the hold): the original control gets exactly one click through. The next attempt is guarded again.
4. Each outcome is logged privately. The control is no longer disabled or greyed out; the player still decides.

### 2.4 Cash-out Buddy (built, minimal; worker not deployed)
1. Pairing is mutual opt-in through invite codes, in the extension popup (Settings > Cash-out Buddy). Player must be signed in with Discord (`workerSession`).
   - **Invite code**: `POST /buddy/invite` -> one-time code `ABCD-EFGH`, valid 24 h (placeholder). A new code replaces the old one.
   - **Accept code**: the other player enters it -> `POST /buddy/accept`. The pair is active both ways.
   - **Status**: `GET /buddy/status` -> buddies by display name (ids are hashed, never raw Discord ids).
   - **Unpair**: either side, `POST /buddy/unpair`; ends it on both sides. No message is sent (open question).
   - Max 3 buddies per player (placeholder).
2. When a walk-away line is hit (or the tilt choices screen opens) and the player taps **Ping my buddy**, the extension sends `{ type: 'buddy_ping', reason }` to the background, which rebuilds the body from `reason` alone and calls `POST /buddy/ping`.
3. The worker DMs each buddy from the bot, plain text only:
   - `<display name> hit their walk-away.` (reason `walk_away`)
   - `<display name> could use a nudge.` (reason `tilt`)
   At most 1 ping per 10 min per pair (placeholder, from the brief's example), plus 30 pings/day per player as abuse guard. Any body field besides `type`/`reason` is a 400.
4. No amount, game, site, balance, or tilt score ever appears in any buddy-facing message.
5. Not built (open questions): Nudge / Join voice buttons, Discord slash commands, auto-ping on walk-away, Web Push for pings, any message on accept/unpair.

### 2.5 Heater tip cap (follow-up, not built)
JustTheTip idea: during a heater, cap how much a player can tip out per session so a hot streak doesn't turn into rain-everyone generosity they regret. Needs its own spec in `modules/justthetip` once that module's direction is settled (justthetip-bot is archived).

## 3. Data model and privacy

| Data | Where | Contents | Leaves device? |
| --- | --- | --- | --- |
| `tiltcheck_walkaway_up`, `tiltcheck_walkaway_down` | `chrome.storage.local` | number or null | No |
| Session baseline | content-script memory (per page load) | number | No |
| `tiltcheck_choice_log` | `chrome.storage.local`, ring buffer 100 | `{ ts, trigger, choice, host }` | No |
| `tiltcheck_redemption_guard_log` | `chrome.storage.local`, ring buffer 100 | `{ ts, host, outcome: kept/reversed }` | No |
| `activityFeed` lines | `chrome.storage.local` (existing) | "Your call: you chose X" (no amounts) | No |
| Buddy pairs | worker KV `buddy:u:<discordId>` | `{ pairs: [{ u: buddyDiscordId, at }] }`, both sides | Server only |
| Invite codes | worker KV `buddy:inv:<code>`, `buddy:myinv:<discordId>` | `{ from, exp }` / `{ code, exp }`, TTL 24 h | Server only |
| `tiltcheck_buddy_paired` | `chrome.storage.local` | boolean, set by the background from `/buddy/status` | No |
| Buddy ping | extension -> worker -> Discord DM | `{ type: 'buddy_ping', reason: 'walk_away' or 'tilt' }` | Yes, no amounts |

Rules:
- "Lock half" computes its amount locally (half session profit when up, else half the balance) and only hands it to the casino's own vault (`triggerAutoVault`) on that tab. If the site has no vault adapter or it fails, it routes to the cashier.
- `buildBuddyPingMessage()` is the only allowed ping payload; a unit test pins its shape.
- The existing `user_buddies.alert_thresholds` default in `packages/database/schema.sql` (`losses_in_24h_sol`, `tilt_score_exceeds`) must not be used to put numbers in buddy messages.
- Fixed: `notifySupportIntervention(type)` now takes the intervention kind only, and `notifyBuddy` takes `toBuddySafeEvent(type)` = `{ type }`. `checkBagFumble()` no longer passes `balance`/`initialBalance`/`peakBalance`; tilt/auto-lock calls no longer pass risk, indicators, duration or wallet. `notifyBuddy` is still a no-op and is not connected to the worker. `tests/unit/buddy-privacy.test.ts` pins this.
- The worker also refuses amount-like fields (`amount`, `balance`, `profit`, `game`, `casino`, `site`, ...) and any other extra field on `/buddy/ping`.

## 4. Extension-to-worker messaging (built)

- Worker: `collectclock-api`, source now versioned at `workers/collectclock-api/` (deployed by hand with `deploy.sh`; never connect a Git build). New file `src/buddy.js`, routed from `src/index.js` for `/buddy/*`. Auth is the existing Bearer `workerSession` (`sess:<token>` -> Discord id). Storage is the existing KV binding `CC` (keys `buddy:*`). DMs go through the existing `BOT_TOKEN` (`POST /users/@me/channels`, then `POST /channels/{id}/messages`, `allowed_mentions: { parse: [] }`). No new secret, binding or cron.
- Extension:
  - `config.ts`: `WORKER_ROUTES.BUDDY_STATUS|INVITE|ACCEPT|UNPAIR|PING`, `BACKEND_FEATURES.buddyPing = true`.
  - `background.js`: runtime messages `buddy_status|buddy_invite|buddy_accept|buddy_unpair|buddy_ping` -> worker with `workerSession`; bodies rebuilt from validated fields only. A reply that is the old worker's health JSON counts as "not live yet". Keeps `tiltcheck_buddy_paired` in storage (status, accept, unpair, 409 on ping, after sign-in).
  - `choices-screen.ts`: `BUDDY_PING_AVAILABLE` replaced by `isBuddyPingAvailable()` (feature flag + paired flag, mirrored by `syncBuddyPingAvailability()` from content.ts and the Pro bootstrap).
  - `buddy-panel.ts` + `popup.html`: Cash-out Buddy section (invite code, accept code, status, unpair). Logout clears the paired flag.
- Until the new worker is deployed, `/buddy/*` answers with the health JSON, so the popup says it is not live yet and "Ping my buddy" stays hidden.

## 5. File-by-file change list

Built in this branch (`apps/chrome-extension`):
- `src/walk-away.ts` (new): storage keys, sanitizing, `evaluateWalkAway`, `installWalkAwayWatcher` (1 s poll on `readBalance`, baseline, fire-once per side, re-arm on edit, currency-toggle re-baseline).
- `src/choices-screen.ts` (new): private dialog, five choices, 3-minute same-trigger cooldown, Escape to dismiss, private choice log, `computeLockHalfAmount`, `buildBuddyPingMessage`, `BUDDY_PING_AVAILABLE = false`.
- `src/content.ts`: `offerTiltChoices()` replaces Touch Grass on rapid-click, tilt-signal events, and loss-chase; `syncWalkAway()` on boot and storage change; `get_walk_away_state` runtime message.
- `src/pro-monolith-bootstrap.ts`: `offerProTiltChoices()` replaces forced Touch Grass at score >= 80, the `cooldown` intervention lock, and stop-loss; 24h auto-lock call kept but now opt-in.
- `src/core-options.ts`: `DEFAULT_AUTO_LOCK_ON_TILT = false`; `walkAwayTargets` loaded and listed in `CORE_CIRCUIT_BREAKER_STORAGE_KEYS`.
- `src/reverse-withdrawal-shield.ts`: hard disable replaced by confirm step + 10 s hold + allow-once + private log; own dialog excluded from detection.
- `src/pro/containment.ts`: choices and guard dialogs added to safety roots so Pro scanners leave them alone.
- `src/popup.html`, `src/popup.ts`: Walk-Away Number panel; PocketCheck copy; auto-lock toggle labelled opt-in.
- `README.md`: feature list.
- Tests: `tests/unit/walk-away.test.ts`, `tests/unit/choices-screen.test.ts` (new); `reverse-withdrawal-shield.test.ts`, `content.test.ts`, `core-options.test.ts` (updated).

Cash-out Buddy (this branch, second commit):
- `workers/collectclock-api/` (new): worker source copied from the deployed version plus `src/buddy.js`, `test/buddy.test.mjs`, README. `pnpm-lock.yaml`: importer entry.
- `apps/chrome-extension`: `src/config.ts`, `src/background.js`, `src/choices-screen.ts`, `src/buddy-panel.ts` (new), `src/popup.html`, `src/popup.ts`, `src/content.ts`, `src/pro-monolith-bootstrap.ts`, `src/decoupled-sidebar.ts`.
- Tests: `tests/unit/buddy-panel.test.ts`, `tests/unit/buddy-privacy.test.ts` (new); `background.test.ts`, `choices-screen.test.ts`, `config.test.ts` (updated).

## 6. Test plan

Automated (vitest, jsdom), in this branch:
- Walk-away: sanitizing (blank/zero/negative/NaN/cap), up/down evaluation, baseline, fire-once, re-arm on edit, currency toggle, poll -> choices screen opens with no amounts, storage round-trip.
- Choices: button set (buddy button only when paired), no amounts rendered, each choice's effect (cashier, vault then cashier fallback, Touch Grass 5 min only when picked, keep playing), Escape, cooldown/no stacking, log shape has only `ts/trigger/choice/host`, buddy payload shape.
- Content: rapid clicks and tilt-signal events open choices and do not open the lockdown overlay; picking Touch Grass starts it; explicit `tiltcheck-trigger-timeout` still pauses.
- Redemption guard: first click blocked + dialog, Reverse disabled through the hold then lets exactly one click through, Keep never reaches the site, Enter key path, dynamic buttons tagged not disabled, toggle off, log has no amounts.
- Core options: auto-lock default off, walk-away targets loaded and sanitized.

Manual before release:
- Load `dist/` unpacked; on stake.us and one sweeps site (e.g. pulsz): set lines, play to cross each, check prompt, each choice, popup state after reload.
- Find a real pending redemption with a cancel button on 2+ supported sites; confirm the hold and pass-through work against React handlers.
- Keyboard-only run of both dialogs; screen reader announces dialog titles.

## 7. Open questions

Cash-out Buddy (product calls for Jamie; placeholders in code):
- Ping DM: plain text now. Add Nudge / Join voice buttons? Which voice channel? (Real buttons need a Discord interactions endpoint on the worker, or link buttons to a worker page.)
- Limits: 1 ping per 10 min per pair, 3 buddies max, invite code 24 h one-time. Keep or change?
- Should accept/unpair send any message, should pings also go out as Web Push, and should there be an auto-ping-on-walk-away toggle?

Earlier:

2. Profit-lock stage 2 (60 s forced brake at the profit floor) and the 5-minute "below cash-out minimum" break are still automatic. They are not tilt-score locks, so they were left alone. Convert them to the choices screen too?
3. Players who already stored `tiltcheck_auto_lock_on_tilt = true` (the toggle used to default on) keep the 24h lock. Reset everyone to off once, or honor the stored value?
4. "Lock half" = half session profit when up, half balance otherwise, via the site vault or cashier fallback. Right call? And should the walk-away baseline survive page reloads (today it resets on each load)?
