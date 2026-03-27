#!/bin/bash

# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-24

# This script automates the initial steps of the daily workflow for the TiltCheck monorepo:
# 1. Syncs the local 'main' branch with the remote.
# 2. Installs any new dependencies.
# 3. Prompts for a new feature branch name and creates/checks it out.

set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting new feature workflow..."

# Step 1: Get Latest Changes
echo "1. Syncing 'main' branch with remote..."
git checkout main
git pull origin main
echo "   'main' branch synced."

echo "   Installing/updating dependencies..."
pnpm install
echo "   Dependencies updated."

# Step 2: Create a New Branch
echo ""
echo "2. Creating a new feature branch."
read -p "   Enter the name for your new branch (e.g., feature/my-awesome-feature): " branch_name

if [ -z "$branch_name" ]; then
  echo "❌ Branch name cannot be empty. Aborting."
  exit 1
fi

# Check if the branch already exists locally or remotely
if git show-ref --verify --quiet "refs/heads/$branch_name"; then
  echo "⚠️ Local branch '$branch_name' already exists. Checking it out instead of creating."
  git checkout "$branch_name"
else
  git checkout -b "$branch_name"
  echo "✅ New branch '$branch_name' created and checked out."
fi

echo ""
echo "🎉 Workflow initialized. You are now on branch '$branch_name'."
echo "   You can now start your development: 'pnpm dev'"
echo "   Remember to update SESSION_LOG.md before committing."