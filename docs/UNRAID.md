# Unraid

Install **Smart Garage** from the Community Applications store — no `docker compose` required.

## Install

1. Open the **Apps** tab (install **Community Applications** first if you have not already).
2. Search for **Smart Garage**.
3. Click **Install**.
4. Review the template:
   - **Web UI port** — default `3000`
   - **AppData** — default `/mnt/user/appdata/smart-garage` (SQLite DB + uploads)
   - **Max upload / image size** — optional
5. Click **Apply**, open the WebUI, **register**, add a vehicle.

## Settings

| Field | Default | Notes |
|-------|---------|-------|
| Web UI port | 3000 | Change if occupied |
| AppData | `/mnt/user/appdata/smart-garage` | Auto-created |
| Max upload (MB) | 25 | PDFs, receipts |
| Max image (MB) | 10 | Vehicle photos |

## Updates

**Docker** → **smart-garage** → **Force Update** → restart

Uses `ghcr.io/flizzy27/smart-garage:latest`.

## Backup

Copy `/mnt/user/appdata/smart-garage` (entire folder), or use **Settings → Data & export** in the app.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| App not in **Apps** search | Update Community Applications, then search again |
| Pull error | Ensure GHCR package is public (GitHub → Packages) |
| Port conflict | Use 3001 or another free port in the template |
| Container exits on start | Update to latest via **Force Update** (`v0.4.4+`) |

More: [INSTALL.md](./INSTALL.md)
