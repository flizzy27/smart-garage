# Smart Garage — Deployment Guide

**Status:** Proposed (pre-implementation)  
**Audience:** Self-hosters, Unraid users, maintainers  
**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATABASE.md](./DATABASE.md)

---

## 1. Deployment Philosophy

Smart Garage targets **homelab and NAS users** who expect:

- One command (or one Compose stack) to start
- Persistent data across container updates
- Clear backup/restore instructions
- No vendor lock-in to a cloud platform

Each installation is an **isolated single-tenant instance**. The deployment model optimizes for thousands of such instances, not one shared cluster.

---

## 2. Runtime Topology

### Default stack (recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                        Host (Unraid / Linux)                 │
│                                                              │
│  ┌─────────────────────┐      ┌─────────────────────────┐   │
│  │  smart-garage-app   │      │  smart-garage-db        │   │
│  │  (Node 22 + Next.js)│─────▶│  (postgres:16-alpine)   │   │
│  │  Port: 3000         │      │  Port: 5432 (internal)  │   │
│  └──────────┬──────────┘      └───────────┬─────────────┘   │
│             │                              │                 │
│             ▼                              ▼                 │
│     /mnt/user/appdata/              /mnt/user/appdata/       │
│     smart-garage/uploads            smart-garage/postgres      │
└─────────────────────────────────────────────────────────────┘
```

| Service | Image | Purpose |
|---------|-------|---------|
| `app` | `ghcr.io/<org>/smart-garage:<tag>` | Web UI + API |
| `db` | `postgres:16-alpine` | Primary datastore |

**Optional (not V1 default):**

| Service | When |
|---------|------|
| Reverse proxy | TLS termination (Traefik, NPM, SWAG) |
| MinIO | S3-compatible storage for large media libraries |
| Backup sidecar | Scheduled `pg_dump` + restic |

---

## 3. Docker Strategy

### 3.1 Multi-stage Dockerfile

| Stage | Base | Output |
|-------|------|--------|
| `deps` | `node:22-alpine` | `npm ci` with lockfile |
| `builder` | `node:22-alpine` | `prisma generate` + `next build` (standalone) |
| `runner` | `node:22-alpine` | Minimal runtime (~150–200 MB) |

**Key settings:**

- `output: 'standalone'` in `next.config.ts` — bundles only required server files
- Run as **non-root** user (`node` or dedicated `smartgarage` UID 1000)
- `NODE_ENV=production`
- Include `prisma` CLI in runner for `migrate deploy`

### 3.2 Container entrypoint

```bash
#!/bin/sh
set -e

# Wait for database (optional wait-for-it or dockerize)
npx prisma migrate deploy

# Seed only if empty (check maintenance_types count)
# node scripts/seed-if-empty.js

exec node server.js
```

Migrations run **before** the server accepts traffic. Failed migration → container exits non-zero (Compose restart policy surfaces the error).

### 3.3 docker-compose.yml (production)

```yaml
services:
  app:
    image: ghcr.io/smart-garage/smart-garage:${SMART_GARAGE_VERSION:-latest}
    container_name: smart-garage-app
    restart: unless-stopped
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      AUTH_SECRET: ${AUTH_SECRET}
      AUTH_URL: ${APP_URL:-http://localhost:3000}
      UPLOAD_DIR: /data/uploads
      REGISTRATION_MODE: ${REGISTRATION_MODE:-open}
      FIRST_USER_IS_ADMIN: ${FIRST_USER_IS_ADMIN:-true}
      MAX_UPLOAD_SIZE_MB: ${MAX_UPLOAD_SIZE_MB:-25}
      NODE_ENV: production
    volumes:
      - ${UPLOAD_PATH:-./data/uploads}:/data/uploads
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:16-alpine
    container_name: smart-garage-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-smartgarage}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-smartgarage}
    volumes:
      - ${POSTGRES_PATH:-./data/postgres}:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-smartgarage}"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### 3.4 Development database compose

[`docker/docker-compose.dev.yml`](./docker/docker-compose.dev.yml):

- PostgreSQL only — app runs on host via `npm run dev`
- Production `docker-compose.yml` and `Dockerfile` planned in ROADMAP Phase 7

Developers run:

