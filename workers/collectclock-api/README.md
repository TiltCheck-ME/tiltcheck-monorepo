<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18 -->

# collectclock-api (Cloudflare Worker)

Source for the live Worker `collectclock-api` at https://collectclock-api.j-chapman7.workers.dev.
It serves CollectClock (Discord login, `/sync`, beta reports, casino reports, overrides, admin, Web Push alerts)
and is the only live backend for the TiltCheck Chrome extension (`/auth/token`, `/me`, `/logout`, `/buddy/*`).

## Deploy: by hand only

```sh
./build.sh                                   # bundles src/push.js + src/buddy.js + src/index.js into dist/index.js
CLOUDFLARE_API_TOKEN=... ./deploy.sh         # code-only upload; bindings, secrets and vars stay as they are
```

- `deploy.sh` replaces only the script content (`PUT .../workers/scripts/collectclock-api/content`).
  KV binding `CC`, secrets (`BOT_TOKEN`, `WEBHOOK_URL`, `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET`, `VAPID_*`, ...) and crons are untouched.
- **Never connect a Git build (Workers Builds) to this Worker.** A Git build linked to a repo once replaced the
  live API on every push and wiped it. Merging changes here does not deploy anything, and must not.
- Secrets live only in Cloudflare. Nothing in this folder contains one; do not add any.

## Layout

| Path | What |
| --- | --- |
| `src/index.js` | Routes, Discord OAuth / session (`sess:<token>` -> Discord id), reports, cron |
| `src/push.js` | Web Push (VAPID + aes128gcm on WebCrypto), `/push/*`, per-minute alert cron |
| `src/buddy.js` | Cash-out Buddy: `/buddy/invite`, `/buddy/accept`, `/buddy/status`, `/buddy/unpair`, `/buddy/ping` |
| `test/*.test.mjs` | `node --test` (runs the bundled worker against an in-memory KV) |
| `scripts/` | One-time helpers: `set-vapid.mjs` (VAPID secrets, never printed), `set-crons.sh` |
| `meta.json` | Bindings as deployed (KV `CC`) |

## Cash-out Buddy routes (Bearer = the Discord-login session)

| Route | Body | Answer |
| --- | --- | --- |
| `POST /buddy/invite` | none | `{ code: "ABCD-EFGH", expiresAt }` (24 h, one-time, a new one replaces the old) |
| `POST /buddy/accept` | `{ code }` | `{ ok, buddy: { id, name } }`; pairs both ways |
| `GET /buddy/status` | | `{ paired, count, max, buddies: [{ id, name, since }], invite }` (`id` is a hash, not the Discord id) |
| `POST /buddy/unpair` | `{ buddy?: id }` | ends one pair (or all), on both sides, no message to the other side |
| `POST /buddy/ping` | `{ type?: "buddy_ping", reason: "walk_away" \| "tilt" }` | plain-text bot DM to each buddy. Max 1 per 10 min per pair. Any other field is a 400. |

Not built, waiting on product decisions: DM buttons (Nudge / Join voice), Web Push for pings, any message on accept/unpair.
Placeholders to confirm: 10-minute ping gap, 3 buddies max, invite code lasts 24 h.

Privacy: a ping never carries an amount, balance, game, casino or site. The copy is fixed:
"<name> hit their walk-away." or "<name> could use a nudge." Buddies must share a server with the bot
(the TiltCheck Discord) and allow DMs, or Discord refuses the DM.
