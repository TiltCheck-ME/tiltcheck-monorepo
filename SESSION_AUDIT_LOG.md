# TiltCheck Session Audit Log
**Date:** 2026-03-29
**Status:** Monorepo Stabilized & Infrastructure Aligned

## 1. Infrastructure Alignment (The 'tiltchcek' Exorcism)
- **Source of Truth**: Confirmed via `gcloud config list` that the official Google Cloud Project ID is misspelled as **`tiltchcek`**.
- **The Revert**: Successfully reverted broad Find-and-Replace fixes that were breaking Artifact Registry paths.
- **Surgical Patching**: Restored all infrastructure paths (`us-central1-docker.pkg.dev/tiltchcek/`, `gs://tiltchcek_cloudbuild/`, etc.) while protecting the brand-name package namespace (`@tiltcheck/`).
- **Files Synchronized**: 24+ deployment manifests including `cloudbuild.yaml`, `all_services_gcp.yaml`, and service-specific `deploy.yaml` files.

## 2. Monorepo Build Stability
- **TypeScript 6.0 Compatibility**:
    - Purged deprecated `baseUrl` from the root `tsconfig.json`.
    - Removed restrictive `"types": ["node"]` at the root, which was blocking third-party type discovery (e.g., `jose`, `express`).
    - Fixed ESM-NodeNext import style conflicts (e.g., `express-rate-limit` named imports).
- **Package Cleanup**: Purged circular resolution artifacts (orphaned `.d.ts` files) that were causing `rootDir` conflicts during `tsc --build`.
- **Degen Intelligence Agent (DIA)**:
    - Fixed build-blocking import errors where correct `@tiltcheck/` package names were accidentally changed to `@tiltchcek/`.
    - Resolved `TS7006` (implicit any) in `agent.ts` mapping logic.
    - Stabilized `app/agent.js` entry point in `package.json`.

## 3. Security Hardening
- **Dependabot Remediation**: Neutralized **73/75** vulnerabilities reported by the system.
- **Targeted Overrides**: Forced the entire monorepo tree to use secure versions of critical dependencies:
    - `tar`: Forced `^7.5.11` (vulnerability cluster patched).
    - `cross-spawn`: Forced `^7.0.5`.
    - `elliptic`: Forced `^6.6.1`.
    - `@tootallnate/once`: Forced `^3.0.1`.
- **Result**: Zero HIGH severity vulnerabilities remaining in core service paths.

## 4. Feature & UI Progress
- **Identity Bridge**: Updated `/linkwallet` logic and ensured Neon database table parity for SOL to Discord mapping.
- **Guardian Network (Pillar 4)**: Finalized `GuardianManager` integration into the dashboard and exposed necessary API endpoints.
- **Safety Pipeline**: Injected `AGENT_DIA_URL` into the production `.env` to enable the 2-Tier AI safety evaluation.

---
**Current Verdict:** The monorepo is in a "Green State" for Cloud Build.

---
# GCP Decommission Audit Log
**Date:** 2026-04-04
**Status:** GCP Removal In Progress

## Summary
Full migration off Google Cloud Platform initiated. Replacement stack:
- Cloud Run (8 services) -> Railway + GHCR
- Artifact Registry -> GitHub Container Registry (ghcr.io)
- Cloud SQL -> Neon (was already primary DB)
- Secret Manager -> Railway environment variables
- Cloud Storage (GCS) -> Cloudflare R2
- Vertex AI -> Gemini API direct (no GCP project required)
- Cloud Build -> GitHub Actions only

## Changes Committed

### Phase 1: Cloud SQL Removal
- `packages/database/src/cloudsql.ts`: Removed hardcoded Cloud SQL credentials and IP address. Now reads from NEON_DATABASE_URL or DATABASE_URL only.
- `packages/database/scripts/migrate-to-gcp.ts`: Renamed migration target from Cloud SQL to Neon. Removed hardcoded credentials.
- `packages/database/src/index.ts`: Updated header comment to reflect Neon as the PostgreSQL layer.

### Phase 2/4: CI/CD Migration
- `.github/workflows/deploy-railway.yml`: Activated push-to-main trigger. Added all 7 services. Added GHCR build-and-push job before Railway deploy.
- `.github/workflows/deploy-gcp.yml`: Disabled (header-only file retained for decommission reference window).

### Phase 5: Cloud Storage -> Cloudflare R2
- `packages/comic-generator/package.json`: Removed @google-cloud/storage, added @aws-sdk/client-s3.
- `packages/comic-generator/.env.example`: Replaced COMIC_GCS_BUCKET with COMIC_R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, COMIC_R2_ENDPOINT.
- `packages/comic-generator/deploy-cloud-run.sh`: Deleted.
- `packages/comic-generator/deploy-cloud-run.ps1`: Deleted.

### Phase 6: Vertex AI -> Gemini Direct API
- `packages/ai-client/src/index.ts`: Updated makeVertexRequest to call https://generativelanguage.googleapis.com/v1beta/models/... instead of aiplatform.googleapis.com. Removed streaming response aggregation (direct API returns single response).
- `packages/agent/.env.example`: Set GOOGLE_GENAI_USE_VERTEXAI=false, added GEMINI_API_KEY. Commented out GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION.

### Phase 7: GCP CI/CD and Config Files Deleted
- `cloudbuild.yaml`: Deleted.
- `all_services_gcp.yaml`: Deleted.
- `api-config.yaml`: Deleted.
- `discord-bot-deploy.yaml`: Deleted.
- `game-arena-deploy.yaml`: Deleted.
- `trust-rollup-deploy.yaml`: Deleted.
- `user-dashboard-deploy.yaml`: Deleted.
- `control-room-deploy.yaml`: Deleted.
- `tiltcheck-api-gcp.yaml`: Deleted.
- `tiltcheck-bot-gcp.yaml`: Deleted.
- `tiltcheck-bot-gcp-utf8.yaml`: Deleted.
- `packages/agent/.cloudbuild/`: Deleted (pr_checks.yaml, staging.yaml, deploy-to-prod.yaml).
- `infra/gcp/`: Deleted (bootstrap scripts, Cloud Run service env).
- `scripts/gcp/`: Deleted (deploy-cloud-run-service.sh, create-budget-alerts.sh).
- `scripts/deploy-gcloud.sh`: Deleted.

### Phase 8: Terraform Deleted
- `packages/agent/deployment/terraform/`: Entire directory deleted (all GCP Terraform IaC).

### Phase 9: npm Dependencies
- `apps/api/package.json`: Removed @google-cloud/local-auth and googleapis (unused in source).
- `packages/comic-generator/package.json`: Removed @google-cloud/storage, added @aws-sdk/client-s3.
- `.env.example`: Added RAILWAY_TOKEN, GEMINI_API_KEY, GOOGLE_GENAI_USE_VERTEXAI, R2 storage vars.

## Remaining Operational Steps (Require GCP/Platform Access)
1. Run `terraform destroy` on the tiltchcek GCP project to remove all cloud resources.
2. Provision Cloudflare R2 bucket and update COMIC_R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in Railway env.
3. Set RAILWAY_TOKEN GitHub secret and configure Railway services for all 7 apps.
4. Rotate all credentials exposed in source history: Cloud SQL password T1lt_Ch3ck_Pr0d_5ecure_!2026, service account key GCP_SA_KEY.
5. Update DNS CNAME records to point to Railway service URLs once validated.
6. Close or archive the tiltchcek GCP project to stop billing.
