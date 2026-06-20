# Smart Garage — Development Guide

**Status:** Active  
**Audience:** Contributors  
**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) · [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 0. Repository audit

### Current development state

| Component | Status |
|-----------|--------|
| Next.js app | Runs (`npm run dev`); placeholder home page |
| PostgreSQL | `docker/docker-compose.dev.yml` — port 5432 |
| Prisma | **Not configured** |
| Auth | **Not configured** |
| i18n (next-intl) | **Not configured** — documented target architecture |
| Tests | **None yet** |
| CI | Lint, typecheck, build on GitHub Actions |

### Gaps this guide addresses

- Standardized local setup workflow
- i18n rules before UI work begins
- Regional formatting conventions
- Layer boundaries and where code belongs
- Database workflow (when Prisma lands)
- Pre-implementation checklist for contributors

---

## 1. Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 22+ |
| npm | 10+ |
| Docker | For local PostgreSQL |
| Git | |

---

## 2. Local setup

### Clone and configure

```bash
git clone https://github.com/flizzy27/smart_garage.git
cd smart_garage
cp .env.example .env
```

### Start database

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

Verify: `docker ps` shows `smart-garage-db-dev` healthy.

### Install and run app

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Verify quality gates

```bash
npm run lint
npm run typecheck
npm run build
```

---

## 3. Environment variables

See [.env.example](../.env.example). Key variables for development:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | `postgresql://smartgarage:smartgarage@localhost:5432/smartgarage` |
| `AUTH_SECRET` | Required when auth is implemented |
| `APP_URL` | `http://localhost:3000` |

Never commit `.env`.

---

## 4. Project layout (where code goes)

```
frontend/
├── app/[locale]/          # Pages (locale-aware)
├── components/            # React UI — useTranslations only
├── messages/
│   ├── en.json            # Default — add every new UI string here first
│   └── de.json            # German — required for every new key
├── lib/
│   ├── domain/            # Pure business rules
│   ├── services/          # Use cases + authorization
│   ├── repositories/      # Prisma queries
│   ├── regional/          # formatDistance, formatCurrency, formatDate
│   ├── i18n/              # Locale config
│   └── validations/       # Zod schemas
└── prisma/                # schema.prisma (Phase 0)
```

### Layer rules

| Layer | May import | Must not import |
|-------|------------|-----------------|
| `components/` | services (rare), hooks, i18n | prisma, repositories |
| `app/` | components, services | — |
| `services/` | domain, repositories | react |
| `domain/` | — | prisma, next, react |
| `repositories/` | prisma | react |

---

## 5. Internationalization (i18n)

### Requirements

- **Default language:** English (`en`)
- **V1 languages:** English + German (`de`)
- **No hardcoded user-facing strings** in components or pages
- User selects language in **Settings** → `user_preferences.locale`

### Planned stack: next-intl

When implemented (ROADMAP Phase 0/1):

1. `app/[locale]/` route segment
2. `messages/en.json` and `messages/de.json`
3. Middleware for locale detection
4. `useTranslations('namespace')` in client components
5. `getTranslations()` in Server Components

### Adding UI strings (workflow)

1. Add key to `messages/en.json`
2. Add same key to `messages/de.json` with German translation
3. Reference via `t('key')` — never literal text in JSX

```json
// messages/en.json
{ "vehicles": { "title": "Vehicles", "add": "Add vehicle" } }

// messages/de.json
{ "vehicles": { "title": "Fahrzeuge", "add": "Fahrzeug hinzufügen" } }
```

### Database-backed translations

System maintenance template names use `maintenance_template_translations` — seed both `en` and `de` in Prisma seed script.

User-generated content (notes, descriptions) is **not** auto-translated.

---

## 6. Regional & formatting

### Storage vs display

| Data | Store as | Display with |
|------|----------|--------------|
| Odometer | Integer km | `formatDistance(km, prefs)` |
| Fuel (future) | Integer ml | `formatVolume(ml, prefs)` |
| Money | Integer cents + currency | `formatCurrency(cents, currency, locale)` |
| Dates | UTC TIMESTAMPTZ | `formatDateTime(date, prefs)` |

### Defaults (European)

- `locale`: `en` (UI language — independent of units)
- `unit_system`: `METRIC`
- `distance_unit`: `KILOMETER`
- `volume_unit`: `LITER`
- `currency`: `EUR`
- `timezone`: `Europe/Berlin` (user-configurable)

Implement formatting in `lib/regional/` — single source used by UI and exports.

---

## 7. Database development (when Prisma is added)

### Workflow

```bash
cd frontend
npx prisma migrate dev --name describe_change
npx prisma db seed
npx prisma studio   # optional GUI
```

### Schema source of truth

Logical model: [DATABASE_DESIGN.md](../DATABASE_DESIGN.md)  
Prisma schema: `frontend/prisma/schema.prisma`

### Migration rules

- One migration per logical change
- Seed must be idempotent (`upsert`)
- Include EN + DE rows for system templates
- Document breaking changes in PR description

### Reset (development only)

```bash
npx prisma migrate reset
```

---

## 8. Authorization during development

Even before UI exists, services must call:

```typescript
// Conceptual
await authorization.requirePermission(userId, 'vehicles:write', vehicleId)
```

Roles seeded: `user`, `admin`. See [DATABASE_DESIGN.md §3.2–3.4](../DATABASE_DESIGN.md#32-roles).

---

## 9. File uploads (when implemented)

- Upload via `/api/internal/upload` (session auth)
- Store metadata in `files` table; blobs in `UPLOAD_DIR`
- Vehicle images processed with sharp (WebP + thumb)
- Never serve files from `public/` uploads path

---

## 10. Testing strategy (planned)

| Level | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | `lib/domain/`, `lib/services/`, `lib/regional/` |
| Integration | Vitest + Testcontainers | Repositories against real Postgres |
| E2E | Playwright (optional) | Auth → create vehicle → add maintenance |

Run in CI before merge.

---

## 11. Git workflow

1. Branch from `main`: `feature/short-description`
2. Keep PRs focused
3. Run `lint`, `typecheck`, `build` locally
4. Update docs if architecture or schema changes
5. Fill PR template (`.github/pull_request_template.md`)

Commit style: follow existing history — concise imperative subject.

---

## 12. Documentation duties

When you change…

| Change | Update |
|--------|--------|
| Architecture decision | `ARCHITECTURE.md` or `docs/adr/` |
| New entity / field | `DATABASE_DESIGN.md` |
| Postgres operations | `DATABASE.md` |
| Dev workflow | This file |
| Self-hosting | `DEPLOYMENT.md` |
| User-visible feature | `CHANGELOG.md` (Unreleased) |

---

## 13. Phase 0 checklist (next implementation steps)

Not application UI — foundation only:

- [ ] Add Prisma + initial migration matching DATABASE_DESIGN V1 core
- [ ] Add next-intl with `en` + `de` message files
- [ ] Add `lib/regional/format.ts` stubs
- [ ] Add Auth.js with credentials provider
- [ ] Add `GET /api/health` with DB check
- [ ] Seed roles, permissions, system templates (EN + DE)

See [ROADMAP.md](../ROADMAP.md) for full phase plan.

---

## 14. Summary

Develop against **PostgreSQL locally**, follow **layer boundaries**, prepare all UI strings in **en + de**, store **metric values** in the database, and implement **authorization in services**. The complete data model is in [DATABASE_DESIGN.md](../DATABASE_DESIGN.md); system design in [ARCHITECTURE.md](../ARCHITECTURE.md).
