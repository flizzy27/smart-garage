#!/bin/sh
set -e

mkdir -p /data/uploads

if [ -f ./node_modules/prisma/build/index.js ]; then
  npx prisma migrate deploy
fi

exec node server.js
