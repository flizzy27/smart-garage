<div align="center">

<img src="templates/icon.png" alt="Smart Garage" width="128" />

# Smart Garage

**Your vehicles. Your data. Your NAS.**

Self-hosted vehicle management for **Unraid** and homelab — maintenance, fuel, costs, and documents in one Docker container.

[![Release](https://img.shields.io/github/v/release/flizzy27/smart-garage?style=flat-square)](https://github.com/flizzy27/smart-garage/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![GHCR](https://img.shields.io/badge/image-ghcr.io-blue?style=flat-square)](https://github.com/flizzy27/smart-garage/pkgs/container/smart-garage)

[Install on Unraid](#-install-on-unraid) · [Features](#-features) · [Updates](#-updates) · [Changelog](CHANGELOG.md) · [Report issue](https://github.com/flizzy27/smart-garage/issues)

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

## 🖥️ Install on Unraid

**No `docker compose` needed** — Unraid uses the Docker UI and Community Applications.

### Option A — Template URL (works immediately)

1. **Docker** → **Add Container**
2. **Install another application's template** (link at the bottom)
3. Paste:

   ```
   https://raw.githubusercontent.com/flizzy27/smart-garage/main/templates/smart-garage.xml
   ```

4. Configure **port**, **AppData path**, and **upload limits** → **Apply**
5. Open `http://<unraid-ip>:<port>/` → register → add a vehicle

AppData is created automatically at `/mnt/user/appdata/smart-garage` by default.

### Option B — Community Applications store

After the repo is approved at [ca.unraid.net](https://ca.unraid.net/submit/new), search **Apps** for **Smart Garage**.

→ Full guide: **[docs/UNRAID.md](docs/UNRAID.md)**

## 🐳 Docker (Linux / NAS)

```bash
docker run -d \
  --name smart-garage \
  --restart unless-stopped \
  -p 3000:3000 \
  -v smart-garage-data:/data \
  -e MAX_UPLOAD_SIZE_MB=25 \
  -e MAX_IMAGE_SIZE_MB=10 \
  ghcr.io/flizzy27/smart-garage:latest
```

Or with Compose:

```bash
docker compose up -d
```

Image: `ghcr.io/flizzy27/smart-garage:latest`

## Updates

| Channel | Image tag | When updated |
|---------|-----------|--------------|
| **Stable (default)** | `ghcr.io/flizzy27/smart-garage:latest` | Version release tags only (`v0.4.0`, …) — CI must pass first |
| **Development** | `ghcr.io/flizzy27/smart-garage:development` | Every push to `main` after CI passes |

| Platform | Stable update | Dev preview |
|----------|---------------|-------------|
| **Unraid** | Docker → **Force Update** (uses `:latest`) | Change repository tag to `:development` in container settings |
| **Docker** | `docker pull ghcr.io/flizzy27/smart-garage:latest` | `docker pull ghcr.io/flizzy27/smart-garage:development` |

**Promote to stable:** when a dev build is approved, tag a release (`git tag v0.3.1 && git push origin v0.3.1`). That publishes `:latest`.

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
