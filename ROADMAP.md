# Smart Garage — Technical Roadmap

Self-hosted vehicle management platform for digital service records, cost tracking, document storage, and intelligent maintenance intervals.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma · Docker · Unraid

**Current state:** Fresh Next.js 16 scaffold in `frontend/` with Tailwind CSS 4. No database, auth, or domain logic yet.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Database Structure](#database-structure)
4. [Development Phases](#development-phases)
5. [Required Pages](#required-pages)
6. [Required Components](#required-components)
7. [API & Server Actions](#api--server-actions)
8. [Docker & Unraid Deployment](#docker--unraid-deployment)
9. [Future Extensions](#future-extensions)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Host (Unraid)                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Next.js    │───▶│  PostgreSQL  │    │ File Storage │  │
│  │  (frontend)  │    │              │    │   (volume)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| UI | Next.js App Router, React 19, Tailwind CSS 4 | Pages, layouts, client interactivity |
| API | Route Handlers + Server Actions | CRUD, file uploads, business logic |
| Auth | NextAuth.js (Auth.js v5) or Lucia | Sessions, roles, registration |
| Data | Prisma ORM | Schema, migrations, queries |
| Storage | PostgreSQL + local filesystem volume | Relational data + uploaded documents/images |
| Deploy | Docker Compose | Single-command self-hosting on Unraid |

**Design principles** (from project rules):

- TypeScript everywhere
- Reusable components
- Responsive layouts
- Clean architecture with separation between UI, services, and data access
- Comments on non-obvious business logic (especially maintenance interval calculations)

---

## Project Structure

Recommended monorepo layout at repository root:

```
smart_garage/
├── docker/
│   ├── Dockerfile                 # Multi-stage Next.js production build
│   ├── docker-compose.yml         # app + postgres + volumes
│   └── docker-compose.dev.yml     # Optional dev overrides (hot reload)
├── frontend/                      # Next.js application (existing)
│   ├── app/
│   │   ├── (auth)/                # Public auth routes (no sidebar)
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/           # Authenticated app shell
│   │   │   ├── layout.tsx         # Sidebar + header + theme provider
│   │   │   ├── page.tsx           # Dashboard home
│   │   │   ├── vehicles/
│   │   │   │   ├── page.tsx       # Vehicle list
│   │   │   │   ├── new/
│   │   │   │   └── [vehicleId]/
│   │   │   │       ├── page.tsx   # Vehicle detail
│   │   │   │       ├── edit/
│   │   │   │       └── maintenance/
│   │   │   │           ├── page.tsx
│   │   │   │           └── new/
│   │   │   ├── costs/
│   │   │   │   └── page.tsx       # Cross-vehicle cost overview
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx       # User preferences (theme, accent, bg)
│   │   │   │   └── profile/
│   │   │   └── admin/
│   │   │       ├── page.tsx       # Admin dashboard
│   │   │       └── users/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── upload/
│   │   │   └── health/
│   │   ├── layout.tsx             # Root layout (fonts, metadata)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                    # Primitives (Button, Input, Card, …)
│   │   ├── layout/                # Shell, Sidebar, Header, PageHeader
│   │   ├── vehicles/              # VehicleCard, VehicleForm, …
│   │   ├── maintenance/           # MaintenanceList, MaintenanceForm, …
│   │   ├── dashboard/             # Widgets, charts, alerts
│   │   ├── documents/             # Upload, preview, list
│   │   ├── settings/              # ThemePicker, AccentColorPicker
│   │   └── admin/                 # UserTable, RoleBadge
│   ├── lib/
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── auth.ts                # Auth config & helpers
│   │   ├── validations/           # Zod schemas per domain
│   │   ├── services/              # Business logic (maintenance intervals)
│   │   ├── utils/                 # Formatting, dates, currency
│   │   └── constants/             # Maintenance types, fuel types, roles
│   ├── hooks/                     # useTheme, useMediaQuery, …
│   ├── types/                     # Shared TypeScript types
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts                # Default maintenance types, demo data
│   ├── public/
│   │   └── uploads/               # Dev-only; prod uses Docker volume
│   ├── middleware.ts              # Auth guard for (dashboard) routes
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── .env.example
├── PROJECT.md
├── ROADMAP.md
└── LICENSE
```

### Key conventions

| Concern | Convention |
|---------|------------|
| Route groups | `(auth)` and `(dashboard)` separate layouts without affecting URLs |
| Server vs client | Default to Server Components; `"use client"` only for forms, theme, uploads |
| Data fetching | Server Components + Prisma; mutations via Server Actions |
| File uploads | API route or Server Action → write to `UPLOAD_DIR` volume |
| Env vars | `DATABASE_URL`, `AUTH_SECRET`, `UPLOAD_DIR`, `NEXT_PUBLIC_APP_URL` |

---

## Database Structure

### Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌─────────────────┐
│   User   │──1:N──│   Vehicle    │──1:N──│  Maintenance    │
└──────────┘       └──────────────┘       └─────────────────┘
      │                    │                        │
      │                    │                        │
      │              ┌─────┴─────┐            ┌─────┴─────┐
      │              │  Document  │◀───────────│ (linked)  │
      │              └───────────┘            └───────────┘
      │
      │         ┌──────────────────┐
      └────────▶│ UserPreferences  │
                └──────────────────┘

┌──────────────────┐       ┌─────────────────────┐
│ MaintenanceType  │──1:N──│ MaintenanceInterval │
└──────────────────┘       └─────────────────────┘
         ▲                            │
         │                            │
         └──────── per Vehicle ───────┘
```

### Prisma Schema (conceptual)

#### `User`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | PK |
| `email` | `String` | Unique |
| `passwordHash` | `String` | bcrypt/argon2 |
| `name` | `String?` | Display name |
| `role` | `Enum` | `USER` \| `ADMIN` |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

#### `UserPreferences`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | PK |
| `userId` | `String` | FK → User, unique |
| `theme` | `Enum` | `LIGHT` \| `DARK` \| `SYSTEM` |
| `accentColor` | `String` | Hex, e.g. `#3b82f6` |
| `backgroundImage` | `String?` | Path or URL to custom bg |
| `locale` | `String` | Default `de` (future i18n) |

#### `Vehicle`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | PK |
| `userId` | `String` | FK → User (owner) |
| `make` | `String` | Marke |
| `model` | `String` | Modell |
| `year` | `Int` | Baujahr |
| `vin` | `String?` | FIN (Fahrzeug-Identifizierungsnummer) |
| `hsn` | `String?` | HSN (Herstellerschlüsselnummer) |
| `tsn` | `String?` | TSN (Typschlüsselnummer) |
| `licensePlate` | `String?` | Kennzeichen |
| `engine` | `String?` | Motor |
| `powerKw` | `Int?` | Leistung in kW |
| `powerPs` | `Int?` | Leistung in PS (computed or stored) |
| `fuelType` | `Enum` | `PETROL`, `DIESEL`, `ELECTRIC`, `HYBRID`, `LPG`, `OTHER` |
| `imagePath` | `String?` | Fahrzeugbild |
| `currentMileage` | `Int` | Latest known km (updated on maintenance) |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Indexes:** `userId`, `licensePlate`, `vin`

#### `MaintenanceType`

Predefined system types + user-defined custom types.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | PK |
| `key` | `String` | e.g. `oil_change`, `brakes`, `custom_*` |
| `label` | `String` | Display name (DE) |
| `isSystem` | `Boolean` | `true` for built-in types |
| `userId` | `String?` | FK → User; `null` = global system type |
| `icon` | `String?` | Icon identifier |

**V1 system types (seed data):**

| Key | Label (DE) |
|-----|------------|
| `oil_change` | Ölwechsel |
| `brakes` | Bremsen |
| `brake_fluid` | Bremsflüssigkeit |
| `hu` | HU (Hauptuntersuchung) |
| `au` | AU (Abgasuntersuchung) |
| `transmission_oil` | Getriebeöl |
| `air_filter` | Luftfilter |

#### `MaintenanceInterval`

Per-vehicle interval rules for intelligent due-date calculation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | PK |
| `vehicleId` | `String` | FK → Vehicle |
| `maintenanceTypeId` | `String` | FK → MaintenanceType |
| `intervalMonths` | `Int?` | Time-based interval |
| `intervalKm` | `Int?` | Distance-based interval |
| `lastDoneAt` | `DateTime?` | Denormalized from last maintenance |
| `lastDoneMileage` | `Int?` | Denormalized |
| `nextDueDate` | `DateTime?` | Computed |
| `nextDueMileage` | `Int?` | Computed |

**Unique constraint:** `(vehicleId, maintenanceTypeId)`

#### `Maintenance` (service record / Wartungseintrag)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | PK |
| `vehicleId` | `String` | FK → Vehicle |
| `maintenanceTypeId` | `String` | FK → MaintenanceType |
| `performedAt` | `DateTime` | Datum |
| `mileage` | `Int` | Kilometerstand at service |
| `costCents` | `Int` | Kosten in Cent (avoid float) |
| `currency` | `String` | Default `EUR` |
| `note` | `String?` | Notiz |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Indexes:** `vehicleId`, `performedAt`, `maintenanceTypeId`

#### `Document`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | PK |
| `vehicleId` | `String` | FK → Vehicle |
| `maintenanceId` | `String?` | FK → Maintenance (optional link) |
| `filename` | `String` | Original filename |
| `storedPath` | `String` | Path on volume |
| `mimeType` | `String` | |
| `sizeBytes` | `Int` | |
| `uploadedAt` | `DateTime` | |

### Maintenance due-date logic (business rule)

```
nextDueDate     = lastPerformedAt + intervalMonths
nextDueMileage  = lastMileage + intervalKm

Status:
  OVERDUE   → today > nextDueDate OR currentMileage > nextDueMileage
  DUE_SOON  → within configurable threshold (e.g. 30 days / 1000 km)
  OK        → otherwise
```

Whichever constraint (time or distance) is reached first determines overdue status. Document this logic in `lib/services/maintenance-scheduler.ts`.

### Default interval suggestions (seed, user-editable per vehicle)

| Type | Months | Km |
|------|--------|-----|
| Ölwechsel | 12 | 15 000 |
| Bremsen | 24 | 40 000 |
| Bremsflüssigkeit | 24 | — |
| HU | 24 | — |
| AU | 24 | — |
| Getriebeöl | 48 | 60 000 |
| Luftfilter | 24 | 30 000 |

---

## Development Phases

### Phase 0 — Foundation & Tooling

**Goal:** Runnable dev environment with database connectivity.

| Task | Deliverable |
|------|-------------|
| Add Prisma, Zod, auth library to `frontend/package.json` | Dependencies installed |
| Create `prisma/schema.prisma` with full schema | Initial migration |
| Docker Compose with PostgreSQL | `docker compose up` works |
| `.env.example` with all required vars | Documented setup |
| ESLint + Prettier alignment | Consistent formatting |
| Health check endpoint `/api/health` | DB connectivity probe |

**Exit criteria:** `npm run dev` connects to Postgres; `prisma migrate dev` succeeds.

---

### Phase 1 — Authentication & User Management

**Goal:** Secure multi-user access with admin role.

| Task | Deliverable |
|------|-------------|
| Auth provider setup (NextAuth / Lucia) | Session-based login |
| Registration page with validation | New users (configurable: open vs invite-only) |
| Login / logout | Working sessions |
| `middleware.ts` route protection | Unauthenticated → `/login` |
| Admin role guard | Admin-only routes |
| Admin user list | View users, promote/demote role |
| Password hashing | bcrypt or argon2 |

**Exit criteria:** Two users can register; admin can see user list; non-admin cannot access `/admin`.

---

### Phase 2 — Vehicle Management

**Goal:** Full CRUD for vehicles with image upload.

| Task | Deliverable |
|------|-------------|
| Vehicle list page | Cards/table with image, make, model, plate |
| Create vehicle form | All V1 fields validated with Zod |
| Vehicle detail page | Read-only overview + quick stats |
| Edit vehicle | Update all fields |
| Delete vehicle | Confirmation dialog; cascade maintenance/docs |
| Vehicle image upload | Store on volume; serve via API or static route |
| Empty state | Onboarding CTA when no vehicles |

**Exit criteria:** User can manage multiple vehicles with images and German automotive identifiers (FIN, HSN, TSN).

---

### Phase 3 — Maintenance Tracking

**Goal:** Service history and intelligent intervals.

| Task | Deliverable |
|------|-------------|
| Seed maintenance types | System types in DB |
| Per-vehicle interval configuration | Edit months/km per type |
| Maintenance list (per vehicle) | Chronological service history |
| Add maintenance record | Date, km, cost, note, type |
| Custom maintenance type creation | User-defined types |
| Auto-update `currentMileage` on vehicle | When new record > current |
| Interval recalculation service | Update `nextDueDate` / `nextDueMileage` |
| Maintenance status badges | OK / Due soon / Overdue |

**Exit criteria:** Adding an oil change recalculates next due date; custom types work alongside system types.

---

### Phase 4 — Dashboard

**Goal:** At-a-glance overview across all vehicles.

| Task | Deliverable |
|------|-------------|
| Dashboard layout with widget grid | Responsive |
| Upcoming maintenance widget | Next N items across fleet |
| Overdue maintenance widget | Highlighted alerts |
| Vehicle overview widget | Count, thumbnails, quick links |
| Cost overview widget | Monthly/yearly totals, per-vehicle breakdown |
| Optional: simple bar/line chart | Costs over time (recharts or similar) |

**Exit criteria:** Dashboard reflects real data; overdue items surfaced prominently.

---

### Phase 5 — Document Management

**Goal:** Attach files to maintenance records and vehicles.

| Task | Deliverable |
|------|-------------|
| File upload component | Drag-and-drop, type/size limits |
| Link documents to maintenance entry | Optional FK |
| Document list on vehicle detail | Preview/download |
| Supported types | PDF, JPG, PNG (V1) |
| Storage on Docker volume | Persistent across restarts |
| Delete document | Remove file + DB record |

**Exit criteria:** Invoice PDF attached to a maintenance record is viewable after container restart.

---

### Phase 6 — Theming & Personalization

**Goal:** Dark/light mode, accent color, custom background.

| Task | Deliverable |
|------|-------------|
| Theme provider (light/dark/system) | Persists to `UserPreferences` |
| CSS variables for accent color | User-selectable palette |
| Custom background image upload | Applied to app shell |
| Settings page | All preferences in one place |
| No flash on load | `suppressHydrationWarning` + cookie/localStorage strategy |

**Exit criteria:** Theme survives reload; accent applies to buttons/links/focus rings.

---

### Phase 7 — Docker Production & Unraid

**Goal:** One-command self-hosted deployment.

| Task | Deliverable |
|------|-------------|
| Multi-stage `Dockerfile` | Optimized production image |
| `docker-compose.yml` | App + Postgres + named volumes |
| Unraid template or README section | Community template instructions |
| Runtime migrations | `prisma migrate deploy` on container start |
| Seed on first run (optional) | Maintenance types |
| Backup documentation | DB dump + upload volume |
| Reverse proxy notes | Traefik/NPM compatibility |

**Exit criteria:** Fresh Unraid install → `docker compose up -d` → app reachable on LAN.

---

### Phase 8 — Polish & Hardening (pre-V1 release)

| Task | Deliverable |
|------|-------------|
| Error boundaries & toast notifications | User-friendly errors |
| Loading skeletons | Per-page suspense |
| Form accessibility | Labels, focus, keyboard nav |
| Rate limiting on auth routes | Basic brute-force protection |
| Input sanitization | XSS prevention on notes |
| README with setup guide | Dev + production |
| Basic E2E smoke tests (optional) | Login → add vehicle → add maintenance |

---

## Required Pages

### Public (unauthenticated)

| Route | Page | Purpose |
|-------|------|---------|
| `/login` | Login | Email + password sign-in |
| `/register` | Register | New account creation |

### Authenticated — Dashboard group

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | Fleet overview, widgets, alerts |
| `/vehicles` | Vehicle list | All user vehicles |
| `/vehicles/new` | Add vehicle | Create form |
| `/vehicles/[vehicleId]` | Vehicle detail | Info, mileage, recent maintenance, documents |
| `/vehicles/[vehicleId]/edit` | Edit vehicle | Update vehicle data |
| `/vehicles/[vehicleId]/maintenance` | Maintenance history | Full service log for one vehicle |
| `/vehicles/[vehicleId]/maintenance/new` | Add maintenance | New service record |
| `/vehicles/[vehicleId]/intervals` | Interval settings | Configure per-type intervals |
| `/costs` | Cost overview | Aggregated spending across fleet |
| `/settings` | Settings | Theme, accent, background |
| `/settings/profile` | Profile | Name, email, password change |

### Admin only

| Route | Page | Purpose |
|-------|------|---------|
| `/admin` | Admin dashboard | System stats, quick links |
| `/admin/users` | User management | List users, assign roles |

### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/*` | * | Auth handlers |
| `/api/upload` | POST | File upload |
| `/api/health` | GET | Liveness + DB check |
| `/api/documents/[id]` | GET | Secure document download |

---

## Required Components

### Layout (`components/layout/`)

| Component | Responsibility |
|-----------|----------------|
| `AppShell` | Sidebar + main content area |
| `Sidebar` | Navigation links, active state, collapse on mobile |
| `Header` | User menu, theme toggle, breadcrumbs slot |
| `PageHeader` | Title, description, action buttons slot |
| `MobileNav` | Drawer/bottom nav for small screens |
| `Breadcrumbs` | Hierarchical navigation |

### UI primitives (`components/ui/`)

Build a small design system (or adopt shadcn/ui):

| Component | Used for |
|-----------|----------|
| `Button` | Primary/secondary/ghost/destructive variants |
| `Input` | Text fields |
| `Textarea` | Notes |
| `Select` | Fuel type, maintenance type, role |
| `Checkbox` / `Switch` | Toggles |
| `Card` | Widget and list item containers |
| `Badge` | Status (overdue, due soon, OK) |
| `Dialog` / `AlertDialog` | Confirm delete, modals |
| `DropdownMenu` | User menu, row actions |
| `Tabs` | Vehicle detail sections |
| `Table` | Admin user list, maintenance log |
| `Skeleton` | Loading states |
| `Toast` / `Toaster` | Success/error feedback |
| `FileInput` | Image and document picker |
| `ColorPicker` | Accent color selection |
| `EmptyState` | No vehicles / no maintenance yet |

### Vehicles (`components/vehicles/`)

| Component | Responsibility |
|-----------|----------------|
| `VehicleCard` | Grid item with image, make/model, plate |
| `VehicleList` | Responsive grid of `VehicleCard` |
| `VehicleForm` | Create/edit with all fields |
| `VehicleImageUpload` | Preview + crop optional |
| `VehicleStats` | Mileage, age, total costs |
| `VehicleDeleteButton` | Confirmation flow |

### Maintenance (`components/maintenance/`)

| Component | Responsibility |
|-----------|----------------|
| `MaintenanceList` | Sortable table of service records |
| `MaintenanceForm` | Add/edit record |
| `MaintenanceTypeSelect` | System + custom types |
| `MaintenanceStatusBadge` | OK / Due soon / Overdue |
| `MaintenanceIntervalForm` | Edit months/km per type |
| `UpcomingMaintenanceList` | Dashboard widget content |
| `OverdueMaintenanceAlert` | Dashboard alert banner |
| `CustomMaintenanceTypeDialog` | Create user-defined type |

### Dashboard (`components/dashboard/`)

| Component | Responsibility |
|-----------|----------------|
| `DashboardGrid` | Responsive widget layout |
| `UpcomingWidget` | Next maintenance items |
| `OverdueWidget` | Overdue items with severity |
| `FleetOverviewWidget` | Vehicle count + thumbnails |
| `CostOverviewWidget` | Totals + simple chart |
| `CostChart` | Monthly/yearly bar chart |

### Documents (`components/documents/`)

| Component | Responsibility |
|-----------|----------------|
| `DocumentUpload` | Drag-drop zone |
| `DocumentList` | Files with type icon, size, date |
| `DocumentPreview` | Inline PDF/image preview |
| `DocumentDownloadButton` | Secure download link |

### Settings (`components/settings/`)

| Component | Responsibility |
|-----------|----------------|
| `ThemeToggle` | Light / dark / system |
| `AccentColorPicker` | Preset swatches + custom hex |
| `BackgroundImageUpload` | Custom app background |
| `ProfileForm` | Name, email update |
| `PasswordChangeForm` | Current + new password |

### Admin (`components/admin/`)

| Component | Responsibility |
|-----------|----------------|
| `UserTable` | Email, role, created, actions |
| `RoleSelect` | Promote/demote USER ↔ ADMIN |
| `AdminStats` | User count, vehicle count |

### Shared utilities

| Module | Responsibility |
|--------|----------------|
| `lib/services/maintenance-scheduler.ts` | Due date calculation |
| `lib/services/cost-aggregator.ts` | Dashboard cost queries |
| `lib/validations/vehicle.ts` | Zod schema for vehicle |
| `lib/validations/maintenance.ts` | Zod schema for maintenance |
| `lib/utils/format.ts` | Currency (€), dates (de-DE), km |
| `lib/constants/maintenance-types.ts` | Seed definitions |

---

## API & Server Actions

Prefer **Server Actions** for mutations from forms; **Route Handlers** for file uploads and downloads.

| Action / Endpoint | Operations |
|-------------------|------------|
| `createVehicle` / `updateVehicle` / `deleteVehicle` | Vehicle CRUD |
| `createMaintenance` / `updateMaintenance` / `deleteMaintenance` | Maintenance CRUD |
| `upsertMaintenanceInterval` | Interval config |
| `createCustomMaintenanceType` | Custom types |
| `updateUserPreferences` | Theme, accent, background |
| `updateUserProfile` / `changePassword` | Profile |
| `adminUpdateUserRole` | Admin only |
| `POST /api/upload` | Multipart file upload |
| `GET /api/documents/[id]` | Authorized file stream |

All actions must verify session and row ownership (`userId` on Vehicle) unless admin.

---

## Docker & Unraid Deployment

### `docker-compose.yml` (conceptual)

```yaml
services:
  app:
    build: ./docker
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://...
      AUTH_SECRET: ${AUTH_SECRET}
      UPLOAD_DIR: /data/uploads
    volumes:
      - uploads:/data/uploads
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: smartgarage
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: smartgarage

volumes:
  pgdata:
  uploads:
```

### Unraid notes

- Map host paths for `pgdata` and `uploads` for easy backup
- Set `AUTH_SECRET` via Unraid template variable
- Expose port 3000 or place behind reverse proxy (Traefik, Nginx Proxy Manager)
- Document backup: `pg_dump` + tar uploads volume

---

## Future Extensions

Features beyond V1, ordered by likely value and complexity.

### V1.1 — Quality of life

| Feature | Description |
|---------|-------------|
| **Email reminders** | Notify before HU/AU/service due (SMTP config) |
| **CSV/PDF export** | Export service history per vehicle |
| **Bulk import** | CSV import of maintenance records |
| **Invite-only registration** | Admin-controlled signups |
| **Vehicle sharing** | Read-only access for family members |

### V2 — Extended vehicle data

| Feature | Description |
|---------|-------------|
| **Fuel log** | Track fill-ups, consumption (l/100 km) |
| **Tire management** | Seasonal tire sets, tread depth, storage location |
| **Insurance & registration** | Policy expiry, premium tracking |
| **Depreciation tracker** | Purchase price vs estimated value |
| **Multiple owners/households** | Shared garage per household |

### V2 — Intelligence & automation

| Feature | Description |
|---------|-------------|
| **OBD-II integration** | Bluetooth adapter → auto mileage sync |
| **VIN decoder API** | Auto-fill make/model/year from FIN |
| **HSN/TSN lookup** | German vehicle database integration |
| **Smart suggestions** | Interval recommendations based on fuel type/mileage |
| **Recurring cost detection** | Identify patterns in maintenance spending |

### V3 — Platform & mobility

| Feature | Description |
|---------|-------------|
| **REST API + API keys** | External integrations |
| **Mobile PWA** | Offline-capable progressive web app |
| **Native mobile app** | React Native client |
| **Multi-language (i18n)** | EN, DE, FR via next-intl |
| **Plugin system** | Webhook events for third-party tools |

### V3 — Advanced deployment

| Feature | Description |
|---------|-------------|
| **S3-compatible storage** | MinIO instead of local volume |
| **Multi-tenant** | Organizations with multiple users |
| **LDAP/OIDC SSO** | Enterprise authentication |
| **Automated backups** | Scheduled DB + file backups in container |
| **Health monitoring** | Prometheus metrics endpoint |

### V4 — Community & ecosystem

| Feature | Description |
|---------|-------------|
| **Maintenance templates** | Community-shared interval presets per model |
| **Workshop mode** | Mechanic access with limited permissions |
| **Parts inventory** | Track oil, filters, brake pads in stock |
| **Integration with calendar** | iCal export for upcoming services |

---

## Suggested Dependency Additions

| Package | Purpose |
|---------|---------|
| `@prisma/client` + `prisma` | ORM |
| `next-auth` (v5) or `lucia` | Authentication |
| `zod` | Validation |
| `bcryptjs` or `@node-rs/argon2` | Password hashing |
| `date-fns` | Date math for intervals |
| `recharts` | Dashboard charts (Phase 4) |
| `react-dropzone` | File uploads (Phase 5) |
| `sharp` | Image processing for vehicle photos |

---

## Milestone Summary

| Milestone | Phases | Outcome |
|-----------|--------|---------|
| **M0 — Dev ready** | 0 | DB + Prisma + Docker dev |
| **M1 — Auth** | 1 | Login, register, admin |
| **M2 — Core** | 2–3 | Vehicles + maintenance |
| **M3 — Insights** | 4–5 | Dashboard + documents |
| **M4 — Personal** | 6 | Theming |
| **M5 — V1 Release** | 7–8 | Unraid deploy + polish |

---

*Derived from [PROJECT.md](./PROJECT.md). Update this document as phases complete or requirements change.*
