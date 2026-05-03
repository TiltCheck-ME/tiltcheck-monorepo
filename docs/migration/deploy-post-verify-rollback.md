<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 -->

# Deploy Post-Verification and Rollback Notes

This update adds fail-fast verification and rollback guidance for legacy VPS and GCloud VM deploy flows.

## CI regression gate for deploy scripts

CI now runs deploy script checks on push and MR pipelines via:

- `.gitlab-ci.yml` job: `deploy_script_checks`
- command: `pnpm run ci:deploy:scripts`
- script: `scripts/check-deploy-scripts.sh`

The gate blocks when any of these regress:

1. Shell syntax validity (`bash -n`) for deploy scripts.
2. Legacy VPS deploy dry-run flow (`deploy-vps.sh --dry-run` with env guardrails).
3. GCloud VM preflight guardrails (`scripts/deploy-gcloud.sh --preflight`).
4. Managed runtime preflight guardrails (`<service-deploy-script> --preflight <service>`).

## Updated scripts

- `deploy-vps.sh`
  - Validates required `.env` keys before deploy.
  - Runs post-deploy smoke checks.
  - Automatically rolls back to previous git commit if smoke checks fail.
  - Supports `--dry-run` to preview deploy actions.

- `scripts/deploy-gcloud.sh`
  - Validates `dist-bundle/.env` required keys before deploy.
  - Verifies PM2 has online processes after deploy.
  - On `--update`, snapshots remote app dir and auto-rolls back on verification failure.

- `scripts/deploy-gcloud-rollback.sh`
  - Manual rollback helper to restore latest backup snapshot.
  - Supports `--dry-run`.

## Dry-run examples

```bash
bash deploy-vps.sh --dry-run
bash scripts/deploy-gcloud-rollback.sh --dry-run
```

## Preflight examples (CI-safe, no cloud mutation)

```bash
PROJECT_ID=tiltcheck-ci bash scripts/deploy-gcloud.sh --preflight
PROJECT_ID=tiltcheck-ci bash <service-deploy-script> --preflight api
```

## Rollback quick command

```bash
bash scripts/deploy-gcloud-rollback.sh
```

## Verified rollback drill evidence (2026-03-08)

The following commands were executed from repo root and passed:

### 1) VPS deploy dry-run drill

```bash
ALLOW_LEGACY_VPS_DEPLOY=1 bash deploy-vps.sh --dry-run
```

Expected output markers:

- `Preparing deployment to TiltCheck VPS`
- `[dry-run] rsync ... .env`
- `[dry-run] ssh ... (deploy + smoke test + rollback on failure)`
- `Deployment complete`

Observed outcome:

- All markers present.
- No remote mutation performed (dry-run).

### 2) GCloud VM preflight drill

```bash
PROJECT_ID=tiltcheck-ci bash scripts/deploy-gcloud.sh --preflight
```

Expected output markers:

- `[INFO] Using project: tiltchcek-ci`
- `[INFO] Preflight checks passed.`

Observed outcome:

- Both markers present.
- Guardrails validated without requiring `gcloud` execution.

### 3) GCloud rollback dry-run drill

```bash
bash scripts/deploy-gcloud-rollback.sh --dry-run
```

Expected output markers:

- `[dry-run] gcloud compute ssh`
- rollback command block containing:
  - `LAST_BACKUP=...`
  - `rsync --delete`
  - `pm2 restart ecosystem.config.cjs`

Observed outcome:

- Command rendered full rollback sequence in dry-run mode.
- No VM changes made.

### 4) Managed runtime preflight drill

```bash
PROJECT_ID=tiltcheck-ci bash <service-deploy-script> --preflight api
```

Expected output marker:

- `Preflight checks passed for service: api`

Observed outcome:

- Marker present.
- Service definition + Dockerfile + env guardrails validated with no deployment action.
