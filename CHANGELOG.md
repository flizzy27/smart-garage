# Changelog

All notable changes are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

_Nothing yet._

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

[Unreleased]: https://github.com/flizzy27/smart-garage/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/flizzy27/smart-garage/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/flizzy27/smart-garage/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/flizzy27/smart-garage/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/flizzy27/smart-garage/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/flizzy27/smart-garage/releases/tag/v0.1.0
