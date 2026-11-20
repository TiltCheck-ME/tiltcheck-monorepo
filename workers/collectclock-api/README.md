<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-19 -->

# collectclock-api (Cloudflare Worker)

Source for the live Worker `collectclock-api` at https://collectclock-api.j-chapman7.workers.dev.
It serves CollectClock (Discord login, `/sync`, beta reports, casino reports, overrides, admin, Web Push alerts)
and is the only live backend for the TiltCheck Chrome extension (`/auth/token`, `/me`, `/logout`, `/support`, `/beta/counts`).

This folder is the code that is live as of Nov 19 2026 (Worker version f785d124): the push-alerts code plus `/beta/counts`.
The only differences from the deployed bundle are the copyright comment lines.

## Deploy: by hand only

```sh
./build.sh                                   # bundles src/push.js + src/beta.js + src/index.js into dist/index.js
CLOUDFLARE_API_TOKEN=... ./deploy.sh         # code-only upload; bindings, secrets and vars stay as they are
```

- `deploy.sh` replaces only the script content (`PUT .../workers/scripts/collectclock-api/content`).
  KV binding `CC`, secrets and crons are untouched.
- **Never connect a Git build (Workers Builds) to this Worker.** A Git build linked to a repo once replaced the
  live API on every push and wiped it. Merging changes here does not deploy anything, and must not.
- Secrets live only in Cloudflare. Nothing in this folder contains one; do not add any.

## Beta counts

`POST /beta/counts` takes the batch the extension's `beta-telemetry.ts` sends (`buildBetaPayload`):

```json
{ "schema": 1, "version": "1.4.2", "day": "2026-11-19", "counts": { "install": 1, "nudge_shown": 3 } }
```

- Exactly those four keys. `schema` is 1. `version` is `1`-`4` dot-separated numbers (max 4 digits each) or `unknown`.
  `day` is a real UTC date from 2 days ago to tomorrow. `counts` has 1-7 of `install`, `nudge_shown`, `break_taken`,
  `keep_win_hold`, `cash_out`, `ask_question`, `protection_turned_off`, each a whole number 0-10,000.
  `Content-Type: application/json`, body at most 1 KB. Anything else is a 400 and nothing is written.
- Totals go to KV `bc:<day>` as `{ v: { <version>: { batches, counts } } }` (kept 400 days). One read and one write per batch.
- Caps per day: 20 versions, 2,000 batches. Past them the answer is 429 and the extension keeps its counts for the next day.
- Privacy: the route never reads the IP, user agent, cookies or any other header but Content-Type/Length, and logs nothing.
- Staff read: `GET /admin/beta-counts?days=30` (Bearer session, staff only, like `/admin/stats`): per-day, per-version totals and a sum.
- CORS: same origin header as the other routes; the preflight also allows `X-Requested-With`. The extension's host permission
  for this Worker covers its calls.

## Layout

| Path | What |
| --- | --- |
| `src/index.js` | Routes, Discord OAuth / session (`sess:<token>` -> Discord id), reports, cron |
| `src/push.js` | Web Push (VAPID + aes128gcm on WebCrypto), `/push/*`, per-minute alert cron |
| `src/beta.js` | `/beta/counts` validation and daily totals, staff read |
| `test/*.test.mjs` | `node --test` (runs the bundled worker against an in-memory KV) |
| `scripts/` | One-time helpers: `set-vapid.mjs` (VAPID secrets, never printed), `set-crons.sh` |
| `meta.json` | Bindings as deployed (KV `CC`) |
