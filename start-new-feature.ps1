# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-24

# This script automates the initial steps of the daily workflow for the TiltCheck monorepo:
# 1. Syncs the local 'main' branch with the remote.
# 2. Installs any new dependencies.
# 3. Prompts for a new feature branch name and creates/checks it out.

# Exit immediately if a command exits with a non-zero status.
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting new feature workflow..." -ForegroundColor Green

# Step 1: Get Latest Changes
Write-Host "1. Syncing 'main' branch with remote..." -ForegroundColor Cyan
git checkout main
git pull origin main
Write-Host "   'main' branch synced." -ForegroundColor Green

Write-Host "   Installing/updating dependencies..." -ForegroundColor Cyan
pnpm install
Write-Host "   Dependencies updated." -ForegroundColor Green

# Step 2: Create a New Branch
Write-Host ""
Write-Host "2. Creating a new feature branch." -ForegroundColor Cyan
$branch_name = Read-Host "   Enter the name for your new branch (e.g., feature/my-awesome-feature)"

if ([string]::IsNullOrWhiteSpace($branch_name)) {
  Write-Host "❌ Branch name cannot be empty. Aborting." -ForegroundColor Red
  exit 1
}

# Check if the branch already exists locally
$branch_exists_locally = git show-ref --verify --quiet "refs/heads/$branch_name"

if ($branch_exists_locally) {
  Write-Host "⚠️ Local branch '$branch_name' already exists. Checking it out instead of creating." -ForegroundColor Yellow
  git checkout "$branch_name"
} else {
  git checkout -b "$branch_name"
  Write-Host "✅ New branch '$branch_name' created and checked out." -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Workflow initialized. You are now on branch '$branch_name'." -ForegroundColor Green
Write-Host "   You can now start your development: 'pnpm dev'" -ForegroundColor Green
Write-Host "   Remember to update SESSION_LOG.md before committing." -ForegroundColor Green