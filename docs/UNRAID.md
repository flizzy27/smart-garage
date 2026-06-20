# Smart Garage on Unraid

Install Smart Garage on Unraid **without `docker compose`** — use the **Community Applications** template or the Unraid Docker UI.

## Why no manual `data` folder?

| Install method | Who creates storage |
|----------------|---------------------|
| **Unraid template (recommended)** | Unraid creates `/mnt/user/appdata/smart-garage` automatically when you set the AppData path |
| **Inside the container** | Entrypoint runs `mkdir -p /data/uploads`; SQLite file is created on first start |
| **Docker Compose on PC/Linux** | Named volume `smart-garage-data` is created automatically (no `mkdir` needed) |

You only needed `mkdir data` before because the old compose file used a host bind mount (`./data`). That is fixed now.

## Prerequisites

- Unraid 6.9+ with **Docker** enabled
- **Community Applications** plugin installed (Apps tab)
- No Docker Desktop on Unraid (Unraid has its own Docker engine)
- No `docker compose` CLI required — the template uses Unraid’s Docker UI

## Option 1 — Install from template (works today)

Use this **before** the app appears in the public CA search (or anytime):

1. Open Unraid → **Docker** tab  
2. Click **Add Container**  
3. At the bottom, choose **Click here to install another applications's template** (wording may vary slightly by Unraid version)  
4. Paste this URL:

   ```
   https://raw.githubusercontent.com/flizzy27/smart-garage/main/templates/smart-garage.xml
   ```

5. Click **Install** / **Apply**  
6. Configure:
   - **Web UI port** — default `3000` (change if port is taken)
   - **AppData** — default `/mnt/user/appdata/smart-garage` (created automatically)
   - **Max upload size (MB)** — default `25`
   - **Max image size (MB)** — default `10`
7. Click **Apply** and start the container  
8. Open **http://\<unraid-ip\>:\<port\>/** → register → add a vehicle

The container image is pulled from:

`ghcr.io/flizzy27/smart-garage:latest`

## Option 2 — Search in Community Applications (after CA approval)

To show **Smart Garage** when users search in the **Apps** store:

1. Maintainer submits the repo at [ca.unraid.net/submit](https://ca.unraid.net/submit/new)  
2. After review, the app is listed under **Apps** → search **Smart Garage**

See [UNRAID-CA-SUBMIT.md](./UNRAID-CA-SUBMIT.md) for the submission checklist.

## Option 3 — Manual Docker UI

If the template link does not work on your Unraid version:

| Setting | Value |
|---------|-------|
| Name | `smart-garage` |
| Repository | `ghcr.io/flizzy27/smart-garage:latest` |
| Network | bridge |
| Port | `3000` → `3000` TCP |
| Path | `/mnt/user/appdata/smart-garage` → `/data` |
| Variable | `DATABASE_URL` = `file:/data/smart-garage.db` |
| Variable | `UPLOAD_DIR` = `/data/uploads` |
| Variable | `MAX_UPLOAD_SIZE_MB` = `25` |
| Variable | `MAX_IMAGE_SIZE_MB` = `10` |
| Variable | `NODE_ENV` = `production` |

## Updates

1. Backup `/mnt/user/appdata/smart-garage`  
2. Docker → smart-garage → **Force Update** (pulls latest image)  
3. Restart container — migrations run automatically on start

Pin a version by changing the repository tag, e.g. `ghcr.io/flizzy27/smart-garage:v0.2.1`.

## Backup

Archive the entire AppData folder:

```
/mnt/user/appdata/smart-garage/
├── smart-garage.db
└── uploads/
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `compose` command unknown | Normal on Unraid — use the template (this guide), not compose |
| Image pull failed | Ensure `ghcr.io/flizzy27/smart-garage:latest` exists (GitHub Actions publish workflow) |
| Port conflict | Change Web UI port to e.g. `3001` in template settings |
| Permission errors | `chown -R 1000:1000 /mnt/user/appdata/smart-garage` |

---

*Repository: [github.com/flizzy27/smart-garage](https://github.com/flizzy27/smart-garage)*
