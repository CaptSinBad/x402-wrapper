#!/usr/bin/env bash
# Simple repo secret scanner for common patterns.
# Prints lines that match likely secret patterns so you can review them.

set -euo pipefail

PATTERNS=(
  "SUPABASE_SERVICE_KEY"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "PRIVATE_KEY"
  "PRIVY_APP_SECRET"
  "-----BEGIN PRIVATE KEY-----"
  "-----BEGIN RSA PRIVATE KEY-----"
  "API_KEY"
  "SECRET"
  "PASSWORD="
)

echo "Scanning repo for potential secrets..."
for p in "${PATTERNS[@]}"; do
  echo "\n--- Pattern: $p ---"
  # show file:line:match (ignore node_modules and .git)
  git grep -n --line-number -I --exclude-dir=node_modules --exclude-dir=.git -- "$p" || true
done

echo "\nScan complete. Review matches above and rotate any exposed credentials immediately." 
