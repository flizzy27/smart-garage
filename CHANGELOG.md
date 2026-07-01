# Changelog

All notable changes are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

_Nothing yet._

## [0.5.1] - 2026-07-01

### Added

- **Installable app experience (PWA manifest)** — `app/manifest.ts` provides a standalone Web App Manifest so Smart Garage can be added to a phone home screen and launched like a native app (self-hosted use, not app-store/SEO).
- **Safe-area support** — `viewport-fit=cover` plus safe-area padding on the header, mobile sidebar drawer, and main content so the UI no longer sits under the notch or home indicator on modern phones.
- **Mobile web-app metadata** — `appleWebApp` (home-screen launch), `themeColor` (light/dark browser chrome), and `formatDetection: telephone off` (stops iOS turning mileage/VIN numbers into call links).

### Fixed

- **No more accidental zoom on input focus (iOS)** — form controls are forced to 16px on small screens, which prevents iOS Safari's auto-zoom when focusing a field. Pinch-to-zoom stays available for accessibility.
- **Horizontal-scroll guard** — the main content area clips horizontal overflow to avoid stray sideways scrolling on narrow screens.
- **App-like tap feedback** — removed the grey tap-highlight flash on touch devices.

## [0.5.0] - 2026-07-01

### Added

- **Configurable "Soon due" warning thresholds** — the mileage warning (km) and date warning (days) that flip a service into the yellow "Soon due" state are now editable per user under **Settings → General → Maintenance reminders**. Presets (250/500/750/1000/1500/2000 km and 7/14/30/60/90 days) are offered, plus any custom value. Previously these were hardcoded at 30 days / 1,500 km.
- **`getMaintenanceThresholds()`** — lightweight per-user threshold lookup, threaded through the scheduler, repositories, services, and dashboard so status is computed consistently against the user's own settings.

### Changed

- **Centralized maintenance status styling** — all status colors (green OK / yellow Soon due / red Overdue) now come from a single `lib/maintenance/status-style.ts` module. The dashboard cards, maintenance board, schedule detail header, and reminders panel previously each carried their own duplicated color tables; they now share one source of truth for consistent colors everywhere.
- **Scheduler** — `computeNextDue()` and `resolveDueStatus()` accept configurable thresholds (defaulting to the previous 30 days / 1,500 km for backward compatibility).
- **Notifications** — the "Maintenance due soon" event hint now refers to the user's configured warning threshold instead of a fixed "30 days / 1,500 km".

### Database

- `UserPreferences` gains `maintenanceDueSoonKm` (default 1500) and `maintenanceDueSoonDays` (default 30). Migration `20260701192351_maintenance_due_soon_thresholds`.

## [0.4.8] - 2026-06-30

### Fixed

- **Year selection — race condition** — selecting a year in the simple catalog flow now sets `catalogModelYearId` immediately (synchronously), so the form can be submitted right away without waiting for the async engine-disambiguation fetch to complete
- **Engine picker not appearing** — switching the config-fetch effect guard from `catalogModelYearId` to `configsForYear` means the picker now always loads on initial render, including for previously saved vehicles that already have a `catalogModelYearId`; this fixes editing existing catalog vehicles
- **`years-by-series` option id** — the API now returns the actual `CatalogModelYear` row id as the option value (instead of the plain year number), so selecting a year immediately yields a valid catalog reference

## [0.4.7] - 2026-06-30

### Added

- **Intelligent vehicle autofill** — after selecting model + year, the app auto-resolves the catalog configuration: if there is only one option (e.g. bundled catalog), specs are filled automatically; if multiple engines exist, an engine/PS picker is shown
- **Manufacturer alias search** — typing "VW", "MB", "Mercedes", "Merc", "Benz", "Chevy", "Alfa", etc. now resolves to the correct manufacturer
- **Catalog detail fields** — `doors`, `seats`, `cylinders`, `valves`, `aspiration` stored from cardata.wiki; passed through to vehicle factory and current specs
- **Additive catalog import** — cardata.wiki import now fills-null-only (no more destructive delete on re-import); new `replaceExisting: true` flag to force a clean reimport
- **New API** — `/api/catalog/configs-by-year?seriesId=&year=` returns all engine configurations for a given model + year, enabling disambiguation

