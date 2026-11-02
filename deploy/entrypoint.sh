#!/bin/sh
set -eu
node /app/scripts/validate-vps-env.mjs
exec node /app/server.js
