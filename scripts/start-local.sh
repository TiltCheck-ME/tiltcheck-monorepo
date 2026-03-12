#!/bin/bash
# ================================================================
# © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# 
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================

# Quick start script for local development

echo "🚀 TiltCheck Local Startup"
echo "=========================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Copy .env.example to .env and fill in your Discord credentials"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Check required env vars
if [ -z "$DISCORD_TOKEN" ] || [ -z "$DISCORD_CLIENT_ID" ]; then
    echo "❌ Error: DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env"
    exit 1
fi

echo "✅ Environment variables loaded"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Build all packages
echo "🔨 Building packages..."
pnpm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build complete"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop any running instances
echo "🛑 Stopping existing services..."
pm2 delete all 2>/dev/null || true

# Start services
echo "🚀 Starting services with PM2..."
pm2 start ecosystem.config.js

# Show status
echo ""
echo "✅ All services started!"
echo ""
pm2 status

echo ""
echo "📊 Useful commands:"
echo "   pm2 logs           - View all logs"
echo "   pm2 logs user-dashboard - View dashboard logs"
echo "   pm2 logs discord-bot - View bot logs"
echo "   pm2 stop all       - Stop all services"
echo "   pm2 restart all    - Restart all services"
echo ""
echo "🌐 Dashboard: http://localhost:6001"
