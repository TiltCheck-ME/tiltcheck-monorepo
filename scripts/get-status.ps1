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

# Resolve tool paths — safe for Task Scheduler / non-interactive contexts
function Get-ToolPath([string]$Name) {
    return (Get-Command $Name -ErrorAction SilentlyContinue)?.Source
}
$gitPath  = Get-ToolPath "git"
$nodePath = Get-ToolPath "node"
$pnpmPath = Get-ToolPath "pnpm"
$tscPath  = Get-ToolPath "tsc"

# 1. Get Git Information
$branch = if ($gitPath) { (& $gitPath rev-parse --abbrev-ref HEAD).Trim() } else { "unknown" }
$statusLines = if ($gitPath) { & $gitPath status --porcelain | ForEach-Object { '"' + ($_.Replace('', '').Replace('"', '"')) + '"' } } else { @() }
$gitStatusJson = "[" + ($statusLines -join ',') + "]"

# 2. Get Version Information
$nodeVersion = if ($nodePath) { (& $nodePath --version).Trim() } else { "not found" }
$pnpmVersion = if ($pnpmPath) { (& $pnpmPath --version).Trim() } else { "not found" }
$tscVersion  = if ($tscPath)  { (& $tscPath --version).Trim()  } else { "not found" }

# 3. Get Workspace Package Information as a JSON string
$pnpmListJson = if ($pnpmPath) { & $pnpmPath m ls --json --depth=-1 } else { "[]" }

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
