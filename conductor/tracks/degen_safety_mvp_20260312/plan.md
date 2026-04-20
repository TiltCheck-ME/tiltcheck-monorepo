<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 -->

# Implementation Plan: Core Degen-Safety Features

This plan outlines the tasks required to implement the Tilt Gut Check and Solana Wallet Linking features.

## Phase 1: Wallet Linking Backend

- [x] **Task:** Create a new table in Supabase to store the mapping between Discord IDs and Solana public keys.
- [~] **Task:** Implement a new API endpoint in `apps/api` (e.g., `POST /user/wallet`) that accepts a Discord ID, a public key, and a signed message.
    - [ ] Sub-task: The endpoint should verify the signature to ensure the user owns the provided public key.
    - [ ] Sub-task: Upon successful verification, the endpoint should store the Discord ID and public key in the new Supabase table.
- [ ] **Task:** Write unit tests for the signature verification logic.
- [ ] **Task:** Write integration tests for the new API endpoint.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 1: Wallet Linking Backend' (Protocol in workflow.md)

## Phase 2: Wallet Linking Frontend (Discord Bot)

- [ ] **Task:** Create a new `/linkwallet` command in `apps/discord-bot`.
- [ ] **Task:** Implement the command logic:
    - [ ] Sub-task: Generate a unique message for the user to sign.
    - [ ] Sub-task: Display the message to the user with clear instructions on how to sign it.
    - [ ] Sub-task: Implement a modal or other input mechanism for the user to submit their public key and the signed message.
    - [ ] Sub-task: Call the `POST /user/wallet` API endpoint to link the wallet.
    - [ ] Sub-task: Provide feedback to the user on the success or failure of the linking process.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 2: Wallet Linking Frontend (Discord Bot)' (Protocol in workflow.md)

## Phase 3: Tilt Check Backend

- [ ] **Task:** Implement a new API endpoint in `apps/api` (e.g., `GET /user/:discordId/tilt-status`).
- [ ] **Task:** Implement the logic for the endpoint:
    - [ ] Sub-task: Query the Degen Trust Engine (or a simplified version of it) for the user's recent activity.
    - [ ] Sub-task: Implement a simple heuristic to determine if the user is "tilted" or "not tilted".
    - [ ] Sub-task: Return the tilt status.
- [ ] **Task:** Write unit tests for the tilt heuristic logic.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 3: Tilt Check Backend' (Protocol in workflow.md)

## Phase 4: Tilt Check Frontend (Discord Bot)

- [ ] **Task:** Create a new `/tiltcheck` command in `apps/discord-bot`.
- [ ] **Task:** Implement the command logic:
    - [ ] Sub-task: Call the `GET /user/:discordId/tilt-status` API endpoint.
    - [ ] Sub-task: Display the tilt status to the user as an ephemeral message.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 4: Tilt Check Frontend (Discord Bot)' (Protocol in workflow.md)

## Follow-On: Extension-Integrated Session Integrity Guard

Goal: turn the current placeholder into a real extension follow-on that stays inside the Chrome extension session flow, reuses the Seed Health Auditor evidence model, and does not fork into a separate product surface.

### What exists already

- `apps/chrome-extension/src/content.ts` already owns live session start/stop, intervention state, fairness button listeners, and sidebar event flow. This is the correct orchestration point for guard hooks.
- `apps/chrome-extension/src/extractor.ts` already watches live betting DOM changes with polling plus `MutationObserver`, so the guard should piggyback on those page observations instead of creating a separate full-page scanner.
- `apps/chrome-extension/src/game-blocker.ts` already proves the extension can run DOM-watch enforcement loops and inject user-facing blocking UI when a risk condition is hit.
- `apps/chrome-extension/src/sidebar/index.ts`, `apps/chrome-extension/src/sidebar/template.ts`, and `apps/chrome-extension/src/sidebar/types.ts` are the active sidebar surfaces for status/feed updates.
- `packages/types/src/index.ts` plus `packages/shared/src/seed-audit.ts` now provide the right precedent for evidence-first result contracts: `context`, `evidence`, `hygieneFindings`, and summary metadata.

### P0 scope

