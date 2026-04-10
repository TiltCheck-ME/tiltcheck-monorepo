<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10 -->

# Surgical Self-Exclusion — Technical Reference

Made for Degens. By Degens.

---

## Overview

Surgical Self-Exclusion lets users block specific games or entire game categories from loading in their browser — without closing their account or engaging a casino's own exclusion systems. The block is enforced client-side by the Chrome Extension and server-side by the API gatekeeper endpoint.

This is intentionally scalpel-level. You are not blocking your whole account — you are telling past-you to protect present-you from the games that get you every time.

---

## How It Works — End to End

1. User runs `/block-game` in the TiltCheck Discord server, selecting a category or entering a specific game slug and an optional reason note.
2. The Discord bot posts to `POST /user/:discordId/exclusions` on the backend API.
3. The API writes the exclusion to the `user_game_exclusions` database table and invalidates the user's Redis exclusion cache.
4. The Chrome Extension polls `GET /user/:discordId/exclusions` every 5 minutes (or on page load) and caches the result in memory for 5 minutes.
5. When the user navigates to a blocked game, the `GameBlocker` MutationObserver detects it and injects a full-page overlay.
6. Casinos that have integrated the TiltCheck RGaaS API can also call `POST /rgaas/check-game` before launching a game iframe, which returns a 403 if the game is blocked.

---

## Chrome Extension: GameBlocker Class

**File**: `apps/chrome-extension/src/game-blocker.ts`

### Construction

```ts
const blocker = new GameBlocker(discordId: string);
await blocker.init();
```

`discordId` is the user's Discord snowflake ID, resolved from the active session by `content.ts` before constructing the blocker.

### init()

1. Calls `refreshProfile()` — fetches `ForbiddenGamesProfile` from `GET /user/:discordId/exclusions`.
2. Calls `scan()` — runs an immediate DOM scan.
3. Calls `startObserver()` — attaches a `MutationObserver` to `document.body` (watches `childList`, `subtree`, `attributes`).
4. Calls `startPoller()` — re-fetches the profile and re-scans every 3 seconds (`POLL_INTERVAL_MS = 3000`).

### destroy()

Disconnects the MutationObserver, clears the poll timer, and removes any injected overlay.

### Profile Caching

The in-memory profile cache has a TTL of 5 minutes (`CACHE_TTL_MS = 300_000`). While a fresh profile exists in memory, `refreshProfile()` returns immediately without hitting the network. On cache expiry, a new `GET /user/:discordId/exclusions` request is made.

### Detection Strategy (Priority Order)

```
1. Page URL:  window.location.pathname + window.location.search
2. Iframes:   document.querySelectorAll('iframe[src]') — checks iframe src
3. Buttons:   document.querySelectorAll('[data-game-id]') — checks data-game-id attribute
```

For each candidate string, the blocker checks:

- **Game ID match**: The slug contains any entry from `profile.blockedGameIds` (case-insensitive substring match).
- **Category match**: The slug contains any of the category's known keywords (see table below).

Game ID matching takes priority over category matching.

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

When a match is detected:

- A `div#tiltcheck-game-block-overlay` is injected into `document.body`.
- The overlay is full-viewport, `z-index: 2147483647` (highest possible), with a dark scrim.
- It renders:
  - "BLOCKED BY YOU" badge in red.
  - Match label: "game ID: chicken_orig_01" or "category: crash".
  - The user's own reason note (italic), if one was set.
  - Link to the TiltCheck dashboard.
  - Session-dismiss button.
- Styles are injected via a `<style>` tag appended to `document.head`.
- The footer line reads: "Made for Degens. By Degens."
- The overlay guard (`OVERLAY_ID = 'tiltcheck-game-block-overlay'`) prevents duplicate injections.

### Session Dismiss

Clicking "I know what I'm doing — dismiss for this session" sets `this.profile = null`, preventing re-injection for the remainder of the page session. The poller will re-fetch the profile after `POLL_INTERVAL_MS`, but the observer and subsequent scans will skip injection until a full page reload.

---

## API Endpoints

Base URL: `https://api.tiltcheck.me`

