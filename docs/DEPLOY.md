<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06 -->

# TiltCheck Deployment Inventory

This file is the canonical deploy map for the current repo. If a workflow, image, service, env requirement, or smoke target is not listed here, assume it is not wired for production yet.

## Current Reality

- Containerized services ship through `.github/workflows/deploy-railway.yml`.
- Images are built in GitHub Actions and pushed to GHCR as `ghcr.io/tiltcheck-me/tiltcheck-<service>`.
- Railway pulls the SHA-tagged image for each wired service.
- Public hostnames may be routed either through direct custom-domain mappings or, when explicitly enabled, through `.github/workflows/configure-tunnel.yml`.
- `.github/workflows/deploy-web.yml` is a manual Vercel fallback, not the primary production path.
- There is no active in-repo GCP deploy workflow.

## Workflow Secrets

| Workflow | Required secrets | Notes |
| :--- | :--- | :--- |
| `.github/workflows/deploy-railway.yml` | `RAILWAY_TOKEN` | `PACKAGES_TOKEN` is optional but needed if GHCR package visibility updates should succeed without warnings. |
| `.github/workflows/deploy-hub.yml` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Deploys `apps/hub` with Wrangler to Cloudflare Workers. D1 and KV bindings remain configured in `apps/hub/wrangler.toml`. |
| `.github/workflows/configure-tunnel.yml` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID` | Optional: reconciles tunnel ingress rules and DNS when Cloudflare Tunnel is the chosen public ingress path. |
| `.github/workflows/deploy-web.yml` | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | Manual fallback only. |

## Deploy Inventory

| Deployable | Source | Delivery | Workflow | GHCR image | Railway service | Required env (minimum confirmed in repo) | Smoke target |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `api` | `apps/api` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-api` | `api` | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `JWT_SECRET` | `https://api.tiltcheck.me/health` |
| `web` | `apps/web` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-web` | `web` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DASHBOARD_URL` | `https://tiltcheck.me/` |
| `discord-bot` | `apps/discord-bot` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-discord-bot` | `discord-bot` | `DISCORD_CLIENT_ID` plus one bot token var (`TILT_DISCORD_BOT_TOKEN`, `DISCORD_TOKEN`, or `DISCORD_BOT_TOKEN`) | Railway private `/health` on port `8080` |
| `justthetip-bot` | `apps/justthetip-bot` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-justthetip-bot` | `justthetip-bot` | `DISCORD_CLIENT_ID`, `JTT_DISCORD_BOT_TOKEN` or fallback token vars, plus `JUSTTHETIP_BOT_WALLET_PRIVATE_KEY` in prod | Railway private `/health` on port `8082` |
| `dad-bot` | `apps/dad-bot` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-dad-bot` | `dad-bot` | `DISCORD_CLIENT_ID` plus one dad bot token var (`DAD_DISCORD_BOT_TOKEN`, `DISCORD_TOKEN`, or `DISCORD_BOT_TOKEN`) | Railway private `/health` on service port |
| `trust-rollup` | `apps/trust-rollup` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-trust-rollup` | `trust-rollup` | `TRUST_ROLLUP_*` config and any upstream data-source keys required by enabled fetchers | Railway private `/health` on service port |
| `control-room` | `apps/control-room` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-control-room` | `control-room` | `ADMIN_PASSWORD`, `SESSION_SECRET` | `https://admin.tiltcheck.me/health` when that hostname maps to this service |
| `game-arena` | `apps/game-arena` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-game-arena` | `game-arena` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SESSION_SECRET` and/or `JWT_SECRET` | `https://game-arena.tiltcheck.me/health` or `https://arena.tiltcheck.me/health` depending on which public hostname maps to this service |
| `user-dashboard` | `apps/user-dashboard` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-user-dashboard` | `user-dashboard` | `JWT_SECRET`, `MAGIC_SECRET_KEY` when Magic routes stay enabled | `https://dashboard.tiltcheck.me/health` when that hostname maps to this service |
| `activity` | `apps/activity` | GHCR -> Railway | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-activity` | `activity` | `VITE_DISCORD_CLIENT_ID`, `VITE_API_URL`, `VITE_DASHBOARD_URL` | `https://activity.tiltcheck.me/` when that hostname maps to this service |
| `cloudflared` | `apps/cloudflared` | Optional GHCR -> Railway tunnel daemon | `.github/workflows/deploy-railway.yml` | `ghcr.io/tiltcheck-me/tiltcheck-cloudflared` | `cloudflared` | `TUNNEL_TOKEN` | Only when tunnel ingress is active: verify Railway service health and optional `.github/workflows/configure-tunnel.yml` reconciliation |
| `hub` | `apps/hub` | Cloudflare Workers via Wrangler | `.github/workflows/deploy-hub.yml` | n/a | n/a | Wrangler bindings such as `DB`, `SESSIONS`, `API_BASE_URL`, and `INTERNAL_API_SECRET` | `GET /health` on the deployed Worker URL; public `hub.tiltcheck.me` may map here or to `user-dashboard` depending on live ingress |
| `chrome-extension` | `apps/chrome-extension` | Browser asset; manual ZIP or Chrome Web Store publish | none | n/a | n/a | Build/runtime config in `apps/chrome-extension/src/config.ts` | Manual smoke: `pnpm -C apps/chrome-extension build`, load built extension, and verify API calls against `https://api.tiltcheck.me` |
| `degens-activity` | `apps/degens-activity` | **Recommended:** GHCR → Railway second service (static nginx SPA, mirror `apps/activity` Dockerfile pattern). **Alternative:** manual static CDN. Workflow/image names are placeholders until wired in `.github/workflows/deploy-railway.yml`. | `.github/workflows/deploy-railway.yml` (extend when Dockerfile exists) | `ghcr.io/tiltcheck-me/tiltcheck-degens-activity` *(suggested)* | `degens-activity` *(suggested)* | **`VITE_DISCORD_CLIENT_ID`**, **`VITE_TOKEN_ENDPOINT`**, **`VITE_ARENA_URL=https://game-arena.tiltcheck.me`** (realtime ingress; do not omit in prod builds) | **`https://degens.activity.tiltcheck.me/`** *(example hostname — set Railway Custom Domain + Discord Embedded URL to the same canonical URL)* |
| `tiltcheck-activity` | `apps/tiltcheck-activity` | **DEPRECATED:** legacy TiltCheck Activity shell. Do not deploy; migrate any remaining UI into `apps/activity`. | none | n/a | n/a | n/a | n/a |

