<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12 -->

# Touch Grass Activity (DRAFT, test deploy live)

A Discord Activity for the "Touch Grass" games hub. Phase 1:

- **Lobby**: who's here (avatars, "away" badge) and two live tiles, each with a seated/playing count.
- **Degens Against Decency (DA&D)**: 3 to 8 players, rotating judge, 7-card hands, anonymous shuffled answers, first to N points (default 5). Points are bragging rights only.
- **Trivia**: self-running, no host. Anyone taps Start; 10 questions, 4 choices, 15 s answer window, 4 s reveal, scoreboard after each question and at the end. 100 points for a right answer plus up to 50 for speed. Late joiners spectate one question and are dealt in at the next. Bank of 116 hand-checked questions (33 from the shared arena bank, 11 from the trivia.live seed, 72 new) (`src/shared/triviaBank.ts`), drawn without repeats per instance. No AI at runtime.

The group break timer was removed on 2026-11-12 (Jamie's call after testing it on iPhone).

No money anywhere: no rewards, prizes, extra lives, wallets, payments, ads or paid features. Points are bragging rights only. `tests/no-money.test.ts` fails the build if banned words show up in the client, the DA&D deck or the trivia bank.

## Layout

```
apps/touch-grass-activity/
  index.html, vite.config.ts      static frontend (Vite + TS)
  src/client/                     UI, Discord SDK setup, transports (WebSocket + polling, guest room)
  src/shared/                     room logic used by BOTH the worker and guest mode
    dad.ts                        DA&D state machine
    trivia.ts                     trivia state machine (timers, scoring, late join)
    triviaBank.ts                 the question bank (server and tests only; the browser build swaps in
                                  src/client/guestTriviaBank.ts so answers never ship to clients)
    room.ts                       members + away grace, per-user views (hands/answers never leak), rate limit
    live.ts                       anonymous live-tables report + registry board (TTL)
    scores.ts                     trivia high scores: best-only, top 10 week/all time, Chicago week
    deck.ts                       original TiltCheck cards (no AI generation)
  worker/                         Cloudflare Worker + Durable Object (own wrangler.toml)
    src/index.ts                  routes
    src/room-do.ts                Durable Object adapter (WebSocket Hibernation API + alarms)
    src/registry-do.ts            LiveRegistry singleton Durable Object (GET /api/live) + table alerts alarm
    src/scores-do.ts              TriviaScores Durable Object, one per server (GET /api/trivia/scores)
    src/alerts.ts                 table alerts to a Discord channel webhook (dormant without the secret)
    src/host.ts                   DO logic with injectable storage/sockets (unit tested)
    src/auth.ts                   code -> token exchange, token -> user lookup
  tests/                          vitest: dad, trivia, live registry, room host, auth, worker (local workerd), client DOM, no-money
  scripts/simulate-dad.ts         3-player DA&D game to a winner against the room logic
  scripts/simulate-trivia.ts      3-player 10-question trivia game with a mid-game drop and rejoin
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
pnpm --filter @tiltcheck/touch-grass-activity simulate   # DA&D game to a winner, then a full trivia game
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
- The server owns hands, judge, submissions, scores and the trivia clock. Each client gets its own view: only its own hand, and answers are anonymous and shuffled with random ids while the judge picks. Trivia views never carry the correct choice (or anyone else's pick) before the reveal; one answer per player per question, inside the window, for the question in flight.
- Every action is validated (phase, player, judge, card in hand) and rate limited per user (token bucket, 10 burst, 2/sec). Messages over 4 KB are dropped. The token endpoint has a per-isolate IP limit.
- A dropped connection is not leaving. When a user's last socket closes (iOS suspends the webview on an app switch) they are marked **away** and keep their seat, hand and score for 3 minutes (DO alarm). Reconnecting with the same Discord user id re-attaches to the seat and gets the private hand back. Polling-only users who go quiet for 45 s are marked away the same way. Only grace expiry, "Stand up", or an explicit `leave` removes someone.
- DA&D: an away judge holds the round until the grace period ends, then the round is voided and submitted cards return. Under 3 players the game pauses with scores kept. Trivia: away players stay on the board and score 0 for questions they miss; they do not hold the answer window open.
- The client reconnects with backoff (1 s doubling to 15 s), and immediately on `visibilitychange`, `pageshow` and `focus`; a socket that looks open after a resume gets a ping and is replaced if nothing comes back in 3 s.
- Late joiners sit in line and are dealt in at the next round.

## Live tables (`GET /api/live`)

For the TiltCheck extension (not wired yet). Each room sends an anonymous summary to one `LiveRegistry` Durable Object on every change and on a heartbeat (at most every 50 s while anyone is in the room). Entries older than 120 s drop off; a room that empties is removed right away. Guild id comes from the Discord SDK (`sdk.guildId`, passed on the room URL as `?guild=`); DMs and guest mode report `null`.

```
GET /api/live?guild=<snowflake>      counts for that guild
GET /api/live                        global totals

200 {
  "ok": true,
  "guild": "<snowflake>" | null,
  "ttlSeconds": 120,
  "updatedAt": <ms epoch>,
  "rooms": <instances with anyone in them>,
  "tables": <dad tables + trivia tables>,
  "joinable": <dad joinable + trivia joinable>,
  "games": {
    "dad":    { "tables": n, "seated": n,  "joinable": n },
    "trivia": { "tables": n, "playing": n, "joinable": n }
  }
}
400 {"error":"bad-guild"}   429 {"error":"rate-limited"} (Retry-After: 5)   503 {"error":"not-configured"}
```

A DA&D table is an instance with at least one seated player; joinable while seats + queue < 8. A trivia table is a running game; joinable until its last question opens. No user ids, names, avatars or instance ids in the response. CORS: `https://tiltcheck.me`, `https://*.tiltcheck.me` and `chrome-extension://<id>` only. Rate limit: 20 burst, 1/s per IP per isolate.

## Trivia high scores (`GET /api/trivia/scores`)

```
GET /api/trivia/scores?guild=<snowflake>     Authorization: Bearer <Discord access token>
200 { ok, guild, weekStart, week: [row], allTime: [row], me: { week: {score, rank|null}|null, allTime: {...}|null } }
row = { id, name, avatar, score, at }   (Discord user id, display name, avatar hash, score, ms epoch)
401 unauthorized   400 bad-guild   405 (anything but GET)   429 rate-limited   503 not-configured
```

- One `TriviaScores` Durable Object per server (`idFromName('guild:<id>')`, migration v3). Top 10 this week and top 10 all time, one row per player per board (their best), plus each player's personal best (id, score, date). The week resets Monday 00:00 America/Chicago.
- Written only by the room, when it runs a 10-question game to the end (`phase: over`), with the server's own scores. There is no client message or public route that writes a score. Zero scores are not recorded.
- Which server: Discord instance ids carry it (`i-<launch>-gc-<guild>-<channel>`), and that wins over the client's `sdk.guildId`. DMs and group DMs (`-pc-`) have no server: those games are **off the record** (not stored; the end screen and lobby say so).
- Not in `/api/live`, which stays anonymous.

## Table alerts (Discord channel webhook)

The LiveRegistry posts to one channel when someone is waiting: a DA&D table with someone seated and no game going, or someone on the Trivia screen with no game running (client sends `{t:'look', at}`). Only rooms in `ALERT_GUILD_ID` count. It waits 20 s first (a room that empties sooner never alerts), posts at most once per game per 10 minutes, and edits the post to "game on" or "closed" when that changes. `allowed_mentions: {parse: []}`, no names or ids in the copy. Off unless the secret `ALERT_WEBHOOK_URL` is set.

## Current test deploy (2026-11-12, trivia build)

- Worker: `touch-grass-activity` on Cloudflare account 6604734f6224c90d45b3d817f9dfab23, `https://touch-grass-activity.j-chapman7.workers.dev` (`/api/health` 200, `/api/live` 200). Bindings: Durable Objects `ROOMS` -> `TouchGrassRoom` (migration v1, unchanged namespace) and `LIVE` -> `LiveRegistry` (migration v2, new_sqlite_classes), var `DISCORD_CLIENT_ID=1445916179163250860`, secret `DISCORD_CLIENT_SECRET` (kept). No `ALLOW_GUEST`. Uploaded with the Cloudflare REST API (bundle from `wrangler deploy --dry-run --outdir`, `keep_bindings: ["secret_text"]`, migrations `old_tag v1 -> new_tag v2`).
- Frontend: Cloudflare Pages project `touch-grass-activity`, `https://touch-grass-activity.pages.dev`, built from 3738e659. Uploaded with the Pages direct-upload API (upload JWT -> assets/upload + upsert-hashes, then a deployment with the manifest). A new deployment can answer 500 for a minute or two while it propagates.
- Discord proxy: `https://1445916179163250860.discordsays.com/.proxy/api/health` 200.
- Developer Portal URL Mappings: `/` -> `touch-grass-activity.pages.dev`, `/api` -> `touch-grass-activity.j-chapman7.workers.dev`.

## Deploy checklist for Jamie

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
- The guild id behind `/api/live` and the high-score boards comes from the instance id when it has the `-gc-<guild>-` shape, otherwise from the client. The instance id itself is client-supplied, so a crafted id could still put a server-computed score on another server's board. Closing that needs the activity-instance API with the bot token.
- `GET /api/trivia/scores` checks the Discord token but not membership in that server: any signed-in Discord user who knows a guild id can read that server's board (names, avatars, scores). Needs the `guilds` scope or the bot to close.
- While a non-judge DA&D player is away during submitting, the round waits for them (up to the 3-minute grace) before closing.
