# Install, backup & updates

Production guide for self-hosters.

## Requirements

- Docker (Unraid 6.9+ or any Linux host)
- ~512 MB RAM
- Persistent volume at `/data` inside the container

## First start

1. Install via **Unraid Apps** (search *Smart Garage*) — see [UNRAID.md](./UNRAID.md) — or [Docker below](#docker-linux-nas-homelab)
2. Open the web UI
3. **Register** your account (first user = admin)
4. Add a vehicle and start logging data

No default password is shipped. No demo data is created in production.

## Docker (Linux, NAS, homelab)

```bash
docker run -d \
  --name smart-garage \
  --restart unless-stopped \
  -p 3000:3000 \
  -v smart-garage-data:/data \
  -e DATABASE_URL=file:/data/smart-garage.db \
  -e UPLOAD_DIR=/data/uploads \
  ghcr.io/flizzy27/smart-garage:latest
```

Or from this repo: `docker compose up -d` (see [docker-compose.yml](../docker-compose.yml)).

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:/data/smart-garage.db` | SQLite path |
| `UPLOAD_DIR` | `/data/uploads` | File storage |
| `MAX_UPLOAD_SIZE_MB` | `25` | Document upload limit |
| `MAX_IMAGE_SIZE_MB` | `10` | Vehicle image limit |
| `NODE_ENV` | `production` | Do not change |
| `SESSION_COOKIE_SECURE` | unset | Session cookie `Secure` flag — see below |

Set in the Unraid template UI or in `docker-compose.yml`.

### Reverse proxy / Cloudflare / custom domain

Smart Garage keeps `/data` (SQLite + uploads) as the **only** persistent state.
There is no `AUTH_SECRET`/`SESSION_SECRET` to configure — login sessions are a
random opaque token stored in the database, not a signed/encrypted cookie, so
there is nothing that can "rotate" and invalidate every session on restart.

`SESSION_COOKIE_SECURE` controls the cookie's `Secure` attribute:

- **Unset (default):** works for both plain `http://` (local IP / LAN) and
  `https://` (reverse proxy) access — browsers accept non-`Secure` cookies
  over HTTPS too. Use this if you access Smart Garage both locally over HTTP
  and remotely over HTTPS.
- `SESSION_COOKIE_SECURE=true`: forces the `Secure` flag. Use this if the app
  is **only** ever reached over HTTPS (e.g. exclusively through Cloudflare).
- `SESSION_COOKIE_SECURE=auto`: sets `Secure` only when the reverse proxy
  forwards `X-Forwarded-Proto: https`. Make sure your proxy (Cloudflare
  Tunnel, Nginx Proxy Manager, Traefik, etc.) sets this header.

If the app ever shows a generic error page after visiting through a new
domain or after a database restore, it self-recovers automatically: the
stale/incompatible session cookie is cleared and you're redirected to the
login page with a "session expired" notice — no manual cookie deletion
should ever be required. See [`CHANGELOG.md`](../CHANGELOG.md) for details.

## Installing as an app (PWA)

Smart Garage can be added to the home screen / installed as a standalone app
(own icon, own window, no browser UI) on iPhone, Android, and desktop
Chrome/Edge. This works identically over local IP and a reverse-proxy domain
— no extra configuration or environment variables are required.

- **iPhone/iPad:** open in Safari → Share → *Add to Home Screen*.
- **Android:** open in Chrome → menu (⋮) → *Install app*.
- **Desktop (Chrome/Edge):** click the install icon in the address bar, or
  use the browser menu → *Install Smart Garage…*.

Step-by-step instructions are also shown in-app under **Settings → Install
app**. A minimal service worker (`public/sw.js`) enables the install prompt
on Chrome/Android; it only caches the manifest/icons and never touches
`/api/*` or page HTML, so it cannot cause stale login state or hide a new
update after a container restart. See `AGENTS.md` if you ever need to bump
its cache version after changing an icon file.

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
