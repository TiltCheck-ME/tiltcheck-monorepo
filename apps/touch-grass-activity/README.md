<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 -->

# Touch Grass Activity (DRAFT, not deployed)

A Discord Activity for the "Touch Grass" games hub. Phase 1:

- **Lobby**: who's here (avatars) and three tiles.
- **Degens Against Decency (DA&D)**: 3 to 8 players, rotating judge, 7-card hands, anonymous shuffled answers, first to N points (default 5). Points are bragging rights only.
- **Touch Grass break**: pick 5 / 10 / 15 minutes, one shared countdown for everyone in the Activity instance. Bailing is optional, gets roasted, and is recorded as "bailed at m:ss". Share card at the end.
- **Trivia**: lobby tile only, "coming soon" (phase 2).

No money anywhere: no rewards, wallets, payments, casino links or paid features. `tests/no-money.test.ts` fails the build if those words show up in the client or the deck.

## Layout

```
apps/touch-grass-activity/
  index.html, vite.config.ts      static frontend (Vite + TS)
  src/client/                     UI, Discord SDK setup, transports (WebSocket + polling, guest room)
  src/shared/                     room logic used by BOTH the worker and guest mode
    dad.ts                        DA&D state machine
    breakTimer.ts                 group break timer
    room.ts                       members, per-user views (hands never leak), rate limit
    deck.ts                       original TiltCheck cards (no AI generation)
  worker/                         Cloudflare Worker + Durable Object (own wrangler.toml)
    src/index.ts                  routes
    src/room-do.ts                Durable Object adapter (WebSocket Hibernation API + alarms)
    src/host.ts                   DO logic with injectable storage/sockets (unit tested)
    src/auth.ts                   code -> token exchange, token -> user lookup
  tests/                          vitest: dad, break, room host, auth, worker (local workerd), client DOM, no-money
  scripts/simulate-dad.ts         3-player game to a winner against the room logic
```

## Run it locally

From the repo root:

```bash
pnpm install
pnpm --filter @tiltcheck/touch-grass-activity dev        # http://localhost:5173
```

Opening it in a plain browser (no `frame_id` in the URL) runs **guest mode**: a fake local user and the full room logic in the browser. Use the `+ bot` button to add bots so DA&D has 3 players. Query params: `?name=Jme`, `?room=whatever`.

To test against the real worker locally:

```bash
cp apps/touch-grass-activity/worker/.dev.vars.example apps/touch-grass-activity/worker/.dev.vars   # ALLOW_GUEST=true
pnpm --filter @tiltcheck/touch-grass-activity dev:worker   # wrangler dev on :8787 (local only, no deploy)
pnpm --filter @tiltcheck/touch-grass-activity dev          # open http://localhost:5173/?remote=1&name=A
```

Open a second tab with `?remote=1&name=B` and a third with `&name=C` to play a 3-player DA&D game over WebSockets.

Checks:

```bash
pnpm --filter @tiltcheck/touch-grass-activity typecheck
pnpm --filter @tiltcheck/touch-grass-activity test
pnpm --filter @tiltcheck/touch-grass-activity build      # -> dist/
pnpm --filter @tiltcheck/touch-grass-activity simulate   # 3-player game to a winner
```

## How it talks to Discord

1. `sdk.ready()`
2. `sdk.commands.authorize({ client_id, response_type: 'code', prompt: 'none', scope: ['identify'] })`
3. `POST /api/activity/token { code }` (relative URL, through the Discord proxy to the worker). The worker calls `https://discord.com/api/v10/oauth2/token` with client id, client secret, `grant_type=authorization_code` and the code. **No `redirect_uri`.**
4. `sdk.commands.authenticate({ access_token })`
5. `sdk.commands.getActivityInstanceConnectedParticipants()` (2026 name) plus `ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE` for the avatar row.
6. Room: `wss://<app>.discordsays.com/api/room/<instanceId>/ws`. First frame is `{ t: 'auth', token }`; the worker checks the token against `/users/@me`. If the socket drops, the client polls `GET /api/room/<instanceId>/state` and `POST /api/room/<instanceId>/action` with `Authorization: Bearer <token>` until the socket comes back.

Client ID: `VITE_DISCORD_CLIENT_ID`, falling back to "Tilt Check" `1445916179163250860`.

## Server rules

- One Durable Object per Discord `instanceId` (`idFromName(instanceId)`).
- The server owns hands, judge, submissions, scores and the break clock. Each client gets its own view: only its own hand, and answers are anonymous and shuffled with random ids while the judge picks.
- Every action is validated (phase, player, judge, card in hand) and rate limited per user (token bucket, 10 burst, 2/sec). Messages over 4 KB are dropped. The token endpoint has a per-isolate IP limit.
- Leaving: a socket close (last tab for that user) removes them from the room. Polling-only users are swept after 45 s of silence. A judge leaving voids the round and returns submitted cards. Under 3 players the game pauses with scores kept.
- Late joiners sit in line and are dealt in at the next round.

