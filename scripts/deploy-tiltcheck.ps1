# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
# TiltCheck - Google Cloud Sequential Deployer
# Ensures Cloud Build does not hit resource collisions during monorepo upload.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$PROJECT_ID = "tiltchcek"
$REGION = "us-central1"

function Resolve-GCloudPath {
    $command = Get-Command gcloud -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "gcloud CLI not found. Install from https://cloud.google.com/sdk/docs/install"
    }

    return $command.Source
}

function Invoke-GCloud {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Operation,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & $script:GCloudPath @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "gcloud failed during ${Operation} (exit code $LASTEXITCODE)."
    }
}

$script:GCloudPath = Resolve-GCloudPath

Write-Host '--- Starting TiltCheck production deployment (Revision 0.0.49) ---' -ForegroundColor Cyan

# --- PHASE 1: API ---
# Wait for the API deployment to finish before building the web service.
Write-Host '[1/3] DEPLOYING: tiltcheck-api...' -ForegroundColor Yellow
Invoke-GCloud -Operation 'tiltcheck-api deploy' -Arguments @(
    'run', 'deploy', 'tiltcheck-api',
    '--source=.',
    "--project=$PROJECT_ID",
    "--region=$REGION",
    '--set-build-env-vars=APP_NAME=api',
    '--set-env-vars=NODE_ENV=production',
    '--allow-unauthenticated',
    '--quiet'
)

# --- PHASE 2: Web ---
Write-Host '[2/3] DEPLOYING: tiltcheck-web...' -ForegroundColor Yellow
$API_URL = "https://api.tiltcheck.me"
Invoke-GCloud -Operation 'tiltcheck-web deploy' -Arguments @(
    'run', 'deploy', 'tiltcheck-web',
    '--source=.',
    "--project=$PROJECT_ID",
    "--region=$REGION",
    "--set-build-env-vars=APP_NAME=web,NEXT_PUBLIC_API_URL=$API_URL",
    "--set-env-vars=NODE_ENV=production,API_URL=$API_URL",
    '--allow-unauthenticated',
    '--quiet'
)

# --- PHASE 3: Bot ---
Write-Host '[3/3] DEPLOYING: tiltcheck-bot...' -ForegroundColor Yellow
Invoke-GCloud -Operation 'tiltcheck-bot deploy' -Arguments @(
    'run', 'deploy', 'tiltcheck-bot',
    '--source=.',
    "--project=$PROJECT_ID",
    "--region=$REGION",
    '--set-build-env-vars=APP_NAME=discord-bot',
    "--set-env-vars=NODE_ENV=production,API_URL=$API_URL",
    '--memory=1Gi',
    '--no-cpu-throttling',
    '--quiet'
)

Write-Host '--- TiltCheck production deployment completed successfully. ---' -ForegroundColor Cyan
Write-Host 'TiltCheck services are live on Google Cloud.'