### Changed

- Validation no longer requires `generationId`/`variantId`/`engineId` when a `catalogModelYearId` is present (simplified catalog flow fills them automatically)
- `years-by-series` API now returns the production year as the option `id` (instead of a random `CatalogModelYear` cuid) — enables correct year-to-config lookup

## [0.4.6] - 2026-06-19

### Added

- **Service anpassen** on maintenance detail pages — edit interval, last service date, and odometer
- **Simplified vehicle catalog** — after choosing model, pick production year directly (individual years)
- **Catalog API** — `/api/catalog/years-by-series` for year lists per model

### Fixed

- **Bundled vehicle catalog** — regenerated from open-vehicle-db + cardata; correct production years per model (e.g. VW Scirocco no longer shows a single `1990–2026` range)
- **Catalog seeding** — generations split at production gaps; bundled dataset version bumped

## [0.4.5] - 2026-06-20

### Added

- **Reminders quick setup** — wizard to walk through warnings with exact date, circa (~3/6/12/24 months), estimate, later, or skip
- **Inline interval editing** on Reminders and Maintenance pages (km, months, last service)

## [0.4.4] - 2026-06-20

### Fixed

- **Docker smoke test / container startup** — Next.js standalone traced `prisma.config.ts` into the image; Prisma CLI failed with `Cannot find module 'prisma/config'`. Excluded from standalone trace, removed in Dockerfile, and stripped in entrypoint.
- **API auth** — protected routes return 401 instead of 500 when unauthenticated
- **ESLint** — zero warnings; unused imports cleaned up
- **Docker** — HEALTHCHECK in Dockerfile and docker-compose
- **`csv-parse`** moved to devDependencies (catalog import scripts only)

## [0.4.3] - 2026-06-20

### Fixed

- **Container startup crash** — `prisma.config.ts` was copied into the production image but the `prisma` npm package was not; Prisma CLI failed with `Cannot find module 'prisma/config'`. Production now uses `prisma migrate deploy --schema=./prisma/schema.prisma` without the dev config file.

### Added

- **Docker smoke test** — `scripts/docker-smoke.sh` builds the image, runs migrations + catalog seed, and checks `/api/health` in CI before any image is pushed to GHCR.

## [0.4.2] - 2026-06-20

### Fixed

- **GitHub Actions / Unraid updates** — `package-lock.json` regenerated with npm 10 (CI uses npm 10, lockfile was npm 11); all workflows green again
- **`:latest` stable image** — republished on tag `v0.4.2` (tags `v0.4.0` / `v0.4.1` never built because CI failed before Docker publish)
- **ESLint** — odometer quick-update no longer triggers `set-state-in-effect`

## [0.4.1] - 2026-06-19

### Fixed

- **Slow/hanging catalog seed on first start** — batch SQLite writes (~31k model years in ~30–60s instead of many minutes); progress logged per manufacturer in container console
- **Prisma deprecation warning** — moved seed config from `package.json` to `prisma.config.ts`

## [0.4.0] - 2026-06-19

### Added

- **Manual vehicle entry** — add make/model manually when a vehicle is not in the catalog
- **Odometer quick-update** — update mileage from the dashboard and vehicle detail page
- **TÜV / HU & AU tracking** — inspection due dates with reminders
- **Cost overview** — new `/costs` page with monthly trends, category and vehicle breakdown
- **QR code per vehicle** — scannable link to the vehicle detail page
- **Family garage** — share vehicles with other users (viewer or editor access)
- **Insurance tracker** — policies, SF class, premiums, and renewal dates per vehicle
- **Wishlist** — planned purchases, dream cars, and parts with status workflow
- **Export & backup** — JSON full backup and expenses CSV from Settings → Data & export
- **Design presets** — Classic, Space, Forest, Sunset, Midnight, Rose color themes
- **Configurable background blur** — adjustable blur strength (0–24 px) when using a custom background

### Changed

- Vehicle lists and dashboard now include shared family-garage vehicles
- Settings navigation adds **Data & export** section
- Sidebar navigation adds **Cost overview** and **Wishlist**

## [0.3.6] - 2026-06-20

### Fixed

