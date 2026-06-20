#!/bin/sh
set -e

mkdir -p /data/uploads

if [ -d ./prisma/migrations ]; then
  prisma migrate deploy
fi

exec node server.js
