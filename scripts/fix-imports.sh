#!/bin/bash
# ================================================================
# © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# 
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================


# Fix missing .js extensions in relative imports for ESM compatibility
# This script adds .js extensions to all relative imports in TypeScript files

echo "🔧 Fixing relative imports to include .js extensions..."

# Find all TypeScript files and fix imports
find apps packages modules services -name "*.ts" -type f ! -name "*.d.ts" | while read -r file; do
  # Skip node_modules and dist directories
  if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *"/dist/"* ]]; then
    continue
  fi
  
  # Fix imports like: from './file' or from '../dir/file'
  # Convert to: from './file.js' or from '../dir/file.js'
  sed -i '' -E "s/(from ['\"])(\\.\\.\?\/[^'\"]+)(['\"])/\1\2.js\3/g" "$file" 2>/dev/null || true
  
  # Also fix dynamic imports
  sed -i '' -E "s/(import\\(['\"])(\\.\\.\?\/[^'\"]+)(['\"]\\))/\1\2.js\3/g" "$file" 2>/dev/null || true
done

echo "✅ Import fixing complete!"
