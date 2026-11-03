<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-02 -->

# Browser Game Filters — Technical Reference

Made for Degens. By Degens.

---

## Overview

Browser Game Filters allow users to block specific games or entire game categories from loading or clicking in their browser — without closing their account or relying on casino compliance. The list is user-configured: nothing is blocked until they arm it.

Core content scripts enforce local categories and slugs directly in the browser DOM (swallowing clicks on betting tiles and redacting cards). Discord/API exclusions sync seamlessly when a session is linked.

> [!NOTE]
> **Not Regulatory Exclusion:** This is client-side harm reduction on your own device. It does not close casino accounts or report to government/state registries. For official operator-enforced self-exclusion, use services like **GAMSTOP** (UK) or contact the **National Council on Problem Gambling (NCPG / 1-800-GAMBLER)**.

---

## How It Works — End to End

1. **Local Mode (No Auth Needed):** Users open the extension popup Guards tab, enable local exclusion, and toggle categories (e.g. `Chicken / Mines`, `Crash`, `Slots`) or add custom slugs. `LocalGameBlocker` intercepts clicks in real time and redacts lobby tiles.
2. **Discord Synced Mode:** When Discord is linked, users can manage filters via `/block-game` in Discord or the web dashboard.
3. The Discord bot/dashboard posts to `POST /user/:discordId/exclusions` on the backend API.
4. The API writes to `user_game_exclusions` and invalidates the user's Redis exclusion cache.
5. The Chrome Extension polls `GET /user/:discordId/exclusions` every 5 minutes (or on page load) and caches the result in memory.
6. When the user navigates to a blocked game URL or iframe, `GameBlocker` detects it and injects a warning overlay.

---

## Chrome Extension: Local Game Blocker & GameBlocker Classes

**Files**:
- `apps/chrome-extension/src/pro/local-game-blocker.ts` (DOM/click-level local filtering)
- `apps/chrome-extension/src/game-blocker.ts` (API/session-level overlay blocker)

### Category Keyword Map

| GameCategory   | Matched Keywords                                          |
|----------------|-----------------------------------------------------------|
| chicken_mines  | chicken, mines, minefield                                 |
| bonus_buy      | bonus-buy, bonusbuy, feature-buy, featurebuy              |
| live_dealer    | live-dealer, live-casino, live_dealer, livecasino         |
| slots          | slot, slots                                               |
| crash          | crash, aviator, jetx, spaceman                            |
| table_games    | blackjack, roulette, baccarat, poker, table               |

### Overlay Behavior

When a blocked game is opened:
- A `div#tiltcheck-game-block-overlay` is injected into `document.body`.
- The overlay is full-viewport, `z-index: 2147483647` with a dark scrim.
- It displays:
  - "BLOCKED BY YOU" badge.
  - Match label (`category: chicken_mines` or `game ID: chicken-road`).
  - Reason note if provided by user.
  - Link to dashboard / dismiss option.
  - Footer line: "Made for Degens. By Degens."

---

## API Endpoints

Base URL: `https://api.tiltcheck.me`

All endpoints require authentication (session cookies or `x-internal-secret` header).

### GET /user/:discordId/exclusions

Returns the full `ForbiddenGamesProfile` for the user.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "userId": "abc123",
    "blockedGameIds": ["chicken_orig_01", "aviator_01"],
    "blockedCategories": ["crash", "bonus_buy"],
    "exclusions": [
      {
        "id": "excl_01",
        "userId": "abc123",
        "gameId": "chicken_orig_01",
        "category": null,
        "reason": "I always go full port on this one",
        "createdAt": "2026-04-10T00:00:00.000Z"
      }
    ],
    "updatedAt": "2026-04-10T01:00:00.000Z"
  }
}
```

### POST /user/:discordId/exclusions

Add an exclusion. At least one of `gameId` or `category` is required.

**Request body:**
```json
{
  "gameId": "chicken_orig_01",
  "category": "crash",
  "reason": "I always chase on these"
}
```

### DELETE /user/:discordId/exclusions/:exclusionId

Remove a single exclusion by its ID.

---

## Discord Slash Commands

- `/block-game [category] [game_id] [reason]`: Block a game or category.
- `/unblock-game <exclusion_id>`: Remove an exclusion.
- `/my-exclusions`: List active exclusions.

---

## TypeScript Types

Defined in `packages/types/src/index.ts`:

```ts
export type GameCategory =
  | 'chicken_mines'
  | 'bonus_buy'
  | 'live_dealer'
  | 'slots'
  | 'crash'
  | 'table_games';

export interface GameExclusion {
  id: string;
  userId: string;
  gameId?: string | null;
  category?: GameCategory | null;
  reason?: string | null;
  createdAt: Date;
}

export interface ForbiddenGamesProfile {
  userId: string;
  blockedGameIds: string[];
  blockedCategories: GameCategory[];
  exclusions: GameExclusion[];
  updatedAt: string;
}
```

---

## Appendix: RGaaS 403 Endpoint (Casino-Side Integration)

For casinos integrating directly with TiltCheck's Responsible Gaming as a Service (RGaaS) API to block iframe launches server-side:

### POST /rgaas/check-game

Gatekeeper endpoint for casino-side integration. Casinos call this before launching a game iframe. `discordId` must be provided in the body.

**Request body:**
```json
{
  "discordId": "<discord_user_id>",
  "gameId": "chicken_orig_01",
  "category": "crash"
}
```

**Response 200 (allowed):**
```json
{ "allowed": true }
```

**Response 403 (blocked):**
```json
{
  "allowed": false,
  "message": "Yo, you blocked this one yourself. Respect the call. Go play something else or touch grass."
}
```
