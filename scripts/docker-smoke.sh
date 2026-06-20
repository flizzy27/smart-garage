#!/bin/sh
# Build the production image and verify container startup (migrations + health).
# Catches issues like missing Prisma config deps that only appear at runtime.
set -eu

IMAGE="${1:-smart-garage:smoke-test}"
CONTAINER="smart-garage-smoke-$$"
VOLUME="smart-garage-smoke-data-$$"
PORT="${SMOKE_PORT:-3099}"
MAX_WAIT="${SMOKE_MAX_WAIT_SEC:-180}"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "[smoke] Building image $IMAGE…"
docker build --build-arg APP_VERSION=smoke -t "$IMAGE" .

echo "[smoke] Starting container on port $PORT…"
docker run -d --name "$CONTAINER" \
  -p "${PORT}:3000" \
  -v "${VOLUME}:/data" \
  -e DATABASE_URL=file:/data/smart-garage.db \
  -e UPLOAD_DIR=/data/uploads \
  "$IMAGE" >/dev/null

echo "[smoke] Waiting for /api/health (max ${MAX_WAIT}s)…"
elapsed=0
while [ "$elapsed" -lt "$MAX_WAIT" ]; do
  if curl -sf "http://127.0.0.1:${PORT}/api/health" >/tmp/smart-garage-smoke-health.json 2>/dev/null; then
    echo "[smoke] Health check passed:"
    cat /tmp/smart-garage-smoke-health.json
    echo ""
    rm -f /tmp/smart-garage-smoke-health.json
    echo "[smoke] Success"
    exit 0
  fi

  if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "[smoke] Container exited early. Logs:"
    docker logs "$CONTAINER" 2>&1 || true
    exit 1
  fi

  sleep 3
  elapsed=$((elapsed + 3))
done

echo "[smoke] Timed out after ${MAX_WAIT}s. Logs:"
docker logs "$CONTAINER" 2>&1 || true
exit 1
