<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->
# Scripts Quick Guide

This folder has many one-off and historical utilities. If you are working solo, use the small subset below and ignore the rest unless needed.

## Use These First

- `scripts/sync-branch.ps1` / `scripts/sync-branch.sh`
  - Rebases your local branch on top of remote and shows ahead/behind.
- `scripts/gcp/create-budget-alerts.ps1` / `scripts/gcp/create-budget-alerts.sh`
  - Creates budget guardrails for GCP migration planning.
- `scripts/gcp/new-milestone-log.ps1`
  - Inserts a new migration milestone template into `docs/migration/logs/milestone-log.md`.
- `docs/DEPLOY.md`
  - Canonical source of truth for the current GHCR -> Railway production path.
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
3. Check the current production deploy path before touching release infrastructure:
   - `docs/DEPLOY.md`
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

## Current State

The root `package.json` no longer exposes the removed landing audit and lighthouse helpers that used to point at missing files in this folder.
