# run-tests.ps1
#
# This script runs all tests across the entire monorepo.
#
# Usage:
#   .\scriptsun-tests.ps1
#

Write-Host "[INFO] Running all tests for the TiltCheck monorepo..."
Write-Host "----------------------------------------------------"

# Run the recursive test command
pnpm --recursive test

# Check the exit code of the last command
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "----------------------------------------------------"
    Write-Host "[FAILED] Tests FAILED. See output above for details." -ForegroundColor Red
    # Exit with a non-zero status code to indicate failure
    exit 1
} else {
    Write-Host ""
    Write-Host "----------------------------------------------------"
    Write-Host "[PASSED] All tests PASSED." -ForegroundColor Green
    exit 0
}
