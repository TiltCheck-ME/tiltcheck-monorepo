# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09
#
# Wrapper called by Task Scheduler to run the email crawler.
# Handles: full path resolution, .env loading, output logging.
# Log file: scripts\logs\email-crawler-YYYY-MM-DD.log

param(
    [int]$Limit = 500,
    [switch]$DryRun,
    [switch]$All
)

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $repoRoot

# Log to dated file so you can review any run later
$logDir = Join-Path $repoRoot "scripts\logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("email-crawler-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

function Write-Log {
    param([string]$Msg)
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $Msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Write-Log "=== Email Crawler Start ==="
Write-Log "Repo root: $repoRoot"

# Load .env from repo root
$envFile = Join-Path $repoRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '^[A-Z_]+=.+' -and $_ -notmatch '^#' } | ForEach-Object {
        $parts = $_ -split '=', 2
        $key = $parts[0].Trim()
        $val = $parts[1].Trim().Trim('"')
        [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
    Write-Log ".env loaded"
} else {
    Write-Log "WARNING: .env not found at $envFile"
}

# Verify required vars
$requiredVars = @("CRAWLER_EMAIL", "CRAWLER_APP_PASSWORD", "CRAWLER_API_URL")
$missing = $requiredVars | Where-Object { -not [System.Environment]::GetEnvironmentVariable($_) }
if ($missing.Count -gt 0) {
    Write-Log "ERROR: Missing env vars: $($missing -join ', '). Check your .env file."
    exit 1
}
Write-Log "Crawler account: $([System.Environment]::GetEnvironmentVariable('CRAWLER_EMAIL'))"

# Resolve tsx — local install wins, fall back to global
$tsxLocal = Join-Path $repoRoot "node_modules\.bin\tsx.cmd"
$tsxPath = if (Test-Path $tsxLocal) { $tsxLocal } else {
    $global = (Get-Command tsx -ErrorAction SilentlyContinue)?.Source
    if (-not $global) {
        Write-Log "ERROR: tsx not found. Run 'pnpm install' in $repoRoot first."
        exit 1
    }
    $global
}
Write-Log "tsx: $tsxPath"

# Build args
$crawlerScript = Join-Path $repoRoot "scripts\email-crawler.ts"
$args = @($crawlerScript, "--limit", $Limit)
if ($DryRun) { $args += "--dry-run" }
if ($All)    { $args += "--all" }
Write-Log "Running: tsx $($args -join ' ')"

# Run and capture output into the log
& $tsxPath @args 2>&1 | ForEach-Object {
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $_"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

$exitCode = $LASTEXITCODE
Write-Log "=== Email Crawler End (exit: $exitCode) ==="
Write-Log "Full log: $logFile"
exit $exitCode
