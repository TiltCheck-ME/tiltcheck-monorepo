#!/bin/bash
# ================================================================
# © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# 
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================


# Supabase Migration Helper
# Run this to execute the tilt_events table migration in Supabase

echo "🔄 TiltCheck Tilt Events Migration"
echo "===================================="
echo ""

# Check if Supabase credentials are set
if [ -z "$SUPABASE_URL" ]; then
  echo "❌ Error: SUPABASE_URL is not set"
  echo ""
  echo "To run this migration, you need to:"
  echo "1. Set SUPABASE_URL environment variable"
  echo "2. Set SUPABASE_ANON_KEY environment variable"
  echo ""
  echo "Example:"
  echo "  export SUPABASE_URL=https://your-project.supabase.co"
  echo "  export SUPABASE_ANON_KEY=your-anon-key"
  echo "  bash ./scripts/migrate-tilt-events.sh"
  echo ""
  exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ Error: SUPABASE_ANON_KEY is not set"
  exit 1
fi

echo "✅ Supabase credentials found"
echo "📊 Project: $SUPABASE_URL"
echo ""

# Read the migration file
MIGRATION_FILE="./docs/migrations/001-tilt-events.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found at $MIGRATION_FILE"
  exit 1
fi

echo "📝 Migration file: $MIGRATION_FILE"
echo ""
echo "⚠️  INSTRUCTIONS:"
echo "=================================================="
echo ""
echo "Since Supabase SQL API requires authentication,"
echo "please execute the migration manually:"
echo ""
echo "1. Go to: https://supabase.com"
echo "2. Sign in to your TiltCheck project"
echo "3. Click 'SQL Editor' in the sidebar"
echo "4. Click 'New Query'"
echo "5. Copy and paste the SQL from:"
echo "   $MIGRATION_FILE"
echo "6. Click 'Run' button"
echo ""
echo "✅ The table will be created immediately"
echo ""
echo "📋 SQL to execute:"
echo "=================================================="
echo ""
cat "$MIGRATION_FILE"
echo ""
echo "=================================================="
