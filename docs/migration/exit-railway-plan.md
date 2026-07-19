<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17 -->

# Exit Railway — Full Stack Migration Plan

> **Path B (2026-07-19):** Phase-1 production home is Spaceship Hyperlift
> (`docs/migration/spaceship-hyperlift-cutover.md`). This VPS+tunnel plan remains valid
> if Hyperlift is left later; do not treat Railway as live.

Move every containerized TiltCheck service off Railway while keeping **Cloudflare DNS + Tunnel** as the public edge. Domains stay on `tiltcheck.me`; only the compute backend changes.

## Target architecture

```
Internet
   │
   ▼
Cloudflare DNS (proxied CNAME → tunnel)
   │
   ▼
cloudflared (on VPS Docker network)
   │
   ├── api:3001              → api.tiltcheck.me
   ├── web:3000              → tiltcheck.me / www
   ├── user-dashboard:6001   → dashboard.tiltcheck.me / hub
   ├── activity:8080         → activity.tiltcheck.me
   ├── game-arena:8080       → arena.tiltcheck.me
   ├── control-room:3001     → admin.tiltcheck.me
   └── (bots: no public hostname — outbound only)

GHCR images (unchanged CI build) ← GitHub Actions
VPS runs `infra/compose/docker-compose.ghcr.yml`
```

**Stays off this stack**

| Surface | Host | Reason |
|---------|------|--------|
| Hub Worker | `hub.tiltcheck.me` (optional) | Already Cloudflare Workers via `deploy-hub.yml` |
| GitHub Pages | `github.io/.../docs` | Static spec mirror only |
| Chrome extension | Browser asset | Manual / store publish |

## Why VPS + Docker Compose (not another PaaS)

| Requirement | VPS + Compose | Fly.io (11 apps) | GCP Cloud Run |
|-------------|---------------|------------------|---------------|
| Reuse GHCR images | Yes | Yes | Yes |
| Discord bots 24/7 | Yes | Yes (min instances) | Awkward / costly |
| Socket.IO (`game-arena`) | Same Docker network | Needs config | Extra LB work |
| Single `.env` for secrets | Yes | Per-app secrets | Secret Manager sprawl |
| Repo already has compose | `docker-compose.prod.yml` | New fly.toml × 11 | GCP scripts pruned |

Fly.io remains a valid alternative if you prefer managed ops over a single VPS bill. This plan optimizes for **one box, one compose file, tunnel ingress unchanged**.

## Service inventory (11 containers)

| Service | Image | Container port | Public host |
|---------|-------|----------------|-------------|
| `api` | `tiltcheck-api` | 3001 | `api.tiltcheck.me` |
| `web` | `tiltcheck-web` | 3000 | `tiltcheck.me`, `www` |
| `discord-bot` | `tiltcheck-discord-bot` | 8080 | none |
| `justthetip-bot` | `tiltcheck-justthetip-bot` | 8080 | none |
| `dad-bot` | `tiltcheck-dad-bot` | 8080 | none |
| `trust-rollup` | `tiltcheck-trust-rollup` | 8082 | none |
| `control-room` | `tiltcheck-control-room` | 3001 | `admin.tiltcheck.me` |
| `game-arena` | `tiltcheck-game-arena` | 8080 | `arena.tiltcheck.me` |
| `user-dashboard` | `tiltcheck-user-dashboard` | 6001 | `dashboard.tiltcheck.me` |
| `activity` | `tiltcheck-activity` | 8080 | `activity.tiltcheck.me` |
| `cloudflared` | `tiltcheck-cloudflared` | n/a | tunnel daemon |

## Migration phases

### Phase 0 — Prep (no DNS change)

- [ ] Provision VPS (4 vCPU / 8 GB RAM minimum for full stack; Ubuntu 22.04+)
- [ ] Install Docker + Docker Compose plugin
- [ ] Copy production `.env` to VPS (`/opt/tiltcheck/.env`) — never commit
- [ ] Set GitHub secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_DEPLOY_PATH` (optional, default `/opt/tiltcheck`)
- [ ] Confirm `TUNNEL_TOKEN` works on VPS (same token as Railway cloudflared or rotate)

### Phase 1 — Staging on VPS

1. `pnpm docs:pages` not required here — focus on containers.
2. On VPS:
   ```bash
   git clone https://github.com/TiltCheck-ME/tiltcheck-monorepo.git /opt/tiltcheck
   cd /opt/tiltcheck
   cp /path/to/production.env .env
   export IMAGE_TAG=latest GHCR_OWNER=tiltcheck-me
   bash scripts/ops/deploy-ghcr-stack.sh
   bash scripts/ops/verify-stack-health.sh
   ```
3. Run tunnel workflow with **`ingress_target: compose`** (manual `workflow_dispatch`) against a **staging tunnel** or temporary hostnames — do not cut prod DNS yet.

### Phase 2 — Production cutover

1. Stop Railway `cloudflared` service (avoid dual tunnel fights).
2. Start `cloudflared` on VPS compose stack.
3. Re-run `Configure Cloudflare Tunnel Routes` with `ingress_target: compose`.
4. Verify:
   - `curl -sf https://api.tiltcheck.me/health`
   - `https://tiltcheck.me/` loads
   - `https://dashboard.tiltcheck.me/health`
   - `https://activity.tiltcheck.me/` (browser — CF may challenge bots)
   - Discord bots online in guild
5. Disable Railway deploy job in `.github/workflows/deploy-railway.yml` (or delete workflow after bake-in).
6. Enable `.github/workflows/deploy-stack.yml` VPS SSH redeploy on `main`.

### Phase 3 — Decommission Railway

- [ ] Export env vars from Railway dashboard (backup)
- [ ] Scale all Railway services to 0 / delete project
- [ ] Remove `RAILWAY_TOKEN` from GitHub secrets
- [ ] Update `docs/DEPLOY.md` canonical path to VPS compose

## Rollback

1. Re-enable Railway services and `cloudflared` on Railway.
2. Run tunnel workflow with `ingress_target: railway`.
3. Redeploy last known-good GHCR SHA on Railway via `deploy-railway.yml` manual dispatch.

Rollback window: keep Railway project alive **7 days** after cutover before deletion.

## Risk notes

| Risk | Mitigation |
|------|------------|
| `activity` nginx upstreams were Railway-hardcoded | Fixed: env `API_UPSTREAM` / `ARENA_UPSTREAM` (defaults to Docker service names) |
| Tunnel port drift (Railway used `:3000` for some services) | Compose ingress uses **actual container ports** from Dockerfiles |
| Single VPS = single point of failure | Accept for solo phase; add standby VPS + DNS failover later |
| Secret leakage on VPS | `.env` permissions `600`, no secrets in compose file |
| Downtime during cutover | Run VPS stack healthy first; swap tunnel in one workflow run |

## Validation checklist (post-cutover)

```bash
bash scripts/ops/verify-stack-health.sh
curl -sf https://api.tiltcheck.me/health
curl -sfI https://tiltcheck.me/ | head -1
```

Discord manual checks:

- `/vault status` (discord-bot)
- JustTheTip tip flow in test guild
- Launch Embedded Activity at `activity.tiltcheck.me`

Made for Degens. By Degens.
