#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.server"

required=(PG_HOST PG_USER PG_PASSWORD PG_DATABASE FACILITATOR_URL)

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — please create it from .env.example and fill server-only secrets." >&2
  exit 2
fi

echo "Checking required server envs in $ENV_FILE..."
missing=()
for k in "${required[@]}"; do
  if ! grep -qE "^${k}=" "$ENV_FILE"; then
    missing+=($k)
  fi
done

if [ ${#missing[@]} -ne 0 ]; then
  echo "Missing required server env keys: ${missing[*]}" >&2
  echo "Please add them to $ENV_FILE" >&2
  exit 3
fi

echo "All required server envs present."
exit 0
