#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -f .env.vps ]; then
 echo "Create .env.vps from deploy/env.vps.example and fill in your production settings." >&2
 exit 1
fi
docker compose --env-file .env.vps config --quiet
docker compose --env-file .env.vps up -d --build --wait --wait-timeout 180
