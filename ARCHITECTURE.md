# Smart Garage — System Architecture

**Status:** Proposed (pre-implementation)  
**Audience:** Core contributors, reviewers, advanced self-hosters  
**Related:** [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) · [DATABASE.md](./DATABASE.md) · [DEVELOPMENT.md](./DEVELOPMENT.md) · [DEPLOYMENT.md](./DEPLOYMENT.md) · [ROADMAP.md](./ROADMAP.md)

---

## 0. Repository audit

### What exists today

| Layer | State |
|-------|--------|
| **Application** | Next.js 16 scaffold in `frontend/` — default page, layout metadata, Tailwind 4 |
| **Database** | Dev Postgres via `docker/docker-compose.dev.yml`; **no Prisma schema** |
| **Auth / API** | Not implemented |
| **i18n** | Not implemented; `layout.tsx` uses `lang="de"` — will change to locale-aware |
| **Documentation** | Strong foundation: ARCHITECTURE, DATABASE, ROADMAP, DEPLOYMENT, CONTRIBUTING, SECURITY |
| **CI** | GitHub Actions: lint, typecheck, build |
| **OSS** | MIT license, PR template, `.env.example` |

### Weaknesses & gaps

| Gap | Risk |
|-----|------|
| Prior docs assumed German-only UI | Blocks EN default + DE day-one requirement |
| Simple USER/ADMIN enum | Insufficient for shared vehicles, mechanics, API scopes |
| `maintenance_types` single table | Conflates template, translation, and per-vehicle schedule |
| No expense / reminder / notification model | Dashboard and alerts require later breaking migrations |
| No integration extension points | Home Assistant, OBD, plugins would be bolted on |
| i18n strategy undocumented | Risk of hardcoded strings in components |

### Proposed improvements (this revision)

1. **English default, German day one** — next-intl with `messages/en.json` + `de.json`; user locale in settings.
2. **RBAC-ready authorization** — roles + permissions tables; simple V1 enforcement.
3. **Complete data model** — see [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) for all entities.
4. **Metric-first regional settings** — km, liters, IANA timezone, configurable date/time.
5. **Integration architecture** — webhooks, API tokens, connection registry (schema V2/V3).
6. **Mobile-ready API path** — versioned REST sharing domain services with web UI.

---

## 1. Executive summary

Smart Garage is a **self-hosted, single-tenant vehicle management platform**. Each deployment serves one household or small organization. Community scale means **thousands of independent instances** — not one multi-tenant SaaS.

**Architecture:** Modular monolith — Next.js (App Router) + PostgreSQL + file volume. Strict layering separates UI, application services, domain logic, and infrastructure.

**Design priorities:** Self-hosting simplicity · open-source maintainability · mobile-friendly web · European vehicle domain · future API/mobile/integrations.

---

## 2. Goals & non-goals

### Goals

| Goal | Approach |
|------|----------|
| Self-hosted first | Docker Compose, env-only config, bind mounts |
| Open source | MIT, semver, CONTRIBUTING, ADRs in `docs/adr/` |
| Long-term maintainability | Layered monolith, domain services, typed boundaries |
| Mobile-friendly web | Responsive UI, PWA-ready later, touch targets |
| i18n | next-intl; EN default; no hardcoded UI strings |
| European domain | km, liters, FIN/HSN/TSN, HU/AU templates |
| Future API / mobile | `/api/v1` + Bearer tokens |
| Future integrations | Webhooks, connection registry, event bus in-process |

### Non-goals (V1)

- Multi-tenant SaaS
- Microservices
- Native mobile app (web + API first)
- Plugin marketplace runtime (document hooks only)

---

## 3. System context

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser / PWA (mobile-friendly)     Future: Mobile app        │
│         │                                    │ Bearer token      │
│         ▼                                    ▼                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              smart-garage-app (Next.js monolith)          │  │
│  │  ┌────────────┐ ┌─────────────┐ ┌──────────────────────┐  │  │
│  │  │ next-intl  │ │ App Router  │ │ /api/v1 (future)     │  │  │
│  │  │ EN / DE    │ │ + Actions   │ │ /api/internal        │  │  │
│  │  └────────────┘ └──────┬──────┘ └──────────┬───────────┘  │  │
│  │                        ▼                     ▼              │  │
│  │              Domain services + Authorization               │  │
│  │                        ▼                                    │  │
│  │              Prisma repositories + StorageProvider         │  │
│  └────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   PostgreSQL 16      Upload volume      (Future) SMTP
                            │
                     (Future) HA webhooks, OBD bridge
