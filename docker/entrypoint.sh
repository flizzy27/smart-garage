#!/bin/sh
set -e

mkdir -p /data/uploads

if [ -d ./prisma/migrations ]; then
  echo "[startup] Running database migrations…"
  prisma migrate deploy
  echo "[startup] Migrations complete"
fi

if [ -f ./docker/ensure-catalog.mjs ]; then
  echo "[startup] Checking vehicle catalog…"
  node ./docker/ensure-catalog.mjs
fi

echo "[startup] Starting Smart Garage…"
exec node server.js