1. **Add a guard module and wire it into the active content-script lifecycle**
   - Planned files:
     - `apps/chrome-extension/src/content.ts`
     - new `apps/chrome-extension/src/session-integrity-guard.ts`
     - `apps/chrome-extension/src/sidebar/index.ts`
     - `apps/chrome-extension/src/sidebar/template.ts`
     - `apps/chrome-extension/src/sidebar/types.ts`
     - `packages/types/src/index.ts`
   - `content.ts` should create the guard when `startMonitoring()` succeeds, pass `sessionId`, `casinoId`, `gameId`, and current host context, and tear it down inside `_stopMonitoring()`.
   - Sidebar work stays minimal in P0: one status line / feed entry path, not a new standalone page.

2. **Synthetic click detection on betting controls**
   - Hook the same betting controls already found in `setupFairnessListeners()` and the extractor selectors.
   - Record evidence around each relevant click:
     - `event.isTrusted`
     - target selector / control role
     - timestamp and burst interval
     - whether the click fired while the control was disabled or visually blocked
   - P0 finding threshold:
     - untrusted click on a betting control
     - repeated impossible click cadence around the same control
     - click replay immediately after a stop condition was armed

3. **DOM mutation watch around betting controls**
   - Reuse the `MutationObserver` pattern already in `extractor.ts` and `game-blocker.ts`, but scope it to betting controls, amount inputs, autoplay toggles, and main result/balance nodes.
   - Capture high-signal changes only:
     - betting button replaced or re-enabled after extension lock
     - hidden overlay or disabled state removed during cooldown
     - bet amount node swapped or rewritten between click and result capture
   - P0 output is evidence logging plus sidebar/feed visibility, not hard blocking beyond the current intervention flow.

4. **Stop-condition restart detection**
   - Use the existing stop paths in `content.ts` (`startCooldown`, `triggerStopLoss`, `triggerEmergencyStop`, `blockBettingUI`) as the source of truth.
   - Persist a lightweight stop-condition state keyed by session/tab so a page refresh or SPA route change can be compared against the active stop window.
   - Flag when:
     - the page reloads and monitoring resumes before cooldown expiry
     - betting controls come back before the stop window ends
     - a fresh burst of betting input appears immediately after a stop-loss or emergency stop
   - `background.js` is only part of P0 if tab-level persistence is needed across reloads. Keep the first pass content-script-first.

5. **Support/widget script visibility**
   - Detect visible support/chat/help surfaces that can affect intervention escape hatches or operator behavior.
   - P0 should inspect known script / iframe / global markers only, for example:
     - Intercom
     - Zendesk
     - Drift
     - Crisp
     - LiveChat
     - Freshchat
     - Tawk
   - Store whether support tooling was present, visible, or newly injected during the guarded session. Do not build network-heavy tracing in P0.

### Likely P0 contract shape

Mirror the Seed Health Auditor structure instead of inventing a one-off blob:

- `SessionIntegrityContext`
  - `sessionId`
  - `casinoId`
  - `gameId`
  - `source: 'extension'`
  - `capturedAt`
  - `metadata` (`hostname`, `pathname`, `selectorProfile`, `stopConditionActive`)
- `SessionIntegrityEvent`
  - `eventId`
  - `code` (`bet-click`, `synthetic-click`, `bet-control-mutated`, `stop-condition-armed`, `stop-condition-resumed`, `support-widget-visible`)
  - `severity`
  - `timestamp`
  - `selector`
  - `metadata`
- `SessionIntegrityFinding`
  - `code`
  - `summary`
  - `severity`
  - `confidence`
  - `affectedEventIds`
  - `recommendation`
- `SessionIntegrityReport`
  - `context`
  - `category` (`clean`, `watch`, `suspicious`)
  - `events`
  - `findings`
  - `evidence`
  - `generatedAt`

P0 should store and surface this report locally in the extension session flow first. Export/API delivery is a later step.

### Later enhancements, not P0

- Shared export path that lets the sidebar attach integrity findings to the eventual session export bundle.
- Provider-specific control maps in `apps/chrome-extension/src/v2/sensors/*` so mutation watch is less generic on Stake/Roobet/BC.Game.
- Dashboard/API ingestion once the local evidence shape is stable.
- Correlating integrity findings with Seed Health Auditor results for a single session package.
- Stronger restart tracking in `background.js` if content-script-only persistence misses tab replacement cases.
- Rich support-widget inspection using script hostnames plus frame ancestry, if the simple visibility pass proves noisy.

### Explicit non-goals for this follow-on

- No standalone Session Integrity Guard product.
- No separate web app or random markdown surface.
- No operator-agnostic “bot detector” claims without extension evidence.
- No hard implementation of every enforcement path in this planning task.
