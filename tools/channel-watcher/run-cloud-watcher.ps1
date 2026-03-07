param(
    [string]$VmName = "",
    [string]$Zone = "",
    [string]$ProjectId = "",
    [string]$VmIp = "",
    [int]$DurationMinutes = 10,
    [int]$WarmupTimeoutMinutes = 4,
    [string]$Model = "",
    [switch]$SkipComic,
    [switch]$KeepVmRunning
)

$ErrorActionPreference = "Stop"

function Import-DotEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        return
    }

    $lines = Get-Content -Path $Path
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }

        $idx = $trimmed.IndexOf("=")
        if ($idx -lt 1) {
            continue
        }

        $name = $trimmed.Substring(0, $idx).Trim()
        $value = $trimmed.Substring($idx + 1).Trim()
        if (-not [Environment]::GetEnvironmentVariable($name)) {
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

function Resolve-Setting {
    param(
        [string]$ExplicitValue,
        [string]$EnvName,
        [switch]$Required
    )

    if ($ExplicitValue) {
        return $ExplicitValue
    }

    $fromEnv = [Environment]::GetEnvironmentVariable($EnvName)
    if ($fromEnv) {
        return $fromEnv
    }

    if ($Required) {
        throw "Missing required setting '$EnvName'. Pass it as a parameter or set it in your environment/.env."
    }

    return ""
}

function Invoke-GCloud {
    param([string[]]$CommandArgs)
    & gcloud @CommandArgs
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud command failed: gcloud $($CommandArgs -join ' ')"
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Import-DotEnv -Path (Join-Path $scriptDir ".env")

$resolvedVmName = Resolve-Setting -ExplicitValue $VmName -EnvName "GCP_VM_NAME" -Required
$resolvedZone = Resolve-Setting -ExplicitValue $Zone -EnvName "GCP_VM_ZONE" -Required
$resolvedProjectId = Resolve-Setting -ExplicitValue $ProjectId -EnvName "GCP_PROJECT_ID"
$resolvedVmIp = Resolve-Setting -ExplicitValue $VmIp -EnvName "GCP_VM_IP"
$resolvedModel = Resolve-Setting -ExplicitValue $Model -EnvName "AI_MODEL"

$projectArgs = @()
if ($resolvedProjectId) {
    $projectArgs = @("--project", $resolvedProjectId)
}

$startedVm = $false

try {
    Write-Host "Starting VM '$resolvedVmName' in zone '$resolvedZone'..."
    Invoke-GCloud -CommandArgs @("compute", "instances", "start", $resolvedVmName, "--zone", $resolvedZone) + $projectArgs
    $startedVm = $true

    if (-not $resolvedVmIp) {
        Write-Host "Resolving VM external IP..."
        $resolvedVmIp = (
            & gcloud compute instances describe $resolvedVmName --zone $resolvedZone @projectArgs --format "get(networkInterfaces[0].accessConfigs[0].natIP)"
        ).Trim()
    }

    if (-not $resolvedVmIp) {
        throw "Could not resolve VM IP. Set GCP_VM_IP or pass -VmIp."
    }

    $ollamaBase = "http://$resolvedVmIp`:11434"
    $env:OLLAMA_URL = "$ollamaBase/v1"
    if ($resolvedModel) {
        $env:AI_MODEL = $resolvedModel
    }

    Write-Host "Waiting for Ollama readiness at $ollamaBase ..."
    $deadline = (Get-Date).AddMinutes($WarmupTimeoutMinutes)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $null = Invoke-RestMethod -Uri "$ollamaBase/api/tags" -Method Get -TimeoutSec 7
            $ready = $true
            break
        } catch {
            Start-Sleep -Seconds 5
        }
    }

    if (-not $ready) {
        throw "Ollama did not become ready within $WarmupTimeoutMinutes minute(s)."
    }

    Write-Host "Ollama is ready. Running channel watcher for $DurationMinutes minute(s)..."
    Push-Location $scriptDir
    try {
        & npm run live -- "--duration=$DurationMinutes"
        if ($LASTEXITCODE -ne 0) {
            throw "channel-watcher run failed."
        }

        if (-not $SkipComic) {
            Write-Host "Generating Daily Degen Comic payload from latest logs..."
            & npm run comic:daily
            if ($LASTEXITCODE -ne 0) {
                Write-Host "⚠️ comic:daily failed (continuing). You can rerun manually: npm run comic:daily"
            } else {
                Write-Host "✅ Daily Degen Comic payload updated."
            }
        } else {
            Write-Host "Skipping comic generation because -SkipComic was set."
        }
    } finally {
        Pop-Location
    }
}
finally {
    if ($startedVm -and -not $KeepVmRunning) {
        Write-Host "Stopping VM '$resolvedVmName'..."
        try {
            Invoke-GCloud -CommandArgs @("compute", "instances", "stop", $resolvedVmName, "--zone", $resolvedZone) + $projectArgs
        } catch {
            Write-Host "Failed to stop VM automatically: $($_.Exception.Message)"
            Write-Host "Stop it manually with:"
            Write-Host "gcloud compute instances stop $resolvedVmName --zone $resolvedZone $($projectArgs -join ' ')"
            exit 1
        }
    } elseif ($KeepVmRunning) {
        Write-Host "Leaving VM running because -KeepVmRunning was set."
    }
}

Write-Host "Done."
