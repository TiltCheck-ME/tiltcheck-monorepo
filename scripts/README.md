<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 -->

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
- `scripts/ops/deploy-ghcr-stack.sh` / `scripts/ops/verify-stack-health.sh`
  - VPS compose deploy and health checks (Railway exit). See `docs/migration/exit-railway-plan.md`.
- `scripts/linear-sync.mjs`
  - Syncs `docs/ops/linear-tasks.json` into Linear issues.
- `scripts/ops/research-brief.mjs` + `scripts/ops/merge-proposed-tasks.mjs`
  - Runs the research ops brief loop and merges at most 5 new research or recurring tasks into `docs/ops/linear-tasks.json`.
- `docs/ops/LINEAR-WORKFLOW.md` + `.github/workflows/research-ops.yml`
  - Canonical local and scheduled PR-delivery path for research ops.
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
5. If you are running research ops, generate the brief and merge the newest sidecar first:
   - `pnpm run ops:research:run --slug competitor-matrix`
   - `pnpm run ops:research:merge-tasks --sidecar docs/research/YYYY-MM-DD-competitor-matrix.tasks.json`
6. Sync tasks to Linear (dry-run first):
   - `node scripts/linear-sync.mjs --dry-run`

## Use With Caution (Specialized / One-off)

- Docs/content conversion: `convert-markdown.js` (`pnpm docs:pages`), `sync-docs.sh`, `generate-regulations-draft.mjs`, `sync-regulations-us.mjs`
- Repo/admin helpers: `migrate-repo.sh`, `build-gitlab-wiki.js`, `add-copyright-headers.sh`
- Setup/deploy diagnostics: `validate-production-env.sh`, `validate-docker-credentials.sh`, `check-health.sh`
- Experimental automation: `devx-duo-agent.mjs`

Only run these when you have a specific task and have checked the script first.

## Current State

The root `package.json` no longer exposes the removed landing audit and lighthouse helpers that used to point at missing files in this folder.

Made for Degens. By Degens.
