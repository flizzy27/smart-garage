# Smart Garage on Unraid

Step-by-step guide to run Smart Garage as a single Docker container on Unraid.

## Do you need Docker Desktop?

| Where | Docker Desktop? |
|-------|-----------------|
| **Unraid server** | **No** — Unraid includes Docker |
| **Windows PC (optional)** | Only if you want to **build/test locally** before deploying to Unraid |

On Unraid you use the built-in Docker engine. Docker Desktop on your PC is optional for trying the image before copying it to the NAS.

---

## Option A — Build on Unraid (simplest)

### 1. Get the project onto Unraid

SSH into Unraid or use the terminal:

```bash
cd /mnt/user/appdata
git clone https://github.com/flizzy27/smart-garage.git
cd smart-garage
```

Or clone on your PC and copy the folder to `/mnt/user/appdata/smart-garage` via SMB.

### 2. Create persistent data folder

```bash
mkdir -p /mnt/user/appdata/smart-garage/data
```

This folder will hold the SQLite database and uploaded files.

### 3. Build and start

```bash
cd /mnt/user/appdata/smart-garage
docker compose up -d --build
```

First build takes several minutes (downloads Node, npm install, Next.js build).

### 4. Open the app

Browser: `http://<unraid-ip>:3000`

- Register your account (first user = admin)
- Add a vehicle and start using the app

### 5. Persistent paths

| Host (Unraid) | Container | Content |
|---------------|-----------|---------|
| `/mnt/user/appdata/smart-garage/data` | `/data` | SQLite DB + uploads |

The `docker-compose.yml` in the repo maps `./data` → `/data`. When you run compose from `/mnt/user/appdata/smart-garage`, data stays on the array.

---

## Option B — Build on Windows, run on Unraid

Useful if you develop on a PC with Docker Desktop:

### On Windows (Docker Desktop running)

```powershell
cd C:\path\to\smart-garage
mkdir data
docker compose up -d --build
```

Test at http://localhost:3000. Stop when done:

```powershell
docker compose down
```

### On Unraid

Copy the project folder to `/mnt/user/appdata/smart-garage` and run the same `docker compose up -d --build` there.  
You do **not** export a `.tar` manually — Compose builds the image from the `Dockerfile` on the machine where you run it.

---

## Option C — Unraid Docker UI (manual container)

If you prefer the Unraid web UI instead of Compose:

1. **Docker** → **Add Container**
2. Build the image first (terminal):  
   `docker build -t smart-garage:0.2.0 /mnt/user/appdata/smart-garage`
3. Template settings:

| Field | Value |
|-------|-------|
| Name | `smart-garage` |
| Repository | `smart-garage:0.2.0` |
| Network | bridge |
| Port | `3000:3000` |
| Path | `/mnt/user/appdata/smart-garage/data` → `/data` |
| Restart policy | unless-stopped |

4. Apply → open `http://<unraid-ip>:3000`

---

## Updates

```bash
cd /mnt/user/appdata/smart-garage

# Backup first!
tar -czf ../smart-garage-backup-$(date +%F).tar.gz data/

git pull
docker compose up -d --build
```

Migrations run automatically on container start (`prisma migrate deploy` in entrypoint).

To use a specific version:

```bash
git checkout v0.2.0
docker compose up -d --build
```

---

## Reverse proxy (optional)

If you use **Nginx Proxy Manager** or **SWAG** on Unraid:

- Forward to Unraid IP, port **3000**
- Enable HTTPS on the proxy
- No extra env vars required for basic LAN use

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 3000 in use | Change in `docker-compose.yml`: `"3001:3000"` |
| Container restart loop | Check logs: Docker → smart-garage → Logs |
| Permission errors on `/data` | `chown -R 1000:1000 /mnt/user/appdata/smart-garage/data` |
| Blank page after update | Hard refresh; check logs for migration errors |

---

## Backup & restore

**Backup:** archive `/mnt/user/appdata/smart-garage/data` (entire folder).

**Restore:** stop container → replace `data` folder → start container.

---

*Repository: [github.com/flizzy27/smart-garage](https://github.com/flizzy27/smart-garage)*
