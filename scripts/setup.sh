#!/bin/bash

# TiltCheck Monorepo Setup Script

echo "================================================"
echo "TiltCheck Monorepo Setup"
echo "================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check for pnpm, install if missing
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm not found. Installing via npm..."
    npm install -g pnpm || {
        echo "❌ Failed to install pnpm globally. Trying with npx..."
        echo "You can use 'npx pnpm' instead of 'pnpm' for all commands."
    }
else
    echo "✅ pnpm version: $(pnpm --version)"
fi

echo ""
echo "Installing dependencies..."
echo ""

# Use pnpm if available, otherwise use npx
if command -v pnpm &> /dev/null; then
    pnpm install
else
    npx pnpm install
fi

echo ""
echo "================================================"
echo "Setup Complete! 🎉"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Build core packages:  pnpm build"
echo "  2. Start development:    pnpm dev"
echo "  3. Read SETUP.md for more info"
echo ""
echo "If pnpm isn't available globally, use: npx pnpm <command>"
echo ""