## Deploy checklist for Jamie (not done in this PR)

Nothing here touches `collectclock-api`, DNS, the Developer Portal or any Discord channel. These are the steps when you decide to ship.

### 1. Worker

```bash
cd apps/touch-grass-activity
npx wrangler login                                   # your Cloudflare account
npx wrangler secret put DISCORD_CLIENT_SECRET --config worker/wrangler.toml   # "Tilt Check" app secret
npx wrangler deploy --config worker/wrangler.toml    # creates worker "touch-grass-activity"
```

- The worker name is `touch-grass-activity`. It is a new worker, not `collectclock-api`.
- `DISCORD_CLIENT_ID` is already set as a var in `wrangler.toml` (1445916179163250860).
- Do **not** set `ALLOW_GUEST` in production.
- Hostname: either the free `touch-grass-activity.<your-subdomain>.workers.dev` URL, or add a custom domain (Workers & Pages -> touch-grass-activity -> Settings -> Domains & Routes -> Add custom domain, for example `tg-api.tiltcheck.me`; tiltcheck.me DNS must be on Cloudflare for that).
- Check it: `curl https://<worker-host>/api/health` should return `{"ok":true,...}`.

Durable Objects: Cloudflare's docs say SQLite-backed Durable Objects are on the Workers Free plan (100k requests/day) and the `wrangler.toml` migration uses `new_sqlite_classes`. **Not verified on your account.** If deploy fails with a Durable Objects or plan error, that is the reason.

### 2. Frontend

```bash
pnpm --filter @tiltcheck/touch-grass-activity build   # static files in apps/touch-grass-activity/dist
```

Host `dist/` anywhere static: Cloudflare Pages (`npx wrangler pages deploy dist --project-name touch-grass-activity`), or GitHub Pages on a subdomain. Assets use relative paths, so a subfolder also works, but whether a Discord URL mapping target may include a path is unverified; a dedicated host is the safe choice.

### 3. Developer Portal ("Tilt Check", 1445916179163250860)

Activities -> URL Mappings:

| Prefix | Target |
| --- | --- |
| `/` | the frontend host, for example `touch-grass-activity.pages.dev` |
| `/api` | the worker host, for example `touch-grass-activity.<sub>.workers.dev` |

The worker accepts both `/api/...` and `/...` paths, so it works whether or not Discord strips the `/api` prefix before forwarding. If Discord keeps the prefix, the mapping `/api` -> `<worker-host>` is enough; if it strips it, `/api` -> `<worker-host>/api` also works.

OAuth2: there must be at least one redirect URI saved (any, for example `https://127.0.0.1`). The SDK flow does not use it.

### 4. iOS and Android

Activities -> Settings -> Supported Platforms: tick iOS and Android. The UI uses Discord's `--discord-safe-area-inset-*` variables and has portrait and landscape layouts, but it has not been tried on a phone inside Discord yet.

### 5. Stop the auto-posted "started an activity" messages

The default Entry Point command uses handler `DISCORD_LAUNCH_ACTIVITY` (2), which posts a message in the channel every launch. Switch it to `APP_HANDLER` (1):

1. List global commands and find the one with `type: 4` (PRIMARY_ENTRY_POINT):
   `GET https://discord.com/api/v10/applications/1445916179163250860/commands` with `Authorization: Bot <bot token>`.
2. Patch it: `PATCH .../applications/1445916179163250860/commands/<command_id>` with body `{"handler": 1}`.
3. With `APP_HANDLER`, Discord sends an interaction to your Interactions Endpoint URL and your app must answer with response type 12 (`LAUNCH_ACTIVITY`). Nothing in this PR handles that interaction yet, so set this only once an interactions endpoint exists (it can be a route on the same worker). Until then keep handler 2.

### 6. Old launch messages

Delete the old "Jamie started an activity / Join" messages in the channel by hand.

## Known gaps

- Instance membership is not checked server-side. Anyone with a valid Discord token who knows an `instanceId` can join that room. Discord's docs say not to trust client data; a follow-up can verify membership with the activity-instance API using the bot token.
- Room state is persisted to Durable Object storage on every change. Rate-limit buckets are in memory and reset if the object is evicted.
- Share to chat (`openShareMomentDialog` after uploading the PNG to `/applications/<id>/attachment`) is written but untested; it falls back to copying the result text.
- Trivia is a stub tile.
