<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17 -->

# Compose production stack

Files for the **Railway exit** path (VPS + GHCR + Cloudflare Tunnel).

| File | Purpose |
|------|---------|
| `docker-compose.ghcr.yml` | Pull all `ghcr.io/tiltcheck-me/tiltcheck-*` images and run the full stack |
| `tunnel-ingress.compose.json` | Tunnel ingress when `cloudflared` runs on the same Docker network |
| `tunnel-ingress.railway.json` | Legacy Railway `*.railway.internal` ingress (rollback) |

Deploy:

```bash
export GHCR_OWNER=tiltcheck-me IMAGE_TAG=latest
bash scripts/ops/deploy-ghcr-stack.sh
VERIFY_PUBLIC=1 bash scripts/ops/verify-stack-health.sh
```

Full cutover checklist: `docs/migration/exit-railway-plan.md`