All endpoints require authentication. The extension uses session cookies (`credentials: 'include'`). The Discord bot uses the `x-internal-secret` header.

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
      },
      {
        "id": "excl_02",
        "userId": "abc123",
        "gameId": null,
        "category": "crash",
        "reason": null,
        "createdAt": "2026-04-10T01:00:00.000Z"
      }
    ],
    "updatedAt": "2026-04-10T01:00:00.000Z"
  }
}
```

**Response 404**: User not found.

---

### POST /user/:discordId/exclusions

Add a new surgical exclusion. At least one of `gameId` or `category` is required.

**Request body:**
```json
{
  "gameId": "chicken_orig_01",
  "category": "crash",
  "reason": "I always chase on these"
}
```

All fields except the at-least-one constraint are optional:

| Field    | Type                | Required  | Notes                              |
|----------|---------------------|-----------|------------------------------------|
| gameId   | string              | Conditional | Casino-specific slug              |
| category | GameCategory        | Conditional | See GameCategory type below        |
| reason   | string              | No          | Shown back to user in the overlay |

**Response 201:**
```json
{
  "success": true,
  "data": { ...GameExclusion }
}
```

**Response 400**: Neither gameId nor category provided.
**Response 404**: User not found.

---

### DELETE /user/:discordId/exclusions/:exclusionId

Remove a single exclusion by its ID. Get exclusion IDs from the GET endpoint or from `/my-exclusions` in Discord.

**Response 200:**
```json
{ "success": true }
```

**Response 404**: User or exclusion not found.

---

### POST /rgaas/check-game

Gatekeeper endpoint for casino-side integration. Casinos call this before launching a game iframe. No auth required — but `discordId` must be provided in the body.

**Request body:**
```json
{
  "discordId": "123456789012345678",
  "gameId": "chicken_orig_01",
  "category": "crash"
}
```

| Field     | Type         | Required  |
|-----------|--------------|-----------|
| discordId | string       | Yes       |
| gameId    | string       | Conditional (one required) |
| category  | GameCategory | Conditional (one required) |

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

**Response 400**: `discordId` missing.
**Response 404**: User not found.

The `isGameBlocked` check runs against the Redis-cached `ForbiddenGamesProfile`. Redis is optional — on cache miss or Redis unavailability, the check falls through to the database.

---

## Discord Slash Commands

All commands are ephemeral (visible only to the user who ran them).

### /block-game

Block a game or category from yourself.

**Options:**

| Option    | Type   | Required  | Description                                         |
|-----------|--------|-----------|-----------------------------------------------------|
| category  | choice | No        | Block a whole category (see GameCategory below)     |
| game_id   | string | No        | Block a specific game slug, e.g. `chicken_orig_01`  |
| reason    | string | No        | Note to yourself: why you are blocking it           |

At least one of `category` or `game_id` must be provided.

On success, returns an embed with the block label, your reason note, and instructions for removal. Posts to `POST /user/:discordId/exclusions`.

---

### /unblock-game

Remove a surgical exclusion.

**Options:**

| Option       | Type   | Required | Description                                    |
|--------------|--------|----------|------------------------------------------------|
| exclusion_id | string | Yes      | Exclusion ID — get it from `/my-exclusions`    |

Calls `DELETE /user/:discordId/exclusions/:exclusionId`. On success, confirms the game is accessible again.

---

### /my-exclusions

List all active surgical exclusions.

No options. Returns an embed with each exclusion entry showing:

- Target: game ID slug or category name.
- Reason note (if set).
- Exclusion ID (use this with `/unblock-game`).
- Summary: count of blocked game IDs and blocked categories.

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
  gameId?: string | null;      // casino-specific game slug
  category?: GameCategory | null;
  reason?: string | null;      // user-supplied note
  createdAt: Date;
}

export interface ForbiddenGamesProfile {
  userId: string;
  blockedGameIds: string[];         // flat array for fast extension lookup
  blockedCategories: GameCategory[];
  exclusions: GameExclusion[];      // raw entries for management UI
  updatedAt: string;                // ISO timestamp, used for cache invalidation
}
```

---

## Server-Side Caching

**File**: `apps/api/src/services/exclusion-cache.ts`

- Redis key pattern: `excl:{userId}`.
- TTL: 300 seconds (5 minutes), matching the extension's in-memory TTL.
- On any write to `user_game_exclusions` (add or remove), `invalidateExclusionCache(userId)` is called immediately.
- If Redis is unavailable, all cache operations are no-ops. The DB is the source of truth. The `/rgaas/check-game` hot path degrades to direct DB reads — still correct, slightly slower.

---

## Database Table

The exclusions are stored in `user_game_exclusions`. Schema defined in `packages/db`. The `buildForbiddenGamesProfile(userId)` query in `@tiltcheck/db` constructs the full `ForbiddenGamesProfile` from this table.

---

## Known Limitations

- The extension's game ID matching is substring-based (case-insensitive). A blocked slug of `chicken` will match any URL or game ID containing that string. Use specific slugs (e.g., `chicken_orig_01`) to avoid over-blocking.
- Session dismiss nulls out the local profile, meaning blocked games are accessible for the remainder of that page session. There is no server-side session tracking for dismissals.
- The poller interval is 3 seconds (`POLL_INTERVAL_MS`), but the in-memory TTL is 5 minutes. The poller only triggers a network request when the TTL has expired. The 3-second interval is the DOM re-scan frequency, not the API poll frequency.
- `POST /rgaas/check-game` is an unauthenticated endpoint intended for trusted casino integrations. It does not enforce caller authentication beyond the presence of `discordId` in the body. Abuse is rate-limited at the infrastructure level.
