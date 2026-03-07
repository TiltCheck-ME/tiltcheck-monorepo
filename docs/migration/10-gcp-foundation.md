# GCP Foundation Baseline

Last updated: 2026-03-07
Region default: `us-central1`

## Foundation Topology

- Projects:
  - `tiltcheck-dev`
  - `tiltcheck-staging`
  - `tiltcheck-prod`
- Core services:
  - Artifact Registry
  - Cloud Run
  - Secret Manager
  - Cloud Logging/Monitoring
  - Cloud Build
  - Cloud Scheduler

## IAM Model (Least Privilege)

- Human roles (group-based):
  - `tiltcheck-platform-admins` -> project IAM admin for bootstrap only
  - `tiltcheck-deployers` -> Cloud Run admin + Artifact Registry writer + Service Account User
  - `tiltcheck-observers` -> Logging/Monitoring viewer
- Service accounts:
  - `sa-cloudrun-runtime` (runtime identity for services)
  - `sa-cloudbuild-deployer` (build and deploy identity)
  - `sa-cost-monitor` (billing export/read, optional)

## Secret Manager Policy

- Store only runtime secrets and production tokens in Secret Manager.
- Keep `.env.example` files in git with no real values.
- Name secrets with environment prefix:
  - `prod-discord-token`
  - `prod-neon-database-url`
  - `prod-jwt-secret`

## Logging and Monitoring Baseline

- Keep application logs in Cloud Logging with conservative retention.
- Add alert policies for:
  - service unavailability
  - error rate spikes
  - budget threshold alarms
- Exclude verbose debug logs from paid sinks where possible.

## Budget and Labels

- Budgets:
  - migration cap budget (`$300`) with threshold notifications
  - steady-state ops budget (set after pilot)
- Required labels:
  - `service`
  - `environment`
  - `owner`
  - `cost_center` (default `migration`)

## Bootstrap Command

Use one of:

- `infra/gcp/bootstrap-gcp.sh` (bash)
- `infra/gcp/bootstrap-gcp.ps1` (PowerShell)

Both scripts:

- enable required APIs
- create Artifact Registry repository
- create baseline service accounts
- create IAM bindings for deploy account
