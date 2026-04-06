<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06 -->

# TiltCheck Deployment Guide

## Summary of the Current Plan

The entire TiltCheck ecosystem is deployed on **Railway**. All services are containerized via Docker and deployed through the `deploy-railway.yml` GitHub Actions workflow on every push to `main`.

- **CI/CD:** `.github/workflows/deploy-railway.yml` builds images to GHCR and deploys via Railway CLI.
- **Per-service config:** Each app has a `railway.json` in its directory specifying the Dockerfile path, health check, and restart policy.
- **Setup guide:** [`docs/infra/railway-setup.md`](infra/railway-setup.md)

## Services Deployed on Railway

| Service | Directory | Port |
| :--- | :--- | :--- |
| API gateway | `apps/api` | 3001 |
| Landing page | `apps/web` | 3000 |
| Discord bot | `apps/discord-bot` | 8080 |
| Trust rollup | `apps/trust-rollup` | 8082 |
| Control room | `apps/control-room` | 3001 |
| Game arena | `apps/game-arena` | 8080 |
| User dashboard | `apps/user-dashboard` | 6001 |

## Exceptions to the Unified Strategy

### Compliance-Edge Worker

The `compliance-edge` service is a Cloudflare Worker that provides informational geo-compliance nudges to users.

- **Purpose:** To inform users of local gambling regulations based on their region, without blocking access.
- **Justification:** A Cloudflare Worker executes directly on Cloudflare's global network, close to the user, allowing for low-latency location detection and response. This is an intentional exception to the Railway deployment strategy.

## Rollback

To roll back any service, use the Railway dashboard or CLI:

```bash
railway rollback --service <service-name> --environment production
```

---
**TiltCheck Ecosystem © 2024–2026**
