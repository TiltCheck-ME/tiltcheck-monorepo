# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
# TiltCheck - Google Cloud Secret Sync (Windows/PowerShell)
# This script migrates your local .env keys to Google Secret Manager.

Set-StrictMode -Version Latest
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

function Invoke-GCloud {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Operation,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & $gcloudPath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud failed during ${Operation} (exit code $LASTEXITCODE)."
    }
}

function Add-SecretVersionFromValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SecretName,

        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $gcloudPath
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $startInfo.ArgumentList.Add("secrets")
    $startInfo.ArgumentList.Add("versions")
    $startInfo.ArgumentList.Add("add")
    $startInfo.ArgumentList.Add($SecretName)
    $startInfo.ArgumentList.Add("--data-file=-")
    $startInfo.ArgumentList.Add("--project=$PROJECT_ID")
    $startInfo.ArgumentList.Add("--quiet")

    $process = [System.Diagnostics.Process]::Start($startInfo)
    $exitCode = -1

    try {
        $process.StandardInput.Write($Value)
        $process.StandardInput.Close()
        $process.WaitForExit()
    }
    finally {
        if (-not $process.HasExited) {
            $process.Kill()
            $process.WaitForExit()
        }

        $exitCode = $process.ExitCode

        $process.Dispose()
    }

    if ($exitCode -ne 0) {
        throw "gcloud failed while adding a version for secret '$SecretName' (exit code $exitCode)."
    }
}

function Test-SecretExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SecretName
    )

    $secretNames = & $gcloudPath secrets list --project=$PROJECT_ID --format="value(name)" --filter="name=$SecretName"
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud failed while checking whether secret '$SecretName' exists (exit code $LASTEXITCODE)."
    }

    return $secretNames -contains $SecretName
}

Write-Host "Starting secret sync for project: $PROJECT_ID" -ForegroundColor Cyan

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

        if (-not (Test-SecretExists -SecretName $secretName)) {
            Invoke-GCloud -Operation "create secret $secretName" -Arguments @(
                'secrets', 'create', $secretName,
                "--project=$PROJECT_ID",
                '--quiet'
            )
        }

        Add-SecretVersionFromValue -SecretName $secretName -Value $value

        Write-Host " [DONE]" -ForegroundColor Green
    }
}

Write-Host "`nAll secrets synchronized. Grant 'Secret Manager Secret Accessor' to the target services in Google Cloud." -ForegroundColor Cyan