- **Empty vehicle catalog on Unraid/Docker** — seed bundled manufacturer catalog on first container start; manufacturer search no longer requires CARDATA_WIKI-only data

## [0.3.5] - 2026-06-20

### Fixed

- **Session on HTTP and HTTPS** — default cookies work on both without configuration; optional `SESSION_COOKIE_SECURE=auto` for HTTPS-only secure cookies behind a reverse proxy; logout clears both cookie variants

## [0.3.4] - 2026-06-20

### Fixed

- **Login session lost on navigation** — session cookies no longer require HTTPS by default; fixes logout loop on Unraid when using `http://` on the LAN. Set `SESSION_COOKIE_SECURE=true` only behind HTTPS.

## [0.3.3] - 2026-06-20

### Fixed

- **Container startup** — `prisma: not found` on Unraid/CA install; install Prisma CLI globally in the image and run `prisma migrate deploy` at boot

## [0.3.2] - 2026-06-20

### Fixed

- **GitHub Actions `npm ci`** — Linux-synced `package-lock.json` (optional deps `@emnapi/*`, `@swc/helpers`)
- **Docker image build** — `npm ci --ignore-scripts` in Dockerfile deps stage so Prisma postinstall does not run before `schema.prisma` is copied
- **`:latest` stable image** — republished so Unraid and GHCR stable channel match the green CI build

## [0.3.1] - 2026-06-19

### Fixed

- **CI failures** — resolved ESLint errors (`set-state-in-effect`, unsafe optional chaining) that blocked all GitHub Actions runs

### Changed

- **Two Docker channels:**
  - `:development` — built on every `main` push (after CI passes)
  - `:latest` — stable channel, only on version tags `v*` (after CI passes)
- Docker publish workflow now runs lint/build before pushing any image
- Unraid template stays on `:latest` (safe default)

## [0.3.0] - 2026-06-19

### Production release

First public production release for Unraid Community Applications and self-hosting.

### Added

- Polished GitHub README with project purpose, features, and install guides
- [docs/INSTALL.md](./docs/INSTALL.md) — backup, restore, updates
- [docs/CA-SUBMISSION.md](./docs/CA-SUBMISSION.md) — complete CA submission packet for moderators
- `/api/health` returns app `version`
- `.dockerignore` for leaner image builds
- GitHub issue templates

### Changed

- **Production focus:** removed internal dev docs, dev compose, AI agent files, and Next.js default assets
- Docker Compose pulls pre-built `ghcr.io/flizzy27/smart-garage:latest` (no local build required)
- GHCR workflow publishes `latest` on every `main` push and on version tags (auto-updates on Unraid)
- Cleaned `.env.example` — production variables only, no PostgreSQL leftovers
- Updated SECURITY.md and CONTRIBUTING.md for production accuracy

### Removed

- `docker-compose.dev.yml`, planning docs (ARCHITECTURE, ROADMAP, etc.), dev probe scripts

## [0.2.1] - 2026-06-19

- Unraid CA template, GHCR publish workflow, named Docker volume

## [0.2.0] - 2026-06-19

- Full application: auth, vehicles, maintenance, fuel analytics, Docker

## [0.1.0] - 2026-06-19

- Initial Next.js scaffold

[Unreleased]: https://github.com/flizzy27/smart-garage/compare/v0.4.6...HEAD
[0.4.6]: https://github.com/flizzy27/smart-garage/compare/v0.4.5...v0.4.6
[0.4.5]: https://github.com/flizzy27/smart-garage/compare/v0.4.4...v0.4.5
[0.4.4]: https://github.com/flizzy27/smart-garage/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/flizzy27/smart-garage/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/flizzy27/smart-garage/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/flizzy27/smart-garage/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/flizzy27/smart-garage/compare/v0.3.6...v0.4.0
[0.3.6]: https://github.com/flizzy27/smart-garage/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/flizzy27/smart-garage/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/flizzy27/smart-garage/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/flizzy27/smart-garage/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/flizzy27/smart-garage/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/flizzy27/smart-garage/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/flizzy27/smart-garage/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/flizzy27/smart-garage/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/flizzy27/smart-garage/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/flizzy27/smart-garage/releases/tag/v0.1.0
