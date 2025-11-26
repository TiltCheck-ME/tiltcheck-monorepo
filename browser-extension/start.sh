#!/bin/bash
# TiltGuard Extension - Quick Start Script
# Starts backend API server and rebuilds extension

echo "🎰 TiltGuard Extension - Starting..."
echo ""

# Navigate to extension directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  pnpm install
fi

# Build extension
echo "🔨 Building extension..."
pnpm build

# Start API server
echo "🚀 Starting API server..."
echo ""
pnpm server
