# Smart Garage

Self-hosted vehicle management for homelab and NAS users. Track maintenance, expenses, fuel consumption, documents, and reminders — in one Docker container.

**Version:** 0.2.1 · [Changelog](./CHANGELOG.md) · MIT License

## Features (v0.2)

- **Open registration** — unlimited local accounts (first user becomes admin)
- **Vehicles** — profiles, specs, images, odometer sync
- **Maintenance** — schedules, service log, due/overdue dashboard
- **Expenses & fuel** — cost tracking, quick fill-up on dashboard, analytics & charts
- **Documents** — invoices and PDFs per vehicle
- **Reminders** — upcoming and overdue maintenance
- **Settings** — theme, accent color, background image, EN/DE UI
- **Admin** — user management
- **Single-container Docker** — SQLite database + uploads on one volume (`/data`)

## Quick start (Docker — recommended)

Works on **Unraid**, Linux, Windows, and macOS. You only need Docker on the machine that runs the container.

```bash
git clone https://github.com/flizzy27/smart-garage.git
cd smart-garage
docker compose up -d --build
```

No manual `data` folder needed — Docker creates a named volume automatically.

Open **http://your-server-ip:3000** → register your account → add a vehicle.

Data persists in the Docker volume `smart-garage-data`. On Unraid, use the [CA template](./templates/smart-garage.xml) instead (appdata path `/mnt/user/appdata/smart-garage`).

### Unraid (no compose required)

1. **Docker** → **Add Container** → install from template URL:
   `https://raw.githubusercontent.com/flizzy27/smart-garage/main/templates/smart-garage.xml`
2. Set port, AppData path, and upload limits in the UI
3. See **[docs/UNRAID.md](./docs/UNRAID.md)** for details
4. To list in the **Apps** store search: submit the repo via [docs/UNRAID-CA-SUBMIT.md](./docs/UNRAID-CA-SUBMIT.md)

## Development (local, without Docker app image)

```bash
git clone https://github.com/flizzy27/smart-garage.git
cd smart-garage/frontend
cp .env.example .env
npm install
npm run db:repair    # migrate + generate Prisma client
npm run dev
```

Open http://localhost:3000

## Tech stack

| Layer | Technology |
|-------|------------|
| App | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| i18n | next-intl (EN + DE) |
| Database | SQLite (single-file, in `/data`) |
| ORM | Prisma |
| Deploy | One Docker image (Next.js standalone) |

## Documentation

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](./CHANGELOG.md) | Version history |
| [docs/UNRAID.md](./docs/UNRAID.md) | Unraid install guide |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment concepts & backups |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Contributor workflow |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design |
| [PROJECT.md](./PROJECT.md) | Product vision |

## Releases

Tagged releases follow [Semantic Versioning](https://semver.org/):

| Tag | Summary |
|-----|---------|
| `v0.2.1` | Unraid CA template, GHCR image publish, no manual data folder |
| `v0.2.0` | Full V1 app: auth, vehicles, maintenance, fuel analytics, Docker |
| `v0.1.0` | Initial Next.js scaffold |

```bash
git checkout v0.2.0
docker compose up -d --build
```

## Backup

Copy the entire `data` directory (or Unraid appdata path):

```
data/
├── smart-garage.db    # SQLite database
└── uploads/           # images & documents
```

## License

[MIT](./LICENSE) — Copyright (c) 2026 [flizzy27](https://github.com/flizzy27)
