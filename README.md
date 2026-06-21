<div align="center">

<img src="templates/icon.png" alt="Smart Garage" width="128" />

# Smart Garage

**Your vehicles. Your data. Your NAS.**

Self-hosted vehicle management for **Unraid** and homelab — maintenance, fuel, costs, and documents in one Docker container.

[![Release](https://img.shields.io/github/v/release/flizzy27/smart-garage?style=flat-square)](https://github.com/flizzy27/smart-garage/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![GHCR](https://img.shields.io/badge/image-ghcr.io-blue?style=flat-square)](https://github.com/flizzy27/smart-garage/pkgs/container/smart-garage)

[Install](#-install) · [Features](#-features) · [Updates](#-updates) · [Changelog](CHANGELOG.md) · [Report issue](https://github.com/flizzy27/smart-garage/issues)

</div>

---

## Why Smart Garage?

Most vehicle apps live in the cloud — your service history, receipts, and fuel data on someone else's server. **Smart Garage** runs entirely on your **Unraid box or homelab**: one container, one data folder, no subscription.

Built for people who want a clean garage dashboard without handing their data to a third party.

## ✨ Features

| | |
|---|---|
| 🚗 **Vehicles** | Profiles, photos, specs, manual entry, odometer quick-update, QR codes |
| 🔧 **Maintenance** | Schedules, service log, overdue/due-soon dashboard |
| 🛡️ **TÜV / HU & AU** | Inspection due dates with reminders |
| ⛽ **Fuel** | Quick fill-up, consumption analytics, projected annual usage, charts |
| 💶 **Expenses & costs** | Track costs, monthly overview dashboard, category breakdown |
| 📋 **Insurance** | Policies, SF class, premiums, renewal tracking |
| 📄 **Documents** | Store invoices and PDFs per vehicle |
| 🔔 **Reminders** | Maintenance, TÜV, and overdue items at a glance |
| 👨‍👩‍👧 **Family garage** | Share vehicles with other users (view or edit) |
| 📝 **Wishlist** | Planned purchases and dream cars |
| 💾 **Export** | JSON backup and CSV export from the UI |
| 🎨 **Personal** | Dark/light mode, 6 design presets, custom background with adjustable blur |
| 🌍 **Languages** | English & German |
| 👤 **Multi-user** | Open local registration, per-user data + sharing |
| 📦 **Simple ops** | Single Docker image, SQLite on `/data`, no extra database container |

## 🖥️ Install

### Unraid — Community Applications

Smart Garage is available in the **Unraid Community Applications** store. No `docker compose` required.

1. Open the **Apps** tab (Community Applications must be installed).
2. Search for **Smart Garage**.
3. Click **Install** and review the template settings:
   - **Web UI port** — default `3000` (change if that port is in use)
   - **AppData** — default `/mnt/user/appdata/smart-garage` (database + uploads; created automatically)
   - **Upload limits** — optional, defaults are fine for most users
4. Click **Apply**, then open the WebUI (or `http://<unraid-ip>:<port>/`).
5. **Register** your account (first user becomes admin) and add your first vehicle.

**Updates:** Docker → **smart-garage** → **Force Update** (pulls `ghcr.io/flizzy27/smart-garage:latest`).

More detail: **[docs/UNRAID.md](docs/UNRAID.md)**

### Docker — Linux, NAS, homelab (no Unraid)

Use the pre-built image from GitHub Container Registry. You need a persistent volume mounted at `/data` inside the container.

**`docker run`:**

```bash
docker run -d \
  --name smart-garage \
  --restart unless-stopped \
  -p 3000:3000 \
  -v smart-garage-data:/data \
  -e DATABASE_URL=file:/data/smart-garage.db \
  -e UPLOAD_DIR=/data/uploads \
  -e MAX_UPLOAD_SIZE_MB=25 \
  -e MAX_IMAGE_SIZE_MB=10 \
  ghcr.io/flizzy27/smart-garage:latest
```

Open `http://localhost:3000/` (or your host IP), register, and add a vehicle.

**Docker Compose** (optional):

```bash
docker compose up -d
```

Uses the same image and a named volume — see [docker-compose.yml](docker-compose.yml).

Image: `ghcr.io/flizzy27/smart-garage:latest`

Full ops guide: **[docs/INSTALL.md](docs/INSTALL.md)**

## Updates

| Channel | Image tag | When updated |
|---------|-----------|--------------|
| **Stable (default)** | `ghcr.io/flizzy27/smart-garage:latest` | Version release tags only (`v0.4.0`, …) — CI must pass first |
| **Development** | `ghcr.io/flizzy27/smart-garage:development` | Every push to `main` after CI passes |

| Platform | Stable update | Dev preview |
|----------|---------------|-------------|
| **Unraid** | Docker → **Force Update** (uses `:latest`) | Change repository tag to `:development` in container settings |
| **Docker** | `docker pull ghcr.io/flizzy27/smart-garage:latest` | `docker pull ghcr.io/flizzy27/smart-garage:development` |

**Promote to stable:** when a dev build is approved, tag a release (`git tag v0.4.2 && git push origin v0.4.2`). That publishes `:latest`.

Pin a version: `ghcr.io/flizzy27/smart-garage:v0.4.0`

## 💾 Backup

**In-app export:** Settings → **Data & export** — download JSON (full backup) or CSV (expenses).

**Manual backup** — archive your AppData / volume:

```
/data/
├── smart-garage.db    # all app data
└── uploads/           # images & documents
```

On Unraid: `/mnt/user/appdata/smart-garage`

## 📚 Documentation

| Doc | Description |
|-----|-------------|
| [docs/UNRAID.md](docs/UNRAID.md) | Unraid install & troubleshooting |
| [docs/INSTALL.md](docs/INSTALL.md) | Backup, restore, updates |
| [docs/CA-SUBMISSION.md](docs/CA-SUBMISSION.md) | Community Applications submission packet |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [SECURITY.md](SECURITY.md) | Security policy |

## 🏗️ Tech

Next.js 16 · React 19 · SQLite · Prisma · Tailwind CSS 4 · next-intl

Single **standalone** Docker image (~production-ready for homelab scale).

## 📄 License

[MIT](LICENSE) — Copyright (c) 2026 [flizzy27](https://github.com/flizzy27)

---

<div align="center">
<sub>Made for homelab & Unraid · No cloud required</sub>
</div>
