# Deploy Post-Verification and Rollback Notes

This update adds fail-fast verification and rollback guidance for legacy VPS and GCloud VM deploy flows.

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

## Rollback quick command

```bash
bash scripts/deploy-gcloud-rollback.sh
```