### Workspace packages with `dist/` (Docker images)

Packages such as **`@tiltcheck/event-router`** point `exports` at **`dist/*.js`** and **`dist/` is gitignored**. A filtered `pnpm install` alone does not emit those artifacts. **`apps/control-room/Dockerfile`** must run **`pnpm --filter @tiltcheck/event-router build`** inside the image (alongside other workspace builds) wherever the service imports `@tiltcheck/event-router` at runtime. Skipping this step surfaces as **`Error [ERR_MODULE_NOT_FOUND]`** for `.../@tiltcheck/event-router/dist/index.js` on Railway startup (for example when loading `apps/control-room/src/trivia-director.js`).

### Wrangler (Cloudflare Workers) in this monorepo

**Wrangler** is the **`apps/hub`** deployment path only: `.github/workflows/deploy-hub.yml` runs **`pnpm --filter @tiltcheck/hub run deploy`**, which invokes Wrangler against `apps/hub/wrangler.toml`. That publishes the TiltCheck Worker (D1/KV/bindings vary by `wrangler.toml`). **`hub.tiltcheck.me`** may hit this Worker **or** the **`user-dashboard`** service depending on how DNS/proxy/tunnel are configured in production (see **`hub`** row in the Deploy Inventory above). Workers under `workers/link-scanner/` and `packages/agent/`, **`packages/compliance-edge/`**, also carry `wrangler.toml` files for separate deploys—they are **not** the Railway stack; Railway uses GHCR containers from `.github/workflows/deploy-railway.yml`.

## Public Routing

Public hostnames do not automatically come from the deploy workflow itself. This repo includes an optional Cloudflare Tunnel reconciler at `.github/workflows/configure-tunnel.yml`, but teams may also map Railway custom domains directly. The tunnel workflow mappings currently described in-repo are:

- `api.tiltcheck.me` -> `api.railway.internal:3000`
- `tiltcheck.me` and `www.tiltcheck.me` -> `web.railway.internal:3000`
- `dashboard.tiltcheck.me` and `hub.tiltcheck.me` -> `user-dashboard.railway.internal:6001`
- activity.tiltcheck.me -> activity.railway.internal:8080 (matches the container listen port in the Dockerfile)
- `arena.tiltcheck.me` -> `game-arena.railway.internal:3000` (historic / alternate DNS; Socket.IO and web may also use **`game-arena.tiltcheck.me`** per your edge mapping)
- Degens second Activity (example): **`degens.activity.tiltcheck.me`** -> `degens-activity.railway.internal:<port>` once the Railway service and custom domain exist
- `admin.tiltcheck.me` -> `control-room.railway.internal:3000`

