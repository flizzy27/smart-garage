# Smart Garage — AI agent guide

**Read this file at the start of every new chat in this repository** before making changes.

## What this project is

Self-hosted vehicle management for **Unraid / homelab**. Single Docker container, SQLite + uploads on `/data`, no cloud.

| | |
|---|---|
| **Repo** | `https://github.com/flizzy27/smart-garage` (`flizzy27`) |
| **Version** | See `VERSION` (currently **0.3.1**) |
| **App code** | `frontend/` — Next.js 16 App Router, React 19, TypeScript strict |
| **Data** | SQLite via Prisma (`frontend/prisma/schema.prisma`) |
| **Deploy** | `Dockerfile` → `ghcr.io/flizzy27/smart-garage` |
| **User OS** | Windows 10/11 — dev machine; CI/Docker builds run on **Linux** |

## New chat checklist

1. Read `VERSION`, `CHANGELOG.md` (last entry), and `git log -3`.
2. Do **not** assume CI is broken — check GitHub Actions status if the user mentions failures.
3. Do **not** recreate removed docs (`ARCHITECTURE.md`, `ROADMAP.md`, `DATABASE.md`, etc.) — production cleanup in v0.3.0 removed them.
4. Before pushing: run or reason about Linux `npm ci` (see pitfalls below).
5. **Only commit when the user asks.**

## Stack (accurate — do not use outdated PostgreSQL references)

- **Next.js 16** — read `node_modules/next/dist/docs/` before assuming Next APIs; this is not “classic” Next.js.
- **React 19**, **Tailwind 4**, **next-intl** (en + de)
- **Prisma 6.x** + **SQLite** (`DATABASE_URL=file:...`)
- **Zod** at API boundaries
- **Docker**: `node:22-alpine`, standalone Next output, entrypoint `docker/entrypoint.sh`

## Directory map

```
frontend/           Next.js app (all application code)
  app/                Routes (App Router, [locale])
  components/         React UI
  lib/                domain, services, repositories, fuel analytics, etc.
  messages/           en.json + de.json — ALL UI strings here
  prisma/             schema, migrations, seed
Dockerfile            Production image build
docker/entrypoint.sh  Migrate + start on container boot
templates/            Unraid CA XML template (uses :latest)
.github/workflows/    ci.yml + docker-publish.yml
docs/                 UNRAID.md, INSTALL.md, CA-SUBMISSION.md
scripts/              ci-linux-docker.ps1, terminal-status.mjs
data/                 Local SQLite + uploads (gitignored)
```

## CI / CD (GitHub Actions)

Two workflows on push to `main`:

| Workflow | File | Purpose |
|----------|------|---------|
| **CI** | `.github/workflows/ci.yml` | `npm ci` → prisma → lint → typecheck → build |
| **Publish Docker image** | `.github/workflows/docker-publish.yml` | Same validate job, then push image |

**Image channels:**

| Tag | When |
|-----|------|
| `:development` | Every `main` push after validate passes |
| `:latest` + `:vX.Y.Z` | Only on git tags `v*` (e.g. `v0.3.1`) |

Unraid template (`templates/smart-garage.xml`) points at **`:latest`**.

Actions URL: https://github.com/flizzy27/smart-garage/actions

## Known pitfalls (do not re-break)

### 1. `package-lock.json` must work on Linux

Lockfile generated only on Windows can break `npm ci` on GitHub with:

```
Missing: @emnapi/runtime, @emnapi/core, @swc/helpers
```

**Fix:** Regenerate inside Linux Docker, then commit:

```bash
docker run --rm -v "$PWD:/repo" -w /repo/frontend node:22-bookworm-slim npm install
```

Or locally: `powershell -NoProfile -File scripts/ci-linux-docker.ps1`

### 2. Dockerfile `deps` stage — no Prisma postinstall

`package.json` has `"postinstall": "prisma generate"`. In Dockerfile `deps`, only `package.json` + lockfile are copied — **no schema yet**.

**Must use:** `RUN npm ci --ignore-scripts` in deps stage.  
`prisma generate` runs in the **builder** stage after `COPY frontend/`.

### 3. ESLint / CI lint

CI runs `npm run lint` (eslint). Fix **errors** before push; warnings are OK (exit 0).

Past fixes (v0.3.1): no `setState` in `useEffect` for init; no unsafe `!` on optional chains.

### 4. Terminal / shell on Windows (user machine)

- Use `powershell`, not `pwsh` (PowerShell 7 not installed).
- Never assume success on `exit_code: unknown` — read terminal file or run `node scripts/terminal-status.mjs`.
- Long Docker CI: use `scripts/ci-linux-docker.ps1` (isolated `node_modules` volume).
- Ignore `PredictionViewStyle` PowerShell profile noise.

## Code conventions

- TypeScript only in `frontend/` (scripts may use `.mjs` / `.ps1`)
- **No hardcoded UI text** — `messages/en.json` + `messages/de.json`
- Business logic: `lib/domain/`, `lib/services/` — no React imports
- Data access: `lib/repositories/` — Prisma only
- AuthZ in services, not UI-only
- Metric storage (km, ml); format per user locale
- Do not commit `.env`, `data/`, secrets

## Local development

```bash
cd frontend
npm ci
npx prisma migrate dev
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm run build
```

Env: copy `.env.example` → `.env` with `DATABASE_URL=file:../data/smart-garage.db`

## Release workflow (when user asks)

1. Bump `VERSION`, `frontend/package.json` version, `CHANGELOG.md`
2. Commit, push `main`, verify Actions green
3. `git tag vX.Y.Z && git push origin vX.Y.Z` → publishes `:latest`
4. GitHub release optional

## Unraid / CA

- Template URL: `https://raw.githubusercontent.com/flizzy27/smart-garage/main/templates/smart-garage.xml`
- CA submission data: `docs/CA-SUBMISSION.md`
- GHCR package must be **public** for CA

## Out of scope unless explicitly requested

- New features without a clear task
- Restoring deleted internal dev docs
- PostgreSQL migration (project uses SQLite)
- Force-push to `main`

## Cursor project files

| File | Role |
|------|------|
| `AGENTS.md` | This file — project memory for all chats |
| `frontend/AGENTS.md` | Next.js-specific notes |
| `.cursor/rules/*.mdc` | Auto-loaded rules (`alwaysApply: true`) |
| `.cursor/hooks.json` | Shell audit + session hints |

**Switching chats in the same folder:** Cursor does not remember past conversations, but **rules + this file** are loaded again. Always re-read `AGENTS.md` and `VERSION` before acting.
