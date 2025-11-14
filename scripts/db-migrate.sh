#!/usr/bin/env bash
set -euo pipefail

# Apply SQL migrations using the project's migration runner.
# Loads .env.postgres if present to set DATABASE_URL.

if [ -f .env.postgres ]; then
  echo "Sourcing .env.postgres"
  # shellcheck disable=SC1091
  set -a; source .env.postgres; set +a
fi

echo "Running migrations using DATABASE_URL=${DATABASE_URL:-<unset>}"
node scripts/run-migrations.js
