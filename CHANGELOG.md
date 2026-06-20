# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

## [0.2.0] - 2026-06-19

### Added

- **Authentication** — login, open self-registration, sessions, remember-me, per-user data isolation
- **Vehicles** — CRUD, catalog import, specs, images, vehicle hub
- **Maintenance** — schedules, service records, due/overdue logic, km sync
- **Expenses** — manual costs linked to maintenance
- **Fuel tracking** — fill-up log, dashboard quick-add (amount + price/L + auto liters/date)
- **Fuel analytics** — avg consumption, price/L, cost per 100 km, projected annual consumption & cost, SVG charts
- **Documents** — upload and library per vehicle
- **Reminders** — overdue and due-soon maintenance list
- **Settings** — theme, accent, background image, locale, notifications
- **Admin** — user list, activate/deactivate, create users
- **UI** — collapsible sidebar, header date/time, EN/DE i18n, Smart Garage branding
- **Docker** — single all-in-one image (Next.js standalone + SQLite on `/data` volume)
- **CI** — GitHub Actions: lint, typecheck, build
- **Docs** — Unraid guide (`docs/UNRAID.md`), updated README

### Changed

- Database strategy for V1: **SQLite** in one container (simpler for NAS/homelab) instead of separate Postgres stack
- README and deployment docs aligned with current Docker setup

## [0.1.0] - 2026-06-19

### Added

- Initial Next.js 16 scaffold with TypeScript and Tailwind CSS 4
- Project documentation (architecture, database design, roadmap)
- MIT License

[Unreleased]: https://github.com/flizzy27/smart-garage/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/flizzy27/smart-garage/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/flizzy27/smart-garage/releases/tag/v0.1.0
