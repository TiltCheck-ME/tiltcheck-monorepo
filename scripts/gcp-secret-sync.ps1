# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
# TiltCheck - Google Cloud Secret Sync (Windows/PowerShell)
# This script migrates your local .env keys to Google Secret Manager.

$ErrorActionPreference = "Stop"

$PROJECT_ID = "tiltchcek"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir
$ENV_FILE  = Join-Path $repoRoot ".env"

if (-not (Test-Path $ENV_FILE)) {
    Write-Error "Could not find .env file at $ENV_FILE"
    exit 1
}

# Resolve gcloud — check PATH then common install locations
$gcloudPath = (Get-Command gcloud -ErrorAction SilentlyContinue)?.Source
if (-not $gcloudPath) {
    $candidates = @(
        "C:\Program Files\Google\Cloud SDK\bin\gcloud.cmd",
        "$env:LOCALAPPDATA\Google\Cloud SDK\bin\gcloud.cmd",
        "$env:APPDATA\gcloud\bin\gcloud.cmd"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $gcloudPath = $c; break }
    }
}
if (-not $gcloudPath) {
    Write-Error "gcloud CLI not found. Install from https://cloud.google.com/sdk/docs/install"
    exit 1
}
Write-Host "Using gcloud: $gcloudPath" -ForegroundColor DarkGray

Write-Host "🚀 Starting Secret Sync for Project: $PROJECT_ID" -ForegroundColor Cyan

# Parse .env file
$envContent = Get-Content $ENV_FILE
foreach ($line in $envContent) {
    # Skip comments and empty lines
    if ($line -match "^\s*#" -or $line -match "^\s*$") { continue }

    # Split into Key and Value (only at the first =)
    if ($line -match "^([^=]+)=(.*)$") {
        $key = $Matches[1].Trim()
        $value = $Matches[2].Trim()

        # GCP Secrets must be alphanumeric + hyphens/underscores
        $secretName = $key 

        Write-Host "Updating Secret: $secretName..." -NoNewline

        # 1. Create the secret if it doesn't exist (Suppressing errors if it already exists)
        & $gcloudPath secrets create $secretName --project=$PROJECT_ID --quiet 2>$null

        # 2. Add the value as a new version
        # Using [System.Text.Encoding]::UTF8 to ensure special characters map correctly
        $valueBytes = [System.Text.Encoding]::UTF8.GetBytes($value)
        $tempFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllBytes($tempFile, $valueBytes)
        
        & $gcloudPath secrets versions add $secretName --data-file=$tempFile --project=$PROJECT_ID --quiet 2>$null
        
        Remove-Item $tempFile -ErrorAction SilentlyContinue

        Write-Host " [DONE]" -ForegroundColor Green
    }
}

Write-Host "`n✅ All secrets synchronized. Use the Google Cloud Console to grant 'Secret Manager Secret Accessor' to your services." -ForegroundColor Cyan
