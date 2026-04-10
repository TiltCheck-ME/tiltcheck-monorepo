<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10 -->

# TiltGuard Chrome Extension — Features Reference

---

## Tilt Detection

TiltGuard monitors betting behavior for the following indicators:

- **Rage Betting**: Rapid consecutive bets with less than 2 seconds between them.
- **Loss Chasing**: Increasing bet sizes following a loss streak.
- **Fast Clicks**: Erratic clicking patterns outside normal session rhythm.
- **Bet Escalation**: Individual bet exceeds 5x the session average.
- **Duration Warning**: Session has exceeded 1 hour of continuous play.

Severity levels:

| Level    | Meaning                          |
|----------|----------------------------------|
| Low      | Minor concern, informational     |
| Medium   | Moderate concern, worth noting   |
| High     | Significant concern, review now  |
| Critical | Immediate action recommended     |

---

## Session Tracking

Real-time metrics in the sidebar:

- **Duration**: Total session time.
- **Bets**: Count of bets placed.
- **Wagered**: Cumulative amount bet.
- **P/L**: Net profit or loss for the session.
- **RTP**: Return to Player percentage calculated from session data.
- **Tilt Score**: 0–100 risk score driven by active tilt indicators.

---

## P/L Graph

Visual profit/loss chart rendered in the sidebar:

- Positive balance shown in green.
- Negative balance shown in red.
- Updates with each detected bet event.

---

## Vault Integration

Smart vault recommendations to lock in winnings:

- Auto-recommendation when balance reaches 5x the starting amount.
- Stop-loss alert at 50% balance loss from session peak.
- Real-world comparison: converts profit into tangible spending equivalents.
- One-click vaulting to move funds to the TiltCheck vault.

---

## License Verification

Automatic casino license check on page load:

- Scans page footer for license text.
- Matches against known legitimate authorities.
- Tier classification:
  - **Tier 1**: UKGC, Malta Gaming Authority, Gibraltar Regulatory Authority.
  - **Tier 2**: Curacao, Kahnawake, Alderney, Isle of Man.
  - **Tier 3**: Anjouan, Costa Rica.
  - **US States**: Nevada, New Jersey, Pennsylvania.

---

## Cooldown Periods

When critical tilt is detected:

- Full-screen overlay blocks access to betting controls.
- Countdown timer shows remaining cooldown duration.
- Default cooldown: 5 minutes.
- Bet buttons are disabled during active cooldown.

---

## Surgical Self-Exclusion

The Surgical Self-Exclusion system lets users block specific games or entire game categories from their session — without needing to close their account.

Key behaviors:

- The `GameBlocker` class in `src/game-blocker.ts` fetches the user's `ForbiddenGamesProfile` from the API on load and re-fetches every 5 minutes.
- It attaches a `MutationObserver` to `document.body` to scan DOM changes in real time.
- When a blocked game is detected, a full-page overlay renders with the user's own exclusion note and a link to the TiltCheck dashboard.
- The overlay includes a session-dismiss option. Dismissing sets the local profile to null, preventing re-injection until the next page load.

Detection runs in this priority order:

1. Page URL (`window.location.pathname + search`) matched against blocked game ID slugs or category keywords.
2. Iframe `src` attributes scanned for blocked game ID slugs.
3. Play/launch buttons with `data-game-id` attribute matched against blocked game IDs.

Supported categories and their matched keywords:

| Category       | Slug Keywords                                    |
|----------------|--------------------------------------------------|
| chicken_mines  | chicken, mines, minefield                        |
| bonus_buy      | bonus-buy, bonusbuy, feature-buy, featurebuy     |
| live_dealer    | live-dealer, live-casino, live_dealer, livecasino|
| slots          | slot, slots                                      |
| crash          | crash, aviator, jetx, spaceman                   |
| table_games    | blackjack, roulette, baccarat, poker, table      |

For the full technical reference, including API endpoints and Discord slash commands, see [docs/surgical-self-exclusion.md](surgical-self-exclusion.md).

---

## Authentication

- **Discord OAuth**: Full features with server-persisted account and session data.
- **Demo Mode**: Local session tracking active; API-dependent features use mock responses.

---

## Data Export

- Exports session data in JSON format.
- Download is local-only — no data is sent to external servers without explicit consent.

---

## Sidebar Interface

The sidebar panel contains:

1. Header: minimize/expand toggle, settings access.
2. User bar: account identity and tier status.
3. Active session metrics grid.
4. P/L graph.
5. Activity feed: recent events and alerts.
6. Quick actions: Dashboard, Vault, Wallet, Upgrade.
7. Vault balance display.
8. Export button.

---

## Interventions

| Type              | Trigger                     | Action                                     |
|-------------------|-----------------------------|--------------------------------------------|
| Cooldown          | Critical tilt indicators    | Full-page overlay blocks betting 5 minutes |
| Vault Prompt      | Balance reaches profit tier | Recommends vaulting                        |
| Spending Reminder | Profit converted to items   | Real-world comparison display              |
| Stop Loss         | 50%+ session loss           | Urgent vault recommendation                |
| Phone Friend      | Multiple simultaneous tilt  | Suggests contacting support contact        |
| Session Break     | 1+ hour play duration       | Suggests stepping away                     |
| Game Block        | Blocked game or category    | Full-page exclusion overlay                |

---

## Casino Support

### Site-Specific Selectors

- Stake.com
- Roobet.com
- BC.Game
- Duelbits.com
- Rollbit.com
- Shuffle.com
- Gamdom.com

### Generic Fallback

Fallback selectors activate on casino sites not listed above.

### Excluded Domains

The content script exits early on:

- discord.com
- api.tiltcheck.me (Discord auth callback routes)
- localhost on ports 3333 and 3001 (Discord auth routes only)

