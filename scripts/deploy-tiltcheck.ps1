# TiltCheck - Google Cloud Master Deployer (Degen Mode)
# Uses gcloud run deploy --source to automatically detect our Universal Monorepo Dockerfile.

$PROJECT_ID = "tiltchcek"
$REGION = "us-central1"

Write-Host '--- RESUMING TILTCHECK MIGRATION (The Degen Push) ---' -ForegroundColor Cyan

# --- PHASE 1: API ---
Write-Host '[1/3] DEPLOYING: tiltcheck-api...' -ForegroundColor Yellow
gcloud run deploy tiltcheck-api `
  --source=. `
  --project=$PROJECT_ID `
  --region=$REGION `
  --set-build-env-vars=APP_NAME=api `
  --set-env-vars="NODE_ENV=production" `
  --allow-unauthenticated `
  --quiet `
  --async

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
  --quiet `
  --async

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
  --quiet `
  --async

Write-Host '--- MISSION ACCOMPLISHED! ---' -ForegroundColor Cyan
Write-Host 'All TiltCheck core services are now assigned their production revisions.'
