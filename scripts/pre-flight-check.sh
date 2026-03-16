#!/bin/bash
#
# Pre-flight check script to ensure the repository is in a healthy state for beta deployment.
#

echo "🚀 Starting TiltCheck Pre-Flight Checks..."

echo "1. Running Linter..."
pnpm lint || { echo "❌ Linting failed"; exit 1; }
echo "✅ Linter passed."

echo "2. Running TypeScript Compiler Check..."
pnpm exec tsc --noEmit || { echo "❌ TypeScript check failed"; exit 1; }
echo "✅ TypeScript check passed."

echo "3. Running All Tests..."
pnpm test:all || { echo "❌ Tests failed"; exit 1; }
echo "✅ All tests passed."

echo "🎉 Pre-Flight Checks Successful! The repository is ready for beta deployment."
exit 0