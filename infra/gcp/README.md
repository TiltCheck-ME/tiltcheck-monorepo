# GCP Infrastructure Bootstrap

This directory contains bootstrap scripts for the initial GCP migration foundation.

## Prerequisites

- `gcloud` CLI installed and authenticated
- Billing enabled on target project
- Permissions to enable APIs and create IAM/service accounts

## Bootstrap

### Bash

```bash
PROJECT_ID="your-project-id" \
REGION="us-central1" \
AR_REPO="tiltcheck-services" \
bash infra/gcp/bootstrap-gcp.sh
```

### PowerShell

```powershell
.\infra\gcp\bootstrap-gcp.ps1 `
  -ProjectId "your-project-id" `
  -Region "us-central1" `
  -ArtifactRegistryRepo "tiltcheck-services"
```

## What Gets Created

- Required service APIs enabled
- Docker Artifact Registry repository
- Cloud Run runtime service account
- Cloud Build deployer service account
- Optional deployer IAM role bindings (when `DEPLOYER_MEMBER` is provided)

## Notes

- Scripts are idempotent for repeated runs.
- Secrets are intentionally not created here; set those per service during deployment.
