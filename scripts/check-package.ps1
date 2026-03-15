<#
.SYNOPSIS
    Runs static analysis (linting and type-checking) on a specific package.
.DESCRIPTION
    Uses pnpm to execute ESLint and the TypeScript Compiler (`tsc --noEmit`) within the context of a single target package. This is useful for quickly validating code changes.
.PARAMETER PackageName
    The name of the package to check (e.g., '@tiltcheck/api').
.EXAMPLE
    .\scripts\check-package.ps1 -PackageName '@tiltcheck/api'
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$PackageName
)

Write-Host "Checking package: $PackageName..." -ForegroundColor Green

# 1. Run ESLint
# We use 'pnpm exec' to run the command within the specified package's directory.
# The '.' argument tells ESLint to check all files in the current directory.
Write-Host "Linting $PackageName..."
pnpm --filter "$PackageName" exec eslint . --ext .ts,.tsx

if ($LASTEXITCODE -ne 0) {
    Write-Host "Linting failed for $PackageName." -ForegroundColor Red
    exit 1
}

# 2. Run TypeScript Type-Check
# We use 'tsc --noEmit' to perform a full type-check without the overhead of generating output files.
Write-Host "Type-checking $PackageName..."
pnpm --filter "$PackageName" exec tsc --noEmit

if ($LASTEXITCODE -eq 0) {
    Write-Host "Check passed for $PackageName." -ForegroundColor Green
} else {
    Write-Host "Type-checking failed for $PackageName." -ForegroundColor Red
}
