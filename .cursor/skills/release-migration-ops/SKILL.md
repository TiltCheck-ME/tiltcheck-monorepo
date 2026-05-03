---
name: release-migration-ops
description: Guides safe solo release and migration operations with incremental rollout, budget guardrails, and milestone logging. Use for deployment planning, GCP migration tasks, release readiness checks, and rollback-aware operations.
---
<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->


# Release and Migration Ops

## Default Runbook

1. Confirm scope: one service or one migration milestone at a time.
2. Sync branch and inspect drift before operational changes.
3. Apply budget and cost guardrails before deployment.
4. Deploy incrementally and verify health signals.
5. Log milestone progress and rollback notes.
6. Return a pass/fail matrix before recommending release.

## Repository References

- `scripts/README.md`
- `scripts/gcp/create-budget-alerts.ps1`
- `scripts/gcp/deploy-service.ps1`
- `scripts/gcp/new-milestone-log.ps1`
- `infra/gcp/cloudrun/services.env`

## Guardrails

- Never hardcode credentials or commit secret values.
- Prefer reversible steps with explicit rollback path.
- Capture post-deploy verification and unresolved risks.
- Use repo package manager defaults (`pnpm`) unless explicitly told otherwise.

## Output Contract

- Commands run
- Pass/fail matrix by check area
- Concrete blockers
- Next safest command sequence