## Discord Activity (`apps/activity`) — production checklist

This app is the primary hosted Discord Embedded Activity for TiltCheck. Static assets are served from nginx in Docker; delivery matches the `activity` row in **Deploy Inventory** above.

### Hosting target (locked)

| Item | Value |
| :--- | :--- |
| Public URL | `https://activity.tiltcheck.me` |
| Image | `ghcr.io/tiltcheck-me/tiltcheck-activity` |
| CI/CD | `.github/workflows/deploy-railway.yml` (rebuild on `apps/activity/**`, shared deps, or `workflow_dispatch`) |
| Railway wiring | Service consumes the SHA-tagged GHCR image; redeploy job uses the same pattern as other monorepo containers |

### HTTPS verification

- Expect TLS via the public edge (Cloudflare and/or Railway custom domain). From browser DevTools, confirm the document URL is `https://activity.tiltcheck.me/` and the certificate chain is valid.
- Automated `curl -sSI https://activity.tiltcheck.me/` may return **403** with Cloudflare challenge headers (`cf-mitigated`, `server: cloudflare`). That is not proof the origin is broken; bots and headless clients often fail JS challenges. Prefer a browser check, Railway deploy status, or hitting the container health path from Railway’s internal probe (healthcheck uses `/` per `apps/activity/railway.json`).
- Optional strict TLS inspect (may still hit CF): `echo | openssl s_client -servername activity.tiltcheck.me -connect activity.tiltcheck.me:443 2>/dev/null | openssl x509 -noout -subject -dates`

### Discord Developer Portal (allowlist / origins)

Use the **same Discord application** as `VITE_DISCORD_CLIENT_ID` at build time (Railway env for the `activity` service).

1. **Embedded App / Activity URL:** `https://activity.tiltcheck.me/` (keep consistent with what you ship; SPA entry is `index.html`).
2. **OAuth2 redirects:** include `https://<APPLICATION_ID>.discordsays.com`. The Embedded App SDK `authorize()` flow exchanges codes against this host; `POST /auth/discord/activity/token` on the API defaults to that redirect URI (`apps/api/src/routes/auth.ts`).
3. **Any allowed origins or linked URL fields** for the Activity should list https://activity.tiltcheck.me and https://<APPLICATION_ID>.discordsays.com (and dev tunnels such as https://dev-activity.tiltcheck.me only if you still use them).

### API allowlist (server-side)

- `isAllowedActivityRedirectUri` allows HTTPS hosts under `*.tiltcheck.me` and `*.discordsays.com`, so production and Discord proxy URIs stay aligned without code edits when the hostname is under `tiltcheck.me`.

### Internal networking (Railway)

- apps/activity/Dockerfile nginx proxies /api/ to the private API service and /socket.io/ to game-arena (both hardcoded to port :3000 in the Dockerfile). Those internal hostnames must resolve inside the same Railway project/environment or bonus feed, auth exchange, and arena realtime features degrade.
- If optional Cloudflare Tunnel ingress is enabled (`.github/workflows/configure-tunnel.yml`), keep the tunnel upstream port for `activity.railway.internal` aligned with the Railway private port for the `activity` service (image listens on `8080`; Railway may map a different internal port in project settings).

### How to verify health end-to-end

1. **Pipeline:** After merge to `main`, confirm the workflow built the **`activity`** image (`ghcr.io/tiltcheck-me/tiltcheck-activity`) and Railway deployed the `activity` service.
2. **Edge:** Open `https://activity.tiltcheck.me/` in a browser; you should get the SPA (not a persistent 5xx). Fetch `https://activity.tiltcheck.me/version.json` after a deploy if you need a coarse build stamp (generated at Vite build).
3. **Discord:** Join a voice channel, launch the Embedded Activity, and confirm the shell reaches CONNECTED (not permanently DEMO MODE). DEMO MODE usually means SDK or token exchange failed—check API logs for `/auth/discord/activity/token` and Discord OAuth config.

- **Activity-only rollback:** In Railway, roll back the `activity` service to a previous image or redeploy a known-good tag from GHCR.

## Degens Activity (`apps/degens-activity`) — second Railway service

This is the **separate** Discord Embedded App for the Degens lobby (DA&D, trivia, jackpot). It does **not** ship from the `activity` service on `activity.tiltcheck.me`. Run a **second** Railway service so you have two public URLs: **TiltCheck shell** vs **Degens games**.

### Hosting target (pattern)

