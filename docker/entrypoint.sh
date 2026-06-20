#!/bin/sh
set -e

mkdir -p /data/uploads

if [ -f ./prisma.config.ts ]; then
  rm -f ./prisma.config.ts
fi

if [ -d ./prisma/migrations ]; then
  echo "[startup] Running database migrations…"
  prisma migrate deploy --schema=./prisma/schema.prisma
  echo "[startup] Migrations complete"
fi

if [ -f ./docker/ensure-catalog.mjs ]; then
  echo "[startup] Checking vehicle catalog…"
  node ./docker/ensure-catalog.mjs
fi

echo "[startup] Starting Smart Garage…"
exec node server.js
