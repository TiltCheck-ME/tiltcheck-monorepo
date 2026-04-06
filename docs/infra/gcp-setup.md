<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06 -->

# GCP Cloud Run Setup Guide

One-time steps required in the GCP Console and GitHub before the `deploy-gcp.yml` workflow can run.

---

## 1. GCP Project

Confirm the project exists and billing is active.

- Project ID: `tiltchcek` (intentional spelling — do not change)
- Region: `us-central1`

---

## 2. Enable Required APIs

Run once from Cloud Shell or `gcloud` CLI:

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  --project=tiltchcek
```

---

## 3. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create tiltcheck-services \
  --repository-format=docker \
  --location=us-central1 \
  --description="TiltCheck service images" \
  --project=tiltchcek
```

Images will be stored at:
`us-central1-docker.pkg.dev/tiltchcek/tiltcheck-services/<service>:<tag>`

---

## 4. Create the Cloud Run Service Account

```bash
gcloud iam service-accounts create tiltcheck-runner \
  --display-name="TiltCheck Cloud Run SA" \
  --project=tiltchcek
```

Grant the runtime-only roles this SA needs (Secret Manager access to read mounted secrets):

```bash
PROJECT=tiltchcek
SA=tiltcheck-runner@tiltchcek.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:$SA" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 5. Create the Deploy Service Account (for GitHub Actions)

This is separate from the runtime SA above. It is used by the GitHub Actions workflow to authenticate and submit builds.

```bash
gcloud iam service-accounts create tiltcheck-deploy \
  --display-name="TiltCheck GitHub Deploy SA" \
  --project=tiltchcek

DEPLOY_SA=tiltcheck-deploy@tiltchcek.iam.gserviceaccount.com
RUNNER_SA=tiltcheck-runner@tiltchcek.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding tiltchcek \
  --member="serviceAccount:$DEPLOY_SA" \
  --role="roles/cloudbuild.builds.editor"

# Scope serviceAccountUser to the runtime SA only — do not grant at project level
gcloud iam service-accounts add-iam-policy-binding $RUNNER_SA \
  --member="serviceAccount:$DEPLOY_SA" \
  --role="roles/iam.serviceAccountUser" \
  --project=tiltchcek
```

### Preferred: Workload Identity Federation (keyless auth)

Rather than storing a long-lived JSON key in GitHub Secrets, use Workload Identity Federation so GitHub Actions authenticates via short-lived OIDC tokens.
See: https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines

If you still need the JSON key path, generate and immediately delete the local copy:

```bash
# Generate and download the JSON key
gcloud iam service-accounts keys create /tmp/tiltcheck-deploy-key.json \
  --iam-account=$DEPLOY_SA \
  --project=tiltchcek
```

Add the contents of `/tmp/tiltcheck-deploy-key.json` to GitHub as a repository secret named `GCP_SA_KEY`.

Delete the local key file immediately after:

```bash
rm /tmp/tiltcheck-deploy-key.json
```

---

## 6. Create Secret Manager Secrets

Create each secret below. Replace `VALUE` with the real value.

```bash
PROJECT=tiltchcek

create_secret() {
  echo -n "$2" | gcloud secrets create "$1" \
    --data-file=- \
    --replication-policy=automatic \
    --project=$PROJECT 2>/dev/null || \
  echo -n "$2" | gcloud secrets versions add "$1" \
    --data-file=- \
    --project=$PROJECT
}

create_secret NODE_ENV         "production"
create_secret JWT_SECRET        "REPLACE_ME_MIN_32_CHARS"
create_secret SESSION_SECRET    "REPLACE_ME_MIN_32_CHARS"
create_secret DATABASE_URL      "postgresql://user:pass@host:5432/tiltcheck"
```

Additional secrets required per service (add as needed):

| Secret name | Used by |
| :--- | :--- |
| `SUPABASE_URL` | api, user-dashboard |
| `SUPABASE_ANON_KEY` | api, user-dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | api |
| `TILT_DISCORD_BOT_TOKEN` | discord-bot |
| `TIP_DISCORD_BOT_TOKEN` | discord-bot |
| `VAULT_ENCRYPTION_KEY` | api |
| `INTERNAL_API_SECRET` | api, discord-bot, trust-rollup |
| `OPENAI_API_KEY` | api |
| `GEMINI_API_KEY` | api |

To add a secret to the `cloudbuild.yaml` deploy step, append to the `--set-secrets` flag:

```yaml
--set-secrets="NODE_ENV=NODE_ENV:latest,JWT_SECRET=JWT_SECRET:latest,MY_NEW_SECRET=MY_NEW_SECRET:latest"
```

---

## 7. Grant Cloud Build SA Required Permissions

The Cloud Build SA must push images to Artifact Registry, deploy to Cloud Run, and act as the runtime SA.

```bash
CB_SA=$(gcloud projects describe tiltchcek \
  --format="value(projectNumber)")@cloudbuild.gserviceaccount.com
RUNNER_SA=tiltcheck-runner@tiltchcek.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding tiltchcek \
  --member="serviceAccount:$CB_SA" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding tiltchcek \
  --member="serviceAccount:$CB_SA" \
  --role="roles/run.admin"

# Allow Cloud Build to deploy services that run as tiltcheck-runner
gcloud iam service-accounts add-iam-policy-binding $RUNNER_SA \
  --member="serviceAccount:$CB_SA" \
  --role="roles/iam.serviceAccountUser" \
  --project=tiltchcek
```

---

## 8. Custom Domain Mapping

Map public domains to Cloud Run services:

```bash
# Public web landing page
gcloud run domain-mappings create \
  --service=tiltcheck-web \
  --domain=tiltcheck.me \
  --region=us-central1 \
  --project=tiltchcek

# API subdomain
gcloud run domain-mappings create \
  --service=tiltcheck-api \
  --domain=api.tiltcheck.me \
  --region=us-central1 \
  --project=tiltchcek
```

Follow the DNS record instructions printed by the command and add them to your DNS provider (Cloudflare, etc.).

---

## 9. Verify Deployment

After the GitHub Actions workflow runs, confirm each service is live:

```bash
gcloud run services list --region=us-central1 --project=tiltchcek
```

Check the API health endpoint:

```bash
curl https://api.tiltcheck.me/health
```

---

## Service Port Reference

| Service | Exposed Port | Public Access | Min Instances |
| :--- | :--- | :--- | :--- |
| api | 3001 | Yes | 1 |
| web | 3000 | Yes | 0 |
| discord-bot | 8080 | No | 1 |
| trust-rollup | 8082 | No | 0 |
| control-room | 3001 | No | 0 |
| game-arena | 8080 | Yes (session-affinity) | 1 |
| user-dashboard | 6001 | Yes | 0 |

---

Made for Degens. By Degens.
