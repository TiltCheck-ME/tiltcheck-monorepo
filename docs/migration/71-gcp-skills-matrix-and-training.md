# GCP Skills Matrix and Training Plan (Solo Operator)

Last updated: 2026-03-07
Baseline self-assessment: **Beginner**

## Skills Matrix

Scale:

- 1 = no hands-on experience
- 3 = can execute with docs
- 5 = can troubleshoot and teach others

| Skill Area | Current | Target (Wave 1) | Gap |
| --- | --- | --- | --- |
| IAM (roles, service accounts, least privilege) | 1 | 3 | High |
| Workload Identity Federation (OIDC) | 1 | 3 | High |
| Cloud Run deploy and revisions | 1 | 3 | High |
| Secret Manager integration | 1 | 3 | High |
| Artifact Registry and image flow | 1 | 3 | High |
| Cloud Build pipeline basics | 1 | 3 | High |
| Budget alerts and billing controls | 1 | 3 | High |
| DNS/LB cutover basics | 1 | 2 | Medium |
| Rollback procedures | 1 | 3 | High |

## Minimum Training Plan (First 7 Days)

### Day 1: Foundations (1.5-2 hours)

- Understand project/service accounts and IAM role boundaries
- Validate deployer/runtime service account setup
- Confirm Workload Identity pool/provider structure

Done when:

- you can explain why `run.admin`, `artifactregistry.writer`, and `iam.serviceAccountUser` are needed

### Day 2: Deploy Pipeline (2 hours)

- Build and push one image to Artifact Registry
- Deploy one Cloud Run service (`api`) using existing scripts
- Verify service URL and basic health

Done when:

- you can redeploy `api` without prompts

### Day 3: Secrets and Config (1-1.5 hours)

- Create/update one secret in Secret Manager
- Bind secret to Cloud Run service
- Confirm no secret values are committed in repo

Done when:

- service starts and reads secret correctly

### Day 4: Cost Controls (1 hour)

- Create budget alerts at 40/60/80/90/100%
- Confirm billing account linkage and notification path

Done when:

- alert policy exists and is testable

### Day 5: Rollback Drill (1-1.5 hours)

- Trigger a new revision for `api`
- Roll back to previous healthy revision
- Record steps in milestone log

Done when:

- rollback executed in <15 minutes

### Day 6-7: Web Service + Stabilization (2-3 hours total)

- Deploy `web` in Wave 1
- Validate routing and basic domain readiness
- Capture first cost and reliability observations

Done when:

- `api + web` both deploy cleanly with documented runbook steps

## Weekly Skills Re-check

At each milestone, update current scores and close gaps before expanding scope to additional services.

## Immediate Next Action

Start with:

1. `infra/gcp/bootstrap-gcp.ps1`
2. `scripts/gcp/create-budget-alerts.ps1`
3. `scripts/gcp/deploy-cloud-run-service.ps1 -ServiceName api`
