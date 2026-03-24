# TiltCheck - Google Cloud Sequential Deployer (Final Stability Fix)
# Ensures Cloud Build doesn't hit resource collisions during monorepo upload

$PROJECT_ID = "tiltchcek"
$REGION = "us-central1"

Write-Host '--- IGNITING TILTCHECK PRODUCTION CLUSTER (Revision 0.0.49) ---' -ForegroundColor Cyan

# --- PHASE 1: API ---
# We wait for the API to finalize so the Web build can (potentially) see its health
Write-Host '[1/3] DEPLOYING: tiltcheck-api...' -ForegroundColor Yellow
gcloud run deploy tiltcheck-api `
  --source=. `
  --project=$PROJECT_ID `
  --region=$REGION `
  --set-build-env-vars=APP_NAME=api `
  --set-env-vars="NODE_ENV=production" `
  --allow-unauthenticated `
  --quiet

# --- PHASE 2: Web ---
Write-Host '[2/3] DEPLOYING: tiltcheck-web...' -ForegroundColor Yellow
$API_URL = "https://tiltcheck-api-164294266634.us-central1.run.app"
gcloud run deploy tiltcheck-web `
  --source=. `
  --project=$PROJECT_ID `
  --region=$REGION `
  --set-build-env-vars=APP_NAME=web,NEXT_PUBLIC_API_URL="$API_URL/blog" `
  --set-env-vars="NODE_ENV=production,API_URL=$API_URL" `
  --allow-unauthenticated `
  --quiet

# --- PHASE 3: Bot ---
Write-Host '[3/3] DEPLOYING: tiltcheck-bot...' -ForegroundColor Yellow
gcloud run deploy tiltcheck-bot `
  --source=. `
  --project=$PROJECT_ID `
  --region=$REGION `
  --set-build-env-vars=APP_NAME=discord-bot `
  --set-env-vars="NODE_ENV=production,API_URL=$API_URL" `
  --memory=1Gi `
  --no-cpu-throttling `
  --quiet

Write-Host '--- MISSION ACCOMPLISHED! Revision 0.0.49 is ACTIVE ---' -ForegroundColor Cyan
Write-Host 'TiltCheck News Feed & JME Admin Suite are now live on Google Cloud.'
