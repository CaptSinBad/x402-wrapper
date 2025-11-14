#!/usr/bin/env bash
set -euo pipefail

NAME=${1:-x402-postgres}

echo "Stopping and removing container $NAME if it exists..."
if [ "$(docker ps -q -f name=^/${NAME}$)" != "" ]; then
  docker stop "$NAME"
fi
if [ "$(docker ps -aq -f name=^/${NAME}$)" != "" ]; then
  docker rm "$NAME"
fi

echo "Container $NAME removed (if it existed)."
