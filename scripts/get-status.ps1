<#
.SYNOPSIS
    Gathers and displays the current status of the TiltCheck repository.
.DESCRIPTION
    Collects information about the Git branch, file status, key software versions, and pnpm workspace packages, then outputs it as a single, machine-readable JSON object.
.EXAMPLE
    .\scripts\get-status.ps1
#>

# Ensure commands don't dump verbose errors to the console
$ErrorActionPreference = "SilentlyContinue"

# 1. Get Git Information
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
# Get machine-readable status, convert each line to a JSON-compatible string
$statusLines = git status --porcelain | ForEach-Object { '"' + ($_.Replace('', '').Replace('"', '"')) + '"' }
$gitStatusJson = "[" + ($statusLines -join ',') + "]"

# 2. Get Version Information
$nodeVersion = (node --version).Trim()
$pnpmVersion = (pnpm --version).Trim()
$tscVersion = (tsc --version).Trim()

# 3. Get Workspace Package Information as a JSON string
$pnpmListJson = pnpm m ls --json --depth=-1

# 4. Manually construct the final JSON string for robust and predictable output
$jsonOutput = @"
{
  "git": {
    "branch": "$branch",
    "status": $gitStatusJson
  },
  "versions": {
    "node": "$nodeVersion",
    "pnpm": "$pnpmVersion",
    "typescript": "$tscVersion"
  },
  "workspace": $pnpmListJson
}
"@

# 5. Print the final JSON object to standard output
Write-Output $jsonOutput
