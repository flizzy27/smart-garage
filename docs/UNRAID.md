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
| SSO settings | empty | Optional OpenID Connect login — see [OIDC.md](./OIDC.md). Shown under **Advanced**. |

## Units

Smart Garage stores everything metric and converts for display. Under
**Settings → Regional** you can pick kilometres or **miles** and litres or
**US gallons** — with miles and gallons selected, fuel economy is shown as
**MPG**. Switching units never changes your stored data.

Under **Settings → Vehicle fields** you can switch off fields that do not apply
to you (HSN and TSN are German type-approval numbers, for example) and add your
own fields such as tire size.

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
| Container exits on start | Update to latest via **Force Update** |
| Notifications not arriving | Check **Settings → Notifications**: provider enabled, credentials saved, quiet hours not active. Delivery runs in the container — the browser does not need to be open. |

More: [INSTALL.md](./INSTALL.md)
