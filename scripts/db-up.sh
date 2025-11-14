#!/usr/bin/env bash
set -euo pipefail

# Start a Postgres docker container for local development if it's not running.
# Idempotent: will start existing container, create if missing, and wait for ready.

NAME=${1:-x402-postgres}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-Gi7BJfYpTy7Gf2ZBXNNwUUwc9CCKxVm2}
POSTGRES_DB=${POSTGRES_DB:-x402}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
IMAGE=${POSTGRES_IMAGE:-postgres:15}

echo "Ensuring Postgres container '$NAME' is running..."

if [ "$(docker ps -q -f name=^/${NAME}$)" = "" ]; then
  if [ "$(docker ps -aq -f name=^/${NAME}$)" = "" ]; then
    echo "Creating and starting container $NAME from image $IMAGE"
    docker run --name "$NAME" -e POSTGRES_USER="$POSTGRES_USER" -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" -e POSTGRES_DB="$POSTGRES_DB" -p "$POSTGRES_PORT:5432" -d "$IMAGE"
  else
    echo "Starting existing container $NAME"
    docker start "$NAME"
  fi
else
  echo "Container $NAME already running"
fi

echo "Waiting for Postgres to accept connections..."
for i in {1..30}; do
  if docker exec "$NAME" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    echo "Postgres is ready"
    exit 0
  fi
  sleep 1
done

echo "Postgres did not become ready in time" >&2
exit 2
