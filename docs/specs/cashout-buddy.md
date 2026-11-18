<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 -->

# Cash-out Buddy + Redemption Guard

Status: steps 1-3 (extension) built on `feat/cashout-buddy`. Step 4 (Discord buddy) is spec only. Step 5 (heater tip cap) is a follow-up note.

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
4. The prompt shows no amounts. "Ping my buddy" is hidden until step 4 ships.

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

### 2.4 Cash-out Buddy (spec only)
1. Pairing is mutual opt-in in Discord:
   - `/buddy invite @user` -> invitee gets a DM with Accept / Decline.
   - Accept -> pair is active both ways (A is B's buddy and B is A's, unless one later sets one-way).
   - `/buddy unpair [@user]` -> either side ends it, no notice text beyond "pair ended".
   - `/buddy status` -> ephemeral list of your active pairs.
2. Player links Discord in the extension (existing OAuth flow, `workerSession`).
3. When a walk-away line is hit and the player taps "Ping my buddy" (or, if they opt in per pair, automatically on walk-away hit), the bot DMs each active buddy:
   `<display name> hit their walk-away.` with buttons **Nudge** and **Join voice**.
   - Nudge -> bot DMs the player "Your buddy says: take the W." (fixed copy, no free text in v1).
   - Join voice -> link button to the pair's chosen voice channel (or the TiltCheck accountability VC as default).
4. No amount, game, site, balance, or tilt score ever appears in any buddy-facing message.

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
| Buddy pairs (spec) | backend store (see 4) | `{ user_discord_id, buddy_discord_id, status, created_at, auto_ping }` | Server only |
| Buddy ping (spec) | extension -> worker -> Discord DM | `{ type: 'buddy_ping', reason: 'walk_away' or 'tilt' }` | Yes, no amounts |

Rules:
- "Lock half" computes its amount locally (half session profit when up, else half the balance) and only hands it to the casino's own vault (`triggerAutoVault`) on that tab. If the site has no vault adapter or it fails, it routes to the cashier.
- `buildBuddyPingMessage()` is the only allowed ping payload; a unit test pins its shape.
- The existing `user_buddies.alert_thresholds` default in `packages/database/schema.sql` (`losses_in_24h_sol`, `tilt_score_exceeds`) must not be used to put numbers in buddy messages.
- Known leak to fix before any buddy wiring: `pro-monolith-bootstrap.ts` `checkBagFumble()` passes `balance`, `initialBalance`, `peakBalance` to `notifySupportIntervention()` -> `sidebar.notifyBuddy()`. `notifyBuddy` is a no-op today (`decoupled-sidebar.ts`), so nothing leaves the tab, but those fields must be stripped before `notifyBuddy` is ever connected.

## 4. Extension-to-bot messaging (spec)

What exists today:
- The extension's only live backend is the `collectclock-api` Cloudflare Worker (`EXT_CONFIG.WORKER_API_URL`, `WORKER_ROUTES` in `apps/chrome-extension/src/config.ts`): `POST /auth/token` (Discord access token -> `workerSession`), `GET /me`, `POST /logout`. Every other path answers 200 + health JSON, so only listed routes may be called.
- `background.js` stores `workerSession` after Discord OAuth and talks to the worker.
- The Discord bot (`apps/discord-bot`) is archived (2026-11-04); its `/buddy link|unlink|status` command and `user_buddies` table live in `archive/apps/discord-bot/src/commands/buddy.ts` and `packages/database/schema.sql`.

Proposal (reuse the worker, no long-running bot process):
1. Worker routes (Bearer `workerSession`):
   - `POST /buddy/ping` body `{ reason: 'walk_away' | 'tilt' }`. Worker resolves the caller's Discord id from the session, looks up active buddies, rate-limits (1 ping per pair per 15 min), and DMs each buddy via Discord REST (`POST /users/@me/channels`, then `POST /channels/{id}/messages` with components). Rejects any extra body fields.
   - `GET /buddy/status` -> `{ paired: boolean, count: number }` so the popup can show/hide "Ping my buddy".
2. Discord interactions over HTTP on the same worker (`/discord/interactions`, Ed25519 signature check): slash commands `/buddy invite|accept|unpair|status` and the Nudge / Accept / Decline buttons.
3. Storage: whatever the worker already uses (D1/KV/Durable Object), table/keys mirroring `user_buddies` minus `alert_thresholds`.
4. Extension wiring once the routes exist:
   - `config.ts`: add `WORKER_ROUTES.BUDDY_PING`, `WORKER_ROUTES.BUDDY_STATUS`, `BACKEND_FEATURES.buddyPing`.
   - `background.js`: handle runtime message `buddy_ping` -> POST with `workerSession`; no-op when signed out.
   - `choices-screen.ts`: replace the `BUDDY_PING_AVAILABLE` constant with the feature flag + `/buddy/status`.
   - Popup: "Auto-ping my buddy when I hit a walk-away line" toggle (default off).

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

Spec only (later):
- Worker (`collectclock-api`, source not in this repo): `/buddy/ping`, `/buddy/status`, `/discord/interactions`, buddy storage.
- `apps/chrome-extension/src/config.ts`, `src/background.js`, `src/choices-screen.ts`, `src/popup.*`: wiring listed in 4.4.
- `pro-monolith-bootstrap.ts`: strip amounts from `checkBagFumble` intervention data.

## 6. Test plan

Automated (vitest, jsdom), in this branch:
- Walk-away: sanitizing (blank/zero/negative/NaN/cap), up/down evaluation, baseline, fire-once, re-arm on edit, currency toggle, poll -> choices screen opens with no amounts, storage round-trip.
- Choices: button set (no buddy button while off), no amounts rendered, each choice's effect (cashier, vault then cashier fallback, Touch Grass 5 min only when picked, keep playing), Escape, cooldown/no stacking, log shape has only `ts/trigger/choice/host`, buddy payload shape.
- Content: rapid clicks and tilt-signal events open choices and do not open the lockdown overlay; picking Touch Grass starts it; explicit `tiltcheck-trigger-timeout` still pauses.
- Redemption guard: first click blocked + dialog, Reverse disabled through the hold then lets exactly one click through, Keep never reaches the site, Enter key path, dynamic buttons tagged not disabled, toggle off, log has no amounts.
- Core options: auto-lock default off, walk-away targets loaded and sanitized.

Manual before release:
- Load `dist/` unpacked; on stake.us and one sweeps site (e.g. pulsz): set lines, play to cross each, check prompt, each choice, popup state after reload.
- Find a real pending redemption with a cancel button on 2+ supported sites; confirm the hold and pass-through work against React handlers.
- Keyboard-only run of both dialogs; screen reader announces dialog titles.

## 7. Open questions

1. Where does the `collectclock-api` worker source live, and is it the right home for buddy pairing + Discord HTTP interactions now that the bot process is archived?
2. Profit-lock stage 2 (60 s forced brake at the profit floor) and the 5-minute "below cash-out minimum" break are still automatic. They are not tilt-score locks, so they were left alone. Convert them to the choices screen too?
3. Players who already stored `tiltcheck_auto_lock_on_tilt = true` (the toggle used to default on) keep the 24h lock. Reset everyone to off once, or honor the stored value?
4. "Lock half" = half session profit when up, half balance otherwise, via the site vault or cashier fallback. Right call? And should the walk-away baseline survive page reloads (today it resets on each load)?
