#!/bin/sh
set -e

mkdir -p /data/uploads

if [ -d ./prisma/migrations ]; then
  prisma migrate deploy
fi

if [ -f ./docker/ensure-catalog.mjs ]; then
  node ./docker/ensure-catalog.mjs
fi

exec node server.js
