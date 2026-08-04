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
  # An existing install only needs a top-up, and that import is upsert-only —
  # run it alongside the app instead of holding the container hostage for
  # minutes after a Force Update. A fresh install still waits, because an
  # empty catalog would leave the "add vehicle" form with nothing to pick.
  CATALOG_PLAN="$(node ./docker/ensure-catalog.mjs --plan 2>/dev/null | tail -n 1 || echo blocking)"
  case "$CATALOG_PLAN" in
    skip)
      echo "[startup] Vehicle catalog is up to date"
      ;;
    background)
      echo "[startup] Vehicle catalog update runs in the background — the app is available now"
      node ./docker/ensure-catalog.mjs &
      ;;
    *)
      node ./docker/ensure-catalog.mjs
      ;;
  esac
fi

echo "[startup] Starting Smart Garage…"
exec node server.js