```bash
docker compose -f docker/docker-compose.dev.yml up -d
cd frontend && npm run dev
```

See [docker/README.md](./docker/README.md) for details.

### 3.5 Image publishing (open source)

| Tag | Meaning |
|-----|---------|
| `latest` | Latest stable release |
| `1` | Latest 1.x |
| `1.0.0` | Exact semver |

Build multi-arch (`linux/amd64`, `linux/arm64`) for Raspberry Pi and ARM NAS devices.

---

## 4. Unraid Compatibility

### 4.1 Why this stack works on Unraid

- Standard OCI images—no kernel modules
- Bind mounts to `/mnt/user/appdata/smart-garage/`
- No systemd requirement
- Compatible with Unraid Docker Manager and Compose Plugin

### 4.2 Recommended Unraid paths

| Path on host | Container mount | Content |
|--------------|-----------------|---------|
| `/mnt/user/appdata/smart-garage/postgres` | `/var/lib/postgresql/data` | Database files |
| `/mnt/user/appdata/smart-garage/uploads` | `/data/uploads` | Images + PDFs |
| `/mnt/user/appdata/smart-garage/compose` | — | `docker-compose.yml`, `.env` |

### 4.3 Unraid setup steps (summary)

1. Install **Docker Compose Manager** plugin (or use CLI)
2. Create appdata folders above
3. Copy `docker-compose.yml` + `.env` to compose directory
4. Generate secrets:
   ```bash
   openssl rand -base64 32   # AUTH_SECRET
   openssl rand -base64 24   # POSTGRES_PASSWORD
   ```
5. Set `APP_URL` to external URL (e.g. `https://garage.example.com`)
6. `docker compose up -d`
7. Open `http://<unraid-ip>:3000` and register first admin user

### 4.4 Community template (future)

Publish an **Unraid XML template** via Community Applications:

- Configurable: `APP_PORT`, paths, `REGISTRATION_MODE`
- Default network: bridge
- Post-install text: link to `docs/unraid.md`

### 4.5 Reverse proxy on Unraid

Most users run **Nginx Proxy Manager** or **SWAG**:

| Setting | Value |
|---------|-------|
| Forward hostname | Unraid IP |
| Forward port | 3000 |
| Websockets | Off (not needed V1) |
| SSL | Let’s Encrypt via proxy |

Set in `.env`:

```
APP_URL=https://garage.example.com
AUTH_TRUST_HOST=true
```

---

## 5. Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection string | `postgresql://user:pass@db:5432/smartgarage` |
| `AUTH_SECRET` | Session signing secret (≥32 bytes) | `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | DB password (in compose) | Random string |

### Recommended

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_URL` | `http://localhost:3000` | Public URL for auth callbacks |
| `AUTH_TRUST_HOST` | `false` | Set `true` behind reverse proxy |
| `REGISTRATION_MODE` | `open` | `open` \| `disabled` |
| `FIRST_USER_IS_ADMIN` | `true` | First signup becomes admin |
| `UPLOAD_DIR` | `/data/uploads` | File storage root |
| `MAX_UPLOAD_SIZE_MB` | `25` | Document upload limit |
| `MAX_IMAGE_SIZE_MB` | `10` | Vehicle image limit |
| `APP_PORT` | `3000` | Host port mapping |

### Optional (future)

| Variable | Description |
|----------|-------------|
| `STORAGE_DRIVER` | `local` \| `s3` |
| `S3_ENDPOINT` | MinIO URL |
| `S3_BUCKET` | Bucket name |
| `SMTP_URL` | Email reminders |

All configuration via environment—**no config files** inside the image (12-factor).

---

## 6. File Storage Strategy

### 6.1 Default: local bind mount

| Property | Detail |
|----------|--------|
| Location | `UPLOAD_DIR` (default `/data/uploads`) |
| Persistence | Host bind mount survives container replacement |
| Permissions | UID 1000 must own mount (document in install guide) |
| Max size | Limited by array free space—monitor on Unraid |

### 6.2 Directory layout

```
/data/uploads/
├── vehicles/{vehicleId}/
│   ├── images/{fileId}.webp
│   └── documents/{fileId}.pdf
└── users/{userId}/
    └── background/{fileId}.webp
```