```

---

## 4. Technology stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Runtime | Node.js 22 LTS | Next.js ecosystem, long support |
| Framework | Next.js 16 App Router | Full-stack TS, SSR, mobile-friendly |
| i18n | **next-intl** | App Router integration, ICU messages, locale routing |
| Styling | Tailwind CSS 4 | Responsive, CSS variables for theming |
| ORM | Prisma | Migrations, contributor DX |
| Database | PostgreSQL 16 | See [DATABASE.md](./DATABASE.md) |
| Validation | Zod | Shared schemas for actions + future API |
| Auth | Auth.js v5 + DB sessions | OIDC later; see §8 |
| Images | sharp | WebP + thumbnails |
| Deploy | Docker Compose | Unraid-compatible |

---

## 5. Project structure

```
smart_garage/
├── frontend/
│   ├── app/
│   │   ├── [locale]/              # Locale segment (en, de)
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   └── layout.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       ├── health/
│   │       ├── internal/          # Uploads, session-only
│   │       └── v1/                # Future REST
│   ├── components/
│   ├── messages/
│   │   ├── en.json                # Default catalogue
│   │   └── de.json
│   ├── lib/
│   │   ├── domain/                # Pure business rules
│   │   ├── services/              # Use cases
│   │   ├── repositories/          # Prisma
│   │   ├── auth/
│   │   ├── i18n/                  # Request locale helpers
│   │   ├── regional/              # Unit/date formatting
│   │   └── storage/
│   ├── prisma/
│   └── middleware.ts              # Auth + locale detection
├── docker/
├── docs/
├── ARCHITECTURE.md
├── DATABASE_DESIGN.md
├── DATABASE.md
├── DEVELOPMENT.md
└── DEPLOYMENT.md
```

### Layer rules

```
components/       → UI only; use useTranslations(); no Prisma
app/              → Orchestration; Server Actions call services
lib/services/     → Authorization + use cases; no React
lib/domain/       → Pure logic; no Prisma/Next/React
lib/repositories/ → Prisma only
```

---

## 6. Internationalization architecture

### Requirements mapping

| Requirement | Implementation |
|-------------|----------------|
| English default | `messages/en.json`; `user_preferences.locale` default `en` |
| German day one | `messages/de.json`; seed DE template translations |
| All UI translatable | `useTranslations()` / `getTranslations()` only |
| No hardcoded UI text | ESLint rule (future): ban literal JSX text in app routes |
| Language switching | Settings → update `user_preferences.locale` + cookie |
| More languages later | Add `messages/fr.json` + template translation rows |

### Locale resolution order

1. Authenticated user → `user_preferences.locale`
2. Cookie `NEXT_LOCALE` (guest / pre-login)
3. `Accept-Language` header (first supported match)
4. Fallback: **`en`**

### Routing

Use `[locale]` dynamic segment with next-intl middleware:

- `/en/vehicles`, `/de/vehicles`
- Default locale (`en`) may use prefix per next-intl config (`localePrefix: 'as-needed'` optional)

### Database-backed translations

Static UI → JSON catalogs.  
System maintenance template names → `maintenance_template_translations`.  
User content (notes, vehicle names) → stored as entered, not translated.

See [DATABASE_DESIGN.md §4](./DATABASE_DESIGN.md#4-internationalization-in-the-database).

---

## 7. Regional & formatting architecture

| Concern | Storage | Display |
|---------|---------|---------|
| Distance | Integer km in DB | Format per `distance_unit`; convert for IMPERIAL later |
| Volume | Integer ml (future fuel) | Liters default |
| Currency | `amount_cents` + ISO 4217 | `Intl.NumberFormat` with user locale |
| Dates/times | UTC `TIMESTAMPTZ` | User `timezone` + `date_format` + `time_format` |
| Power | kW in DB | Show kW; optional PS derived |

**Implementation:** `lib/regional/format.ts` — single formatting API used by UI and future API (API returns raw metric; clients may format, web uses user prefs).

**European defaults:** `timezone: Europe/Berlin`, `currency: EUR`, `unit_system: METRIC` — overridable in settings.

---

## 8. Authentication & authorization

### Authentication (V1)

| Aspect | Decision |
|--------|----------|
| Library | Auth.js v5 + Prisma adapter |
| Web sessions | Database sessions (revocable) |
| Provider | Credentials; OIDC later |
| Registration | `REGISTRATION_MODE` env: `open` \| `disabled` |

### Authorization model

**V1:** Role-based via `roles` + `permissions` + `role_permissions`.

| Role | Capabilities |
|------|--------------|
| `user` | Full access to owned vehicles; read/write maintenance, files, expenses |
| `admin` | User management, system templates, all vehicles |

**V2:** `vehicle_access_grants` for shared household access (VIEW / MAINTENANCE / FULL).

**Enforcement:** `lib/domain/authorization.ts` — called by every service method:

```
can(user, action, resource) → boolean
```

Never rely on UI-only hiding. Repository queries scope by `owner_user_id` OR active grant.

### Future API auth

`api_tokens` with scoped permissions — see [DATABASE_DESIGN.md §3.17](./DATABASE_DESIGN.md#317-api_tokens-future--mobile--api).

---

## 9. Domain modules

| Module | Responsibility | Key entities |
|--------|----------------|--------------|
| **Users** | Accounts, preferences, locale | users, user_preferences |
| **Vehicles** | Fleet CRUD, odometer | vehicles |
| **Files** | Images, documents, storage | files |
| **Maintenance** | Templates, schedules, records | maintenance_templates, vehicle_maintenance_schedules, maintenance_records |
| **Costs** | Expenses, reporting | expenses, maintenance_records.cost |
| **Reminders** | Due alerts | reminders, notifications |
| **Integrations** (future) | HA, OBD, webhooks | integration_connections, webhook_subscriptions |

Maintenance scheduler logic lives in `lib/services/maintenance-scheduler.ts` — recalculates `vehicle_maintenance_schedules` on record insert.

---

## 10. File & image storage

Unchanged strategy: `StorageProvider` abstraction, local volume default, S3/MinIO future.

| Type | Processing |
|------|------------|
| Vehicle image | sharp → WebP master + thumbnail |
| Document | Original bytes preserved (PDF, JPEG, PNG) |
| User background | Same as image pipeline |

Authorization: files served only via authenticated `/api/internal/files/[id]` — never public static paths.

Details: [DEPLOYMENT.md](./DEPLOYMENT.md) · [DATABASE_DESIGN.md §3.8](./DATABASE_DESIGN.md#38-files).

---

## 11. API, mobile & integrations (future)

### REST API (V2+)

| Property | Value |
|----------|-------|
| Prefix | `/api/v1/` |
| Auth | Bearer `api_tokens` |
| Format | JSON; ISO 8601 UTC; money as cents |
| Pagination | Cursor-based |
| Spec | OpenAPI in `docs/openapi.yaml` |

Handlers are thin wrappers around existing **domain services** — same as Server Actions.

### Mobile app (V3+)

- React Native / Expo client against `/api/v1`
- OAuth2 device flow optional for pairing
- Focus: odometer update, photo capture, maintenance due glance

### Home Assistant (V3+)

- `integration_connections` with `provider: home_assistant`
- Outbound webhooks on `maintenance.due`, `vehicle.odometer_updated`
- Optional inbound REST sensor polling mileage

### OBD (V3+)

- `obd_devices` + `obd_readings` tables
- Bridge service (external or sidecar) writes readings
- User confirms odometer sync before applying

### Plugin / integration model (in-process V2, external V3)

```
Event emitted (in-process)
  → webhook_subscriptions matching event_types
  → HTTP POST with HMAC signature