| Item | Value |
| :--- | :--- |
| Public URL | Your choice (example: `https://degens.activity.tiltcheck.me/`). Must match the **Embedded App / Activity URL** in the **Degens** Discord application. |
| Image | Suggested: `ghcr.io/tiltcheck-me/tiltcheck-degens-activity` once CI builds it |
| Railway service | Suggested name: `degens-activity` |
| CI/CD | Add a matrix row and Dockerfile mirroring `apps/activity` (Vite build + nginx static + optional `/api/` and `/socket.io/` upstreams). Until then, build locally and deploy the image manually. |

### Build-time environment (Railway or CI)

Set at **`pnpm build`** time (Vite embeds `VITE_*`):

| Variable | Required | Notes |
| :--- | :--- | :--- |
| `VITE_DISCORD_CLIENT_ID` | Yes | Use the Discord **application** that owns the Degens Activity. |
| `VITE_TOKEN_ENDPOINT` | Recommended | Defaults to `https://api.tiltcheck.me/auth/discord/activity/token` in code if unset; override if API is not public at that URL. |
| `VITE_ARENA_URL` | **Yes in production** | Set to **`https://game-arena.tiltcheck.me`** (or your live game-arena Socket.IO origin). Do not rely on localhost in Discord users’ browsers. |

### Realtime / CORS

- The browser connects Socket.IO **to game-arena**, not necessarily to the Degens Activity hostname.
- After the Degens SPA has a stable **HTTPS origin**, add it to **`apps/game-arena/src/server.ts`** `allowedOrigins` and `socketIoCorsOrigins` if connections are cross-origin from the SPA (same pattern as `activity.tiltcheck.me`).

### Discord Developer Portal

- Use **this** Embedded App URL + OAuth config for Degens only; **do not** reuse `activity.tiltcheck.me` for the Degens Discord app unless you intentionally serve both products from one host (you are not).
- Include `https://<APPLICATION_ID>.discordsays.com` on OAuth2 redirects the same way as the main Activity.

### Internal networking (optional nginx in Docker)

If you copy the `apps/activity` Dockerfile pattern, proxy **`/socket.io/`** to `game-arena.railway.internal:3000` so the iframe can use **same-origin** Socket.IO (then `VITE_ARENA_URL` can be omitted or set to the Degens public origin). If you **do not** proxy, clients must use **`VITE_ARENA_URL`** pointing at **`https://game-arena.tiltcheck.me`**.

### Smoke

1. `pnpm --filter @tiltcheck/degens-activity build`
2. Open the public URL in a normal browser; confirm JS loads and status is not stuck forever on CONNECTING after Discord handshake timeout (see app `initSDK` timeout behavior).
3. Launch the Activity in Discord; confirm trivia/lobby mounts and realtime events reach the client.

## Rollback Notes

- Container services: rollback from the Railway dashboard to the prior image or release.
- `hub` Worker: rollback from the Cloudflare dashboard or redeploy the previous Worker bundle with Wrangler.
- Tunnel drift: rerun `.github/workflows/configure-tunnel.yml` only if tunnel-based ingress is intentionally enabled; otherwise verify direct custom-domain mapping in Railway/Cloudflare.
- Browser assets: republish the previous extension or SPA artifact manually.

## Manual Publish Notes

### `tiltcheck-activity` (deprecated)

`apps/tiltcheck-activity` is kept only as a reference while consolidating onto `apps/activity`. It should not be deployed. See `apps/tiltcheck-activity/README.md`.

### `degens-activity` pointers

- **Recommended production path:** second Railway service and public hostname — see **Degens Activity (`apps/degens-activity`) — second Railway service** above.
- **Alternative:** publish `pnpm --filter @tiltcheck/degens-activity build` output to any HTTPS static host without Railway.
- **Local tunnel:** `pnpm --filter @tiltcheck/degens-activity dev:tunnel` → `dev-degens.tiltcheck.me`

### `chrome-extension`

- Chosen target: manual package publish, not CI deploy.
- Build with `pnpm -C apps/chrome-extension build`.
- Package the built output as a ZIP and either:
  - distribute it directly for developer-mode installs, or
  - upload it through the Chrome Web Store Developer Dashboard.
- Store listing and packaging details live in `apps/chrome-extension/docs/publishing.md`.

## Validation Notes

When this file changes, confirm all three checks before merging:

1. `git ls-files ".github/workflows/*"` still shows no tracked `deploy-gcp` workflow file in the repo.
2. If GitHub UI or `gh workflow list` still shows retired workflow metadata, confirm `gh workflow view <id> --yaml` fails before treating it as an active source of truth.
3. Every deployable row above still matches the active workflow, an explicit manual path, or an explicitly **TBD** Railway extension (e.g. **degens-activity** CI wiring).
