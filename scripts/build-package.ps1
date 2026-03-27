<#
.SYNOPSIS
    Builds a specific workspace package and its dependencies.
.DESCRIPTION
    Uses pnpm's filtering to run the 'build' command on a single target package and any of its workspace dependencies.
.PARAMETER PackageName
    The name of the package to build (e.g., '@tiltcheck/api').
.EXAMPLE
    .\scripts\build-package.ps1 -PackageName '@tiltcheck/api'
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$PackageName
)

Write-Host "Building package: $PackageName and its dependencies..." -ForegroundColor Green

# The '...' after the package name tells pnpm to include all dependencies of the target package.
# This ensures that anything the target package depends on is built first.
pnpm --filter "${PackageName}..." build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully built $PackageName." -ForegroundColor Green
} else {
    Write-Host "Build failed for $PackageName." -ForegroundColor Red
}