```

Future: documented event catalog in `docs/integrations/events.md`. No arbitrary plugin code execution in V1–V2 (security).

---

## 12. Security architecture

| Threat | Mitigation |
|--------|------------|
| IDOR | CUIDs; authorization service; ownership checks |
| Credential stuffing | Rate limit auth routes; Argon2id |
| XSS | React escaping; no `dangerouslySetInnerHTML` for user notes |
| File traversal | UUID storage keys only |
| CSRF | Server Actions; API uses Bearer tokens |
| Secrets | Env vars; encrypt integration config at rest (V2) |

See [SECURITY.md](./SECURITY.md).

---

## 13. Scalability

Per-instance targets: 50 users · 500 vehicles · 50k maintenance records · 10k files. PostgreSQL on NAS SSD is sufficient with indexes in [DATABASE_DESIGN.md §7](./DATABASE_DESIGN.md#7-key-indexes-summary).

Community scale: semver Docker tags, forward-only migrations, no shared infrastructure.

---

## 14. Cross-cutting concerns

### Observability

`GET /api/health` → `{ status, db, version }`. Structured JSON logs to stdout.

### Theming

CSS variables; `user_preferences` for theme, accent, background file.

### Open source

Semver, CHANGELOG, ADRs for significant decisions, CI on every PR.

---

## 15. Decision log

| ID | Decision | Outcome |
|----|----------|---------|
| ADR-001 | Modular monolith | Deploy simplicity for Unraid |
| ADR-002 | PostgreSQL 16 | Relational integrity + concurrency |
| ADR-003 | next-intl | EN default + DE; scalable locales |
| ADR-004 | Metric storage, regional display | km/ml in DB; format in UI |
| ADR-005 | RBAC tables (not enum only) | Shared access + API scopes |
| ADR-006 | maintenance_templates + schedules + records | Clear separation of concerns |
| ADR-007 | DB translation table for templates | Extensible i18n without code deploy |
| ADR-008 | Auth.js + DB sessions | Revocable sessions; OIDC path |
| ADR-009 | Integration via webhooks + connections | No arbitrary plugin execution |

---

## 16. Summary

Smart Garage is a **layered Next.js monolith** with **PostgreSQL**, **next-intl (EN default, DE day one)**, **metric-first regional settings**, and a **complete entity model** designed for maintenance, costs, reminders, and future API/mobile/integrations.

Implementation details: [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) · Developer workflow: [DEVELOPMENT.md](./DEVELOPMENT.md) · Operations: [DEPLOYMENT.md](./DEPLOYMENT.md)
