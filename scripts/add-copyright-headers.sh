#!/bin/bash
# ================================================================
# TiltCheck Copyright Header Automation Script
# ================================================================
# This script adds copyright headers to all code files in the repo.
# 
# Usage: ./scripts/add-copyright-headers.sh
#
# Copyright © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# ================================================================

set -e

# Define the copyright header for different file types
JS_TS_HEADER="/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
"

HTML_HEADER="<!--
  © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
  Created by jmenichole (https://github.com/jmenichole)
  
  This file is part of the TiltCheck project.
  For licensing information, see LICENSE file in the project root.
-->
"

CSS_HEADER="/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
"

BASH_HEADER="#!/bin/bash
# ================================================================
# © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
# Created by jmenichole (https://github.com/jmenichole)
# 
# This file is part of the TiltCheck project.
# For licensing information, see LICENSE file in the project root.
# ================================================================
"

PYTHON_HEADER='"""
© 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
Created by jmenichole (https://github.com/jmenichole)

This file is part of the TiltCheck project.
For licensing information, see LICENSE file in the project root.
"""
'

# Function to check if a file already has a copyright header
has_copyright() {
    local file="$1"
    grep -q "TiltCheck Ecosystem" "$file" 2>/dev/null || grep -q "© 2024" "$file" 2>/dev/null
}

# Function to add header to JS/TS files
add_js_header() {
    local file="$1"
    if ! has_copyright "$file"; then
        echo "Adding copyright to: $file"
        temp_file=$(mktemp)
        echo "$JS_TS_HEADER" > "$temp_file"
        cat "$file" >> "$temp_file"
        mv "$temp_file" "$file"
    else
        echo "Skipping (already has copyright): $file"
    fi
}

# Function to add header to CSS files
add_css_header() {
    local file="$1"
    if ! has_copyright "$file"; then
        echo "Adding copyright to: $file"
        temp_file=$(mktemp)
        echo "$CSS_HEADER" > "$temp_file"
        cat "$file" >> "$temp_file"
        mv "$temp_file" "$file"
    else
        echo "Skipping (already has copyright): $file"
    fi
}

# Function to add header to HTML files
add_html_header() {
    local file="$1"
    if ! has_copyright "$file"; then
        echo "Adding copyright to: $file"
        temp_file=$(mktemp)
        # For HTML, insert after <!DOCTYPE html> if present, otherwise at the beginning
        if head -1 "$file" | grep -qi "<!doctype"; then
            head -1 "$file" > "$temp_file"
            echo "$HTML_HEADER" >> "$temp_file"
            tail -n +2 "$file" >> "$temp_file"
        else
            echo "$HTML_HEADER" > "$temp_file"
            cat "$file" >> "$temp_file"
        fi
        mv "$temp_file" "$file"
    else
        echo "Skipping (already has copyright): $file"
    fi
}

# Function to add header to Python files
add_python_header() {
    local file="$1"
    if ! has_copyright "$file"; then
        echo "Adding copyright to: $file"
        temp_file=$(mktemp)
        # Check if file starts with shebang
        if head -1 "$file" | grep -q "^#!"; then
            head -1 "$file" > "$temp_file"
            echo "$PYTHON_HEADER" >> "$temp_file"
            tail -n +2 "$file" >> "$temp_file"
        else
            echo "$PYTHON_HEADER" > "$temp_file"
            cat "$file" >> "$temp_file"
        fi
        mv "$temp_file" "$file"
    else
        echo "Skipping (already has copyright): $file"
    fi
}

# Main script execution
echo "============================================"
echo "TiltCheck Copyright Header Automation"
echo "============================================"
echo ""

# Find and process files
# Exclude node_modules, dist, build, .git directories

echo "Processing JavaScript/TypeScript files..."
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -not -path "*/.next/*" \
    | while read -r file; do
    add_js_header "$file"
done

echo ""
echo "Processing CSS files..."
find . -type f -name "*.css" \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    | while read -r file; do
    add_css_header "$file"
done

echo ""
echo "Processing Python files..."
find . -type f -name "*.py" \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -not -path "*/__pycache__/*" \
    | while read -r file; do
    add_python_header "$file"
done

echo ""
echo "============================================"
echo "Copyright headers added successfully!"
echo ""
echo "Note: HTML files were not processed automatically"
echo "to avoid breaking existing page structures."
echo "You can manually add the following header to HTML files:"
echo ""
echo "$HTML_HEADER"
echo "============================================"
