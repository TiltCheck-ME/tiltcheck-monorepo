# Scripts Quick Guide

This folder has many one-off and historical utilities. If you are working solo, use the small subset below and ignore the rest unless needed.

## Use These First

- `scripts/sync-branch.ps1` / `scripts/sync-branch.sh`
  - Rebases your local branch on top of remote and shows ahead/behind.
- `scripts/gcp/create-budget-alerts.ps1` / `scripts/gcp/create-budget-alerts.sh`
  - Creates budget guardrails for GCP migration.
- `scripts/gcp/deploy-cloud-run-service.ps1` / `scripts/gcp/deploy-cloud-run-service.sh`
  - Builds and deploys one service to Cloud Run from `infra/gcp/cloudrun/services.env`.
- `scripts/gcp/new-milestone-log.ps1`
  - Inserts a new migration milestone template into `docs/migration/logs/milestone-log.md`.
- `scripts/mvp-beta-tools-smoke.sh`
  - Quick smoke checks for beta/tools pages.
- `scripts/linear-sync.mjs`
  - Syncs `docs/ops/linear-tasks.json` into Linear issues.
- `scripts/daily-ops.ps1`
  - Prints your daily run order and can trigger Linear sync.

## Daily Solo Workflow (Recommended)

1. Sync your branch:
   - `powershell -ExecutionPolicy Bypass -File ./scripts/sync-branch.ps1`
2. Keep migration safe on cost:
   - `powershell -ExecutionPolicy Bypass -File ./scripts/gcp/create-budget-alerts.ps1 -BillingAccount "<billing-account-id>"`
3. Deploy only one service at a time:
   - `powershell -ExecutionPolicy Bypass -File ./scripts/gcp/deploy-cloud-run-service.ps1 -ServiceName "api" -ProjectId "<project-id>"`
4. Log progress:
   - `powershell -ExecutionPolicy Bypass -File ./scripts/gcp/new-milestone-log.ps1 -MilestoneId "M1-foundation"`
5. Sync tasks to Linear (dry-run first):
   - `node scripts/linear-sync.mjs --dry-run`

## Use With Caution (Specialized / One-off)

- Docs/content conversion: `convert-markdown.js`, `generate-regulations-draft.mjs`, `sync-regulations-us.mjs`
- Repo/admin helpers: `migrate-repo.sh`, `build-gitlab-wiki.js`, `add-copyright-headers.sh`
- Setup/deploy diagnostics: `validate-production-env.sh`, `validate-docker-credentials.sh`, `check-health.sh`
- Experimental automation: `devx-duo-agent.mjs`

Only run these when you have a specific task and have checked the script first.

## Current Drift To Be Aware Of

Root `package.json` references several script files that are currently missing from this folder:

- `scripts/audit-images.js`
- `scripts/a11y-regression-landing.js`
- `scripts/optimize-images.js`
- `scripts/run-lighthouse.js`
- `scripts/build-search-index.js`
- `scripts/lighthouse-ci.js`

If npm commands that rely on those fail, this mismatch is the reason.