Storage keys are recorded in `files.storage_key` (see [DATABASE.md](./DATABASE.md)).

### 6.3 Future: S3-compatible (MinIO)

For users with large document archives:

```
STORAGE_DRIVER=s3
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=smart-garage
```

Migration path: `scripts/migrate-storage.ts` copies local → S3, updates `storage_key` and `storage_backend` column.

### 6.4 Garbage collection

On vehicle/file delete, a background job (or synchronous V1) must:

1. Delete DB row
2. Delete blob from storage
3. Delete thumbnail if exists

Periodic cron (V2): scan for orphaned files not referenced in DB.

---

## 7. Backup Strategy

### 7.1 What to backup

| Asset | Criticality | Method |
|-------|-------------|--------|
| PostgreSQL data | **Critical** | `pg_dump` |
| Upload volume | **Critical** | `tar` / rsync / restic |
| `.env` | **Critical** | Secure copy (secrets) |
| Application container | Low | Re-pull image |

### 7.2 Backup frequency (recommendations)

| Profile | Database | Files | Retention |
|---------|----------|-------|-----------|
| Minimal | Weekly | Weekly | 4 weeks |
| Standard | Daily | Daily | 30 days |
| Cautious | Daily + pre-upgrade | Daily | 90 days + offsite |

### 7.3 Consistent backup procedure

**Problem:** DB and files can drift if backed up at different times.

**V1 recommended approach (homelab):**

1. Stop app container (DB stays running)
2. `pg_dump -Fc` from db container
3. Archive upload directory
4. Start app container

```bash
#!/bin/bash
# scripts/backup.sh — reference implementation for self-hosters
set -euo pipefail

BACKUP_DIR="/mnt/user/backups/smart-garage/$(date +%Y-%m-%d_%H%M)"
mkdir -p "$BACKUP_DIR"

docker stop smart-garage-app

docker exec smart-garage-db \
  pg_dump -U smartgarage -Fc smartgarage \
  > "$BACKUP_DIR/database.dump"

tar -czf "$BACKUP_DIR/uploads.tar.gz" \
  -C /mnt/user/appdata/smart-garage uploads

cp /mnt/user/appdata/smart-garage/compose/.env "$BACKUP_DIR/env.backup"

docker start smart-garage-app

echo "Backup complete: $BACKUP_DIR"
```

**Advanced:** BTRFS/ZFS snapshot of both volumes simultaneously—acceptable for homelab without stopping app if filesystem snapshots are atomic.

### 7.4 Restore procedure

```bash
docker compose down

# Restore database
docker compose up -d db
docker exec -i smart-garage-db pg_restore -U smartgarage -d smartgarage --clean < database.dump

# Restore files
rm -rf /mnt/user/appdata/smart-garage/uploads/*
tar -xzf uploads.tar.gz -C /mnt/user/appdata/smart-garage

docker compose up -d
```

Verify: login, open vehicle, confirm image and PDF load.

### 7.5 Offsite backup

Encourage users to sync `BACKUP_DIR` to:

- Another NAS (rsync)
- Backblaze B2 / S3 (restic)
- Unraid **User Scripts** plugin on schedule

### 7.6 Upgrade backup rule

**Always backup before upgrading** to a new major or minor version. Migrations are forward-only.

---

## 8. Upgrade Strategy

### 8.1 Version pinning

Self-hosters should pin image tags:

```yaml
image: ghcr.io/smart-garage/smart-garage:1.2.0
```

Avoid bare `latest` in production unless user accepts automatic updates.

### 8.2 Upgrade steps

1. Read `CHANGELOG.md` for breaking changes
2. Run backup (§7)
3. Pull new image: `docker compose pull app`
4. `docker compose up -d`
5. Entrypoint runs `prisma migrate deploy`
6. Verify `/api/health` and smoke test UI

### 8.3 Rollback

| Scenario | Action |
|----------|--------|
| App bug, DB unchanged | Revert image tag, `docker compose up -d` |
| Bad migration | Restore DB from pre-upgrade dump; revert image |
| Corrupted upload | Restore uploads archive only |

Keep migration backups until upgrade is validated (24–48 hours).

---

## 9. Health, Monitoring & Logs

