# Cloud Agent Credential Manifest

Last updated: 2026-03-07
Scope: GCP migration execution by external/cloud agents

## Active Filled Values (TiltCheck)

- `GCP_PROJECT_ID=tiltcheck`
- `GCP_PROJECT_NUMBER=164294266634`
- `GCP_REGION=us-central1`
- `AR_REPO=tiltcheck-services` (default confirmed)
- `BILLING_ACCOUNT=016B83-0506A4-D579DD`
- `BUDGET_AMOUNT=300`
- Primary domains:
  - `tiltcheck.me`
  - `api.tiltcheck.me`
- Wave 1 migration scope:
  - `api`
  - `web`

## Remaining Values You Still Need to Provide

- `GCP_WORKLOAD_IDENTITY_PROVIDER` (exact provider resource path)
- Confirm deployer SA:
  - default: `sa-cloudbuild-deployer@tiltcheck.iam.gserviceaccount.com`
- Confirm runtime SA:
  - default: `sa-cloudrun-runtime@tiltcheck.iam.gserviceaccount.com`

## Usage Rules

- Do not commit real secret values to git.
- Use short-lived credentials where possible.
- Prefer Workload Identity Federation over long-lived service account keys.
- Grant only minimum roles needed for current milestone.

## 1) Core Environment Variables (Non-Secret)

```env
# Project and region
GCP_PROJECT_ID=tiltcheck
GCP_PROJECT_NUMBER=164294266634
GCP_REGION=us-central1

# Artifact Registry
AR_REPO=tiltcheck-services

# Runtime identities
GCP_DEPLOYER_SERVICE_ACCOUNT=sa-cloudbuild-deployer@tiltcheck.iam.gserviceaccount.com
GCP_RUNTIME_SERVICE_ACCOUNT=sa-cloudrun-runtime@tiltcheck.iam.gserviceaccount.com

# Optional IAM bootstrap input
DEPLOYER_MEMBER=serviceAccount:sa-cloudbuild-deployer@tiltcheck.iam.gserviceaccount.com

# Budget automation
BILLING_ACCOUNT=016B83-0506A4-D579DD
BUDGET_AMOUNT=300
```

## 2) CI/Agent Auth Variables (Preferred)

```env
# Workload identity federation
GCP_WORKLOAD_IDENTITY_PROVIDER=projects/164294266634/locations/global/workloadIdentityPools/POOL/providers/PROVIDER
GCP_DEPLOYER_SERVICE_ACCOUNT=sa-cloudbuild-deployer@tiltcheck.iam.gserviceaccount.com
```

If federation is unavailable, use short-lived key material only and rotate after migration milestone completion.

## 3) Required Secret Manager Entries (Names Only)

Create these in Secret Manager; do not put values in repo:

- `prod-discord-token`
- `prod-discord-client-secret`
- `prod-jwt-secret`
- `prod-database-url`
- `prod-redis-url` (if needed)
- `prod-gemini-api-key` (comic generator)
- `prod-comic-ingest-key` (if ingest auth enabled)

## 4) Service-Level Env Files (Non-Secret Values)

Local files (not committed with secrets):

- `.env.gcp.api`
- `.env.gcp.discord-bot`
- `.env.gcp.trust-rollup`
- `.env.gcp.web`
- `.env.gcp.comic-generator`

Only include non-sensitive runtime config here. Reference secrets via Secret Manager at deploy time.

## 5) Least-Privilege IAM Role Mapping

### Deployer identity (`sa-cloudbuild-deployer`)

- `roles/run.admin`
- `roles/artifactregistry.writer`
- `roles/iam.serviceAccountUser`
- `roles/secretmanager.secretAccessor` (only for required secrets)

### Runtime identity (`sa-cloudrun-runtime`)

- `roles/secretmanager.secretAccessor` (service-specific secrets only)
- `roles/logging.logWriter` (if not inherited)
- `roles/monitoring.metricWriter` (if metrics write required)

### Budget automation identity (optional)

- Billing budget creation/view permissions scoped to migration budget tasks only.

## 6) Domain and DNS Permissions (If Needed)

If agents perform cutover tasks:

- DNS zone scoped editor (target zone only)
- Certificate/LB permissions scoped to migration hostnames only
- Target hostnames:
  - `tiltcheck.me`
  - `api.tiltcheck.me`

## 6.1) Wave 1 Assignment (Current)

- `api` (Cloud Run)
- `web` (Cloud Run or static path via GCP)

Defer other services until Wave 1 health/cost validation completes.

## 7) Credential Delivery Checklist

- [ ] Core non-secret env vars shared
- [ ] Workload identity variables shared
- [ ] Secret names shared (not values)
- [ ] Secret values provisioned directly in GCP Secret Manager
- [ ] IAM roles verified least-privilege
- [ ] Budget alert variables configured
- [ ] Rotation date scheduled

## 8) Rotation and Revocation

- Rotate any temporary credentials immediately after milestone completion.
- Revoke unused principals and remove excess IAM grants.
- Record rotation in `docs/migration/logs/milestone-log.md`.

## 9) Copy/Paste Agent Handoff Block

```text
You are executing TiltCheck GCP migration tasks.
Use docs/migration/cloud-agent-credential-manifest.md and docs/AI-HANDOFF.md as source of truth.
Use project tiltcheck in us-central1.
Wave 1 scope is api + web only.
Do not commit secrets.
Use least-privilege IAM only.
Ask for approval before any ambiguous architecture/security/cost decision.
Record milestone outputs in docs/migration/logs/milestone-log.md and docs/migration/logs/cost-pilot.csv.
```
