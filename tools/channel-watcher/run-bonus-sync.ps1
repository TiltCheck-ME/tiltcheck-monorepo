# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-14
param(
    [string]$ChannelUrl = "",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

try {
    $args = @("sync-bonus-drops.js")
    if ($ChannelUrl) {
        $args += $ChannelUrl
    }
    if ($DryRun) {
        $args += "--dry-run"
    }

    node @args
    if ($LASTEXITCODE -ne 0) {
        throw "Bonus sync failed."
    }
}
finally {
    Pop-Location
}
