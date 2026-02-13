#!/bin/bash
# Pre-build verification script to catch common errors

set -e

echo "Verifying build configuration..."

# Check for CSS import issues
echo "Checking CSS imports..."

# Verify globals.css exists in the correct location
if [ ! -f "app/globals.css" ]; then
    echo "ERROR: app/globals.css not found!"
    echo "The CSS file must be at: apps/loud-legacy-web/app/globals.css"
    exit 1
fi

# Check for duplicate globals.css files (exclude build cache and dependencies)
GLOBALS_COUNT=$(find . -name "globals.css" -type f -not -path "./.next/*" -not -path "./node_modules/*" | wc -l)
if [ "$GLOBALS_COUNT" -gt 1 ]; then
    echo "ERROR: Multiple globals.css files found!"
    find . -name "globals.css" -type f -not -path "./.next/*" -not -path "./node_modules/*"
    echo "Only app/globals.css should exist."
    exit 1
fi

# Verify layout.tsx imports correctly
if ! grep -q 'import "./globals.css"' app/layout.tsx; then
    echo "ERROR: layout.tsx does not import './globals.css' correctly!"
    echo "Expected: import \"./globals.css\";"
    exit 1
fi

# Verify SSR mode (not static export) for API route support
if grep -q "^[[:space:]]*output: 'export'" next.config.mjs; then
    echo "WARNING: Static export is enabled. API routes will NOT work!"
    echo "Remove output: 'export' from next.config.mjs for full SSR support."
else
    echo "SSR mode configured (API routes supported)"
fi

# Ensure Prisma client is generated with current schema
echo "Generating Prisma client..."
npx prisma generate 2>&1 || {
    echo "WARNING: prisma generate failed. Build may fail if schema changed."
    echo "Continuing anyway..."
}

echo "All verifications passed. Ready to build."
