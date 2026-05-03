<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# Compute Migration Runbook (GCP Managed Containers)

Last updated: 2026-03-07
Scope: Wave 1 compute services in `us-central1`

## Services

From `infra/gcp/cloudrun/services.env`:

- `api`
- `discord-bot`
- `trust-rollup`
- `web`
- `comic-generator`

## Prerequisites

- Foundation bootstrap complete (`infra/gcp/bootstrap-gcp.sh` or `.ps1`)
- Runtime secrets created in Secret Manager
- Environment files prepared per service (optional):
  - `.env.gcp.api`
  - `.env.gcp.discord-bot`
  - `.env.gcp.trust-rollup`
  - `.env.gcp.web`
  - `.env.gcp.comic-generator`

## Deploy Steps

### Bash

```bash
PROJECT_ID="your-project-id" REGION="us-central1" bash <service-deploy-script> api
PROJECT_ID="your-project-id" REGION="us-central1" bash <service-deploy-script> discord-bot
PROJECT_ID="your-project-id" REGION="us-central1" bash <service-deploy-script> trust-rollup
PROJECT_ID="your-project-id" REGION="us-central1" bash <service-deploy-script> web
PROJECT_ID="your-project-id" REGION="us-central1" bash <service-deploy-script> comic-generator
```

### PowerShell

```powershell
.\scripts\gcp\deploy-service.ps1 -ProjectId "your-project-id" -Region "us-central1" -ServiceName "api"
.\scripts\gcp\deploy-service.ps1 -ProjectId "your-project-id" -Region "us-central1" -ServiceName "discord-bot"
.\scripts\gcp\deploy-service.ps1 -ProjectId "your-project-id" -Region "us-central1" -ServiceName "trust-rollup"
.\scripts\gcp\deploy-service.ps1 -ProjectId "your-project-id" -Region "us-central1" -ServiceName "web"
.\scripts\gcp\deploy-service.ps1 -ProjectId "your-project-id" -Region "us-central1" -ServiceName "comic-generator"
```

## Health Checks and Validation

- `api`: verify `/health`
- `discord-bot`: verify bot health endpoint
- `web`: verify `status.html` and key static pages
- `trust-rollup`: verify health endpoint and scheduler startup logs
- `comic-generator`: verify ingest and generation endpoint health

## Domain and TLS

- Use managed HTTPS load balancer and SSL certificates.
- Route:
  - `api.tiltcheck.me` -> `api`
  - `tiltcheck.me` -> `web`
  - other hostnames as needed per service

## Rollback

- Redeploy the previous managed-runtime revision for the impacted service only.
- Keep rollback per service to avoid broad regression blast radius.
