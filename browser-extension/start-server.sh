#!/bin/bash

# TiltGuard Quick Start Script
# Run this to start the WebSocket server for testing

echo "🚀 Starting TiltGuard Testing Environment"
echo ""
echo "📡 Starting WebSocket server on port 7071..."
echo ""

cd "$(dirname "$0")/../packages/gameplay-analyzer"
pnpm start:server