### 9.1 Health endpoint

`GET /api/health` returns:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected",
  "uptime": 86400
}
```

Docker healthcheck and Unraid notifications can poll this URL.

### 9.2 Logging

| Setting | Value |
|---------|-------|
| Output | stdout/stderr |
| Format | JSON in production (structured) |
| Level | `info` default; `debug` via `LOG_LEVEL` |

Unraid users view logs via Docker Manager → Logs.

### 9.3 Future monitoring

- Prometheus metrics endpoint (request count, latency)
- Optional Grafana dashboard in docs
- Uptime Kuma ping monitor on `/api/health`

---

## 10. Security Hardening (Production)

| Measure | Implementation |
|---------|----------------|
| TLS | Terminate at reverse proxy; never expose plain HTTP to internet |
| Secrets | `.env` not in git; Unraid template hides sensitive fields |
| DB port | Do not publish `5432` to host unless debugging |
| Container user | Non-root in app image |
| Resource limits | Optional `mem_limit` on Unraid for app (512M–1G) |
| Firewall | Only proxy port public; app port LAN-only |
| Updates | Watch GitHub releases; Dependabot for CVEs |

---

## 11. Resource Sizing

| Profile | RAM (app + db) | CPU | Disk (5 yr use) |
|---------|----------------|-----|-----------------|
| Minimal (1–2 users) | 512 MB + 256 MB | 1 core | 2 GB DB + 5 GB files |
| Standard family | 1 GB + 512 MB | 2 cores | 5 GB DB + 20 GB files |
| Enthusiast (many docs) | 1 GB + 1 GB | 2 cores | 10 GB DB + 100 GB files |

Postgres benefits from Unraid **cache pool on SSD**; uploads can live on spinning array.

---

## 12. Development Workflow

### 12.1 Local setup

```bash
git clone https://github.com/<org>/smart-garage.git
cd smart-garage
cp .env.example .env

docker compose -f docker/docker-compose.dev.yml up -d

cd frontend
npm install
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`.

### 12.2 Day-to-day development

| Task | Command |
|------|---------|
| Schema change | Edit `prisma/schema.prisma` → `npx prisma migrate dev` |
| Seed | `npx prisma db seed` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Test | `npm test` |
| Reset DB | `npx prisma migrate reset` (dev only) |

### 12.3 Pre-commit / CI

1. ESLint + Prettier
2. `tsc --noEmit`
3. Unit tests
4. Integration tests (Testcontainers Postgres optional)
5. Build Docker image on release tag

### 12.4 Release process

1. Merge to `main`
2. Tag `v1.0.0`
3. CI builds and pushes multi-arch image
4. GitHub Release with changelog + upgrade notes
5. Update `docs/installation.md` if env vars changed

### 12.5 Contributing deployments

PRs that change `Dockerfile`, compose, or migrations require:

- Maintainer review
- Note in PR template: “Breaking change for self-hosters?”
- Migration tested against copy of production dump (when possible)

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| App restart loop | Migration failure | Check logs; restore DB; fix migration |
| `AUTH_SECRET` error | Missing env | Generate and set secret |
| Upload fails | Permissions on volume | `chown -R 1000:1000 uploads` |
| Images 404 | DB restored without files | Restore upload archive |
| Login redirect loop | Wrong `APP_URL` | Match public URL exactly |
| Slow dashboard | Missing indexes | Run migrations; check Postgres on SSD |

---

## 14. Summary

| Topic | Recommendation |
|-------|----------------|
| **Topology** | 2-container Compose: app + Postgres |
| **Image** | Multi-stage Next.js standalone, non-root |
| **Unraid** | Bind mounts under `/mnt/user/appdata/smart-garage/` |
| **Files** | Local volume default; S3/MinIO later |
| **Backups** | `pg_dump` + uploads archive together; backup before upgrades |
| **Config** | Environment variables only |
| **Upgrades** | Pin semver tags; forward migrations |
| **Dev workflow** | Host Next.js dev + Docker Postgres |

This deployment model is boring, reproducible, and battle-tested—the right foundation for thousands of independent self-hosted Smart Garage instances.

---

*Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md) · Schema: [DATABASE.md](./DATABASE.md)*
