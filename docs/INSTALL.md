# Install, backup & updates

Production guide for self-hosters.

## Requirements

- Docker (Unraid 6.9+ or any Linux host)
- ~512 MB RAM
- Persistent volume at `/data` inside the container

## First start

1. Install via [Unraid template](../templates/smart-garage.xml) or `docker compose up -d`
2. Open the web UI
3. **Register** your account (first user = admin)
4. Add a vehicle and start logging data

No default password is shipped. No demo data is created in production.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:/data/smart-garage.db` | SQLite path |
| `UPLOAD_DIR` | `/data/uploads` | File storage |
| `MAX_UPLOAD_SIZE_MB` | `25` | Document upload limit |
| `MAX_IMAGE_SIZE_MB` | `10` | Vehicle image limit |
| `NODE_ENV` | `production` | Do not change |

Set in the Unraid template UI or in `docker-compose.yml`.

## Health check

```
GET /api/health
```

Returns `status`, `version`, and database connectivity.

## Backup

**Stop optional** (recommended for consistency):

```bash
docker stop smart-garage
```

Archive the data directory:

```bash
# Unraid
tar -czf smart-garage-backup.tar.gz -C /mnt/user/appdata smart-garage

# Docker volume
docker run --rm -v smart-garage-data:/data -v $(pwd):/backup alpine \
  tar -czf /backup/smart-garage-backup.tar.gz -C /data .
```

```bash
docker start smart-garage
```

## Restore

```bash
docker stop smart-garage
# replace AppData / volume contents with backup
docker start smart-garage
```

## Updates

| Channel | Tag | When |
|---------|-----|------|
| **Stable** | `:latest` | Version tag `vX.Y.Z` (CI must pass) |
| **Development** | `:development` | Every push to `main` (CI must pass) |

1. Backup AppData
2. **Force Update** for stable, or set image to `:development` for preview
3. Restart container — migrations run on start

**Promote to stable:** tag a release on GitHub (`v0.3.2`).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Image pull fails | Ensure `ghcr.io/flizzy27/smart-garage` package is **public** on GitHub |
| Port in use | Change Web UI port in template (e.g. 3001) |
| Upload rejected | Increase `MAX_UPLOAD_SIZE_MB` in template settings |
| Permission errors | `chown -R 1000:1000 /mnt/user/appdata/smart-garage` |

See also [UNRAID.md](./UNRAID.md).
