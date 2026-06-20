# Smart Garage — Complete Data Model

**Status:** Proposed (pre-implementation)  
**Audience:** Database architects, core contributors  
**Related:** [DATABASE.md](./DATABASE.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [DEVELOPMENT.md](./DEVELOPMENT.md)

---

## 0. Repository audit (data model)

### Current state

| Area | Status |
|------|--------|
| Application code | Next.js scaffold only — no Prisma, no domain models |
| Prior schema docs | [DATABASE.md](./DATABASE.md) — V1-focused tables (users, vehicles, maintenance, files) |
| i18n in schema | Mentioned as `locale` defaulting to `de` — **incorrect** per new requirements |
| Permissions | Simple `USER` / `ADMIN` enum only |
| Missing entities | Expenses, reminders, notifications, templates (as first-class), shared access, integrations |
| Translatable DB content | `maintenance_types.label` hardcoded DE — not extensible |

### Weaknesses identified

1. **No separation** between maintenance *templates* (reusable definitions) and *schedules* (per-vehicle state).
2. **No i18n tables** for database-stored labels (system maintenance types, notification templates).
3. **English not default** in prior `user_preferences.locale`.
4. **No regional settings** (timezone, date format, unit preferences).
5. **Costs** only on maintenance rows — no general expense tracking.
6. **No reminder/notification** model for future email/push/in-app alerts.
7. **No integration** tables for Home Assistant, OBD, webhooks, plugins.
8. **Shared vehicle access** not modeled — blocks household/family use cases.

### Proposed improvements (this document)

- Introduce **RBAC-ready** roles and permissions (simple V1, extensible V2).
- Split **MaintenanceTemplate** → **VehicleMaintenanceSchedule** → **MaintenanceRecord**.
- Add **Expense**, **Reminder**, **Notification** entities.
- Add **translation tables** for DB-backed user-facing strings.
- Add **UserPreferences** regional block (metric-first, IANA timezone).
- Document **future tables** now to avoid breaking migrations later.
- Set **English (`en`) as default locale**; German (`de`) fully seeded.

---

## 1. Design principles

| Principle | Rule |
|-----------|------|
| IDs | `TEXT` CUID primary keys — opaque, API-safe |
| Time | `TIMESTAMPTZ` stored in UTC; display uses user timezone |
| Money | `BIGINT` minor units (`amount_cents`) + ISO 4217 `currency` |
| Distance | Stored in **meters** or **kilometers** as integers; default display km |
| Volume | Stored in **milliliters**; default display liters |
| i18n | UI strings in JSON catalogs; DB labels in `*_translations` tables |
| Ownership | Every vehicle row has `owner_user_id`; access via grants |
| Extensibility | Nullable FKs + `metadata JSONB` on integration entities |
| Soft delete | `deleted_at` on vehicles, files (V1.1); hard delete acceptable V1 |

---

## 2. Entity relationship overview

```
┌─────────┐     ┌──────────────┐     ┌─────────────────────────┐
│  User   │────▶│ UserPrefs    │     │ Role ◀──▶ Permission    │
└────┬────┘     └──────────────┘     └─────────────────────────┘
     │
     ├──────────────────────────────────────────────────┐
     │                                                  │
     ▼                                                  ▼
┌─────────────┐    ┌──────────────────┐    ┌───────────────────────┐
│  Vehicle    │───▶│ VehicleAccess    │    │ ApiToken (future API) │
└──────┬──────┘    │ Grant (future)   │    └───────────────────────┘
       │           └──────────────────┘
       │
       ├──▶ File (images, documents)
       ├──▶ VehicleMaintenanceSchedule ◀── MaintenanceTemplate
       ├──▶ MaintenanceRecord
       ├──▶ Expense
       ├──▶ Reminder
       └──▶ FuelEntry (future)

MaintenanceTemplate ──▶ MaintenanceTemplateTranslation
Reminder ──▶ Notification
IntegrationConnection (future) ──▶ WebhookSubscription (future)
ObdDevice (future) ──▶ ObdReading (future)
```

---

## 3. Entity catalog

### 3.1 `users`

**Purpose:** Authenticated account. Owns vehicles by default; may receive shared access.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | CUID |
| `email` | TEXT UNIQUE | Normalized lowercase |
| `email_verified_at` | TIMESTAMPTZ | NULL until verified |
| `password_hash` | TEXT | Argon2id |
| `display_name` | TEXT | Nullable |
| `role_id` | TEXT FK → roles | V1: seed `user`, `admin` |
| `is_active` | BOOLEAN | Admin can disable accounts |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `last_login_at` | TIMESTAMPTZ | Optional audit |

**Relationships:** 1:1 `user_preferences`; 1:N vehicles (as owner); 1:N files; 1:N sessions; 1:N api_tokens; 1:N notifications.

**Extensibility:** `role_id` enables RBAC without schema change. OIDC via Auth.js `accounts` table (separate).

---

### 3.2 `roles`

**Purpose:** Named role buckets for authorization.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | e.g. `role_user`, `role_admin` |
| `key` | TEXT UNIQUE | `user`, `admin` |
| `name` | TEXT | Display (i18n via UI catalog) |
| `is_system` | BOOLEAN | Cannot delete system roles |
| `created_at` | TIMESTAMPTZ | |

**V1 seed:** `user`, `admin`.

**Extensibility:** Add `mechanic`, `viewer` roles later; link to permissions.

---

### 3.3 `permissions`

**Purpose:** Fine-grained capability flags (RBAC). Evaluated in domain layer.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `key` | TEXT UNIQUE | e.g. `vehicles:read`, `admin:users` |
| `description` | TEXT | Contributor documentation |

**V1:** Seed permissions; `admin` role gets all; `user` gets vehicle CRUD on owned + granted vehicles.

**Relationships:** M:N with `roles` via `role_permissions`.

---

### 3.4 `role_permissions`

**Purpose:** Maps roles to permissions.

| Field | Type | Notes |
|-------|------|-------|
| `role_id` | TEXT FK | |
| `permission_id` | TEXT FK | |
| PRIMARY KEY | (role_id, permission_id) | |

---

### 3.5 `user_preferences`

**Purpose:** Per-user UI, locale, regional, and notification settings.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `user_id` | TEXT FK UNIQUE | |
| `locale` | TEXT | **`en` default**; `de` supported V1 |
| `timezone` | TEXT | IANA, e.g. `Europe/Berlin` |
| `date_format` | TEXT | `auto` \| `DMY` \| `MDY` \| `YMD` |
| `time_format` | TEXT | `24h` \| `12h` |
| `unit_system` | ENUM | `METRIC` (default), `IMPERIAL` (future) |
| `distance_unit` | ENUM | `KILOMETER` (default), `MILE` |
| `volume_unit` | ENUM | `LITER` (default), `GALLON` |
| `currency` | CHAR(3) | Default `EUR` for expense display |
| `theme` | ENUM | `LIGHT`, `DARK`, `SYSTEM` |
| `accent_color` | TEXT | Hex |
| `background_file_id` | TEXT FK → files | Nullable |
| `due_soon_days` | INT | Default 30 |
| `due_soon_km` | INT | Default 1000 |
| `email_notifications_enabled` | BOOLEAN | Default false until SMTP |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Extensibility:** Add `first_day_of_week`, `number_format` without breaking API.

---

### 3.6 Auth.js tables (`sessions`, `accounts`, `verification_tokens`)

**Purpose:** Session management and future OIDC. Standard Auth.js Prisma adapter shape.

**Extensibility:** Authelia, Authentik, Google via `accounts` — no users table change.

---

### 3.7 `vehicles`

**Purpose:** Core asset — a car, van, motorcycle, etc.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `owner_user_id` | TEXT FK → users | Legal owner |
| `make` | TEXT | Manufacturer |
| `model` | TEXT | Model name |
| `year` | SMALLINT | Model year |
| `vin` | TEXT | FIN (17 chars); nullable |
| `hsn` | TEXT | DE: Herstellerschlüsselnummer |
| `tsn` | TEXT | DE: Typschlüsselnummer |
| `license_plate` | TEXT | Nullable |
| `engine_description` | TEXT | Free text |
| `power_kw` | SMALLINT | Metric-first |
| `power_ps` | SMALLINT | Optional derived |
| `fuel_type` | ENUM | PETROL, DIESEL, ELECTRIC, HYBRID, PLUGIN_HYBRID, LPG, CNG, OTHER |
| `primary_image_file_id` | TEXT FK → files | Nullable |
| `current_odometer_km` | INT | Latest known km; monotonic increase |
| `purchase_date` | DATE | Optional |
| `purchase_price_cents` | BIGINT | Optional |
| `purchase_currency` | CHAR(3) | With purchase price |
| `notes` | TEXT | User notes |
| `metadata` | JSONB | Extensibility (color, trim, etc.) |
| `deleted_at` | TIMESTAMPTZ | Soft delete (V1.1) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** 1:N schedules, records, expenses, files, reminders; N:M users via `vehicle_access_grants` (future).

**Extensibility:** `metadata` JSONB for market-specific fields without migrations. OBD can update `current_odometer_km` with audit trail.

**European focus:** HSN/TSN, HU/AU templates, km, liters — first-class in templates and UI.

---

### 3.8 `files`

**Purpose:** Unified metadata for vehicle images, documents, and user background images. Blobs on disk/S3.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | Storage key suffix |
| `uploaded_by_user_id` | TEXT FK | |
| `vehicle_id` | TEXT FK | Nullable |
| `maintenance_record_id` | TEXT FK | Nullable |
| `expense_id` | TEXT FK | Nullable (future) |
| `parent_file_id` | TEXT FK | Thumbnail → master |
| `purpose` | ENUM | `VEHICLE_IMAGE`, `VEHICLE_IMAGE_THUMB`, `DOCUMENT`, `USER_BACKGROUND` |
| `document_category` | ENUM | `INVOICE`, `INSPECTION`, `REGISTRATION`, `INSURANCE`, `OTHER` |
| `title` | TEXT | User-visible; nullable |
| `original_filename` | TEXT | |
| `storage_key` | TEXT UNIQUE | Relative path |
| `storage_backend` | TEXT | `local` default; `s3` future |
| `mime_type` | TEXT | |
| `size_bytes` | BIGINT | |
| `width` | INT | Images |
| `height` | INT | Images |
| `sha256` | TEXT | Dedup / integrity (optional) |
| `deleted_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

**Vehicle images:** Master WebP + thumb row linked via `parent_file_id`.  
**Vehicle documents:** PDF/images; linked to vehicle and optionally maintenance record.

**Extensibility:** `storage_backend` enables MinIO migration. Virus scan hook via `metadata`.

---

### 3.9 `maintenance_templates`

**Purpose:** Reusable definition of a maintenance type with default intervals — system seed + user-created.

Replaces the overloaded `maintenance_types` concept from earlier docs.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `key` | TEXT | Stable machine key, e.g. `oil_change` |
| `owner_user_id` | TEXT FK | NULL = system template |
| `icon` | TEXT | Lucide icon name |
| `default_interval_months` | INT | Nullable |
| `default_interval_km` | INT | Nullable |
| `is_inspection` | BOOLEAN | HU/AU style (time-only) |
| `sort_order` | INT | |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** 1:N `maintenance_template_translations`; 1:N `vehicle_maintenance_schedules`.

**V1 system templates (keys):** `oil_change`, `brakes`, `brake_fluid`, `hu`, `au`, `transmission_oil`, `air_filter`.

**Extensibility:** Community template packs via seed JSON. User duplicates template to customize intervals.

---

### 3.10 `maintenance_template_translations`

**Purpose:** Localized names/descriptions for templates (DB-backed i18n).

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `template_id` | TEXT FK | |
| `locale` | TEXT | `en`, `de`, … |
| `name` | TEXT | e.g. "Oil change" / "Ölwechsel" |
| `description` | TEXT | Nullable |
| UNIQUE | (template_id, locale) | |

**V1:** Seed `en` + `de` for all system templates.

**Extensibility:** Add `fr`, `nl` rows without code changes.

---

### 3.11 `vehicle_maintenance_schedules`

**Purpose:** Per-vehicle activation of a template with interval overrides and computed due state.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `vehicle_id` | TEXT FK | |
| `template_id` | TEXT FK | |
| `interval_months` | INT | Override; NULL = use template default |
| `interval_km` | INT | Override |
| `last_performed_at` | TIMESTAMPTZ | Denormalized |
| `last_odometer_km` | INT | Denormalized |
| `next_due_at` | TIMESTAMPTZ | Computed |
| `next_due_odometer_km` | INT | Computed |
| `status` | ENUM | `OK`, `DUE_SOON`, `OVERDUE`, `UNKNOWN`, `DISABLED` |
| `enabled` | BOOLEAN | User can disable tracking |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**UNIQUE:** `(vehicle_id, template_id)`

**Relationships:** 1:N `maintenance_records`; 1:N `reminders`.

**Extensibility:** Scheduler service recalculates on record insert; supports dual trigger (time + km).

---

### 3.12 `maintenance_records`

**Purpose:** Historical service event (Wartungseintrag / service log entry).

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `vehicle_id` | TEXT FK | |
| `schedule_id` | TEXT FK | Nullable if ad-hoc service |
| `template_id` | TEXT FK | Denormalized for reporting |
| `performed_at` | TIMESTAMPTZ | Service date (user TZ → UTC) |
| `odometer_km` | INT | At service time |
| `cost_cents` | BIGINT | Default 0 |
| `currency` | CHAR(3) | Default EUR |
| `vendor_name` | TEXT | Workshop name (optional) |
| `note` | TEXT | |
| `created_by_user_id` | TEXT FK | Audit |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** 1:N files (invoices); optional 1:1 link to `expenses` row.

**Extensibility:** `template_id` preserved even if schedule deleted. Import CSV via batch insert.

---

### 3.13 `expenses`

**Purpose:** General cost tracking beyond maintenance — insurance, tax, fuel, parking, accessories.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `vehicle_id` | TEXT FK | |
| `category` | ENUM | `MAINTENANCE`, `FUEL`, `INSURANCE`, `TAX`, `REGISTRATION`, `REPAIR`, `ACCESSORY`, `OTHER` |
| `occurred_at` | TIMESTAMPTZ | |
| `amount_cents` | BIGINT | |
| `currency` | CHAR(3) | |
| `odometer_km` | INT | Optional |
| `maintenance_record_id` | TEXT FK | Optional link |
| `fuel_entry_id` | TEXT FK | Future |
| `description` | TEXT | |
| `created_by_user_id` | TEXT FK | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** Optional files (receipts).

**Extensibility:** Dashboard cost aggregation unions `maintenance_records.cost_cents` + `expenses`. Fuel automation populates both `fuel_entries` and `expenses`.

---

### 3.14 `reminders`

**Purpose:** Scheduled alert for upcoming maintenance, inspection, or custom event.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `user_id` | TEXT FK | Recipient |
| `vehicle_id` | TEXT FK | |
| `schedule_id` | TEXT FK | Nullable |
| `reminder_type` | ENUM | `MAINTENANCE_DUE`, `CUSTOM`, `INSPECTION` |
| `title` | TEXT | User-defined for CUSTOM |
| `due_at` | TIMESTAMPTZ | Time-based |
| `due_odometer_km` | INT | Distance-based |
| `lead_days` | INT | Notify N days before |
| `lead_km` | INT | Notify N km before |
| `status` | ENUM | `PENDING`, `SENT`, `DISMISSED`, `SNOOZED` |
| `snoozed_until` | TIMESTAMPTZ | |
| `last_triggered_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Relationships:** 1:N `notifications` when fired.

**Extensibility:** Cron/worker evaluates reminders; email channel uses same row.

---

### 3.15 `notifications`

**Purpose:** In-app (and future email/push) notification log.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `user_id` | TEXT FK | |
| `reminder_id` | TEXT FK | Nullable |
| `channel` | ENUM | `IN_APP`, `EMAIL`, `PUSH` |
| `severity` | ENUM | `INFO`, `WARNING`, `CRITICAL` |
| `title_key` | TEXT | i18n catalog key OR raw title |
| `body_key` | TEXT | i18n catalog key OR raw body |
| `title_params` | JSONB | Interpolation params |
| `body_params` | JSONB | |
| `read_at` | TIMESTAMPTZ | In-app read state |
| `delivered_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

**Extensibility:** `title_key` + params supports full i18n for system notifications. Custom reminders use raw `title` in params.

---

### 3.16 `vehicle_access_grants` (future — schema V2)

**Purpose:** Shared vehicle access for family/household without sharing passwords.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `vehicle_id` | TEXT FK | |
| `grantee_user_id` | TEXT FK | |
| `granted_by_user_id` | TEXT FK | |
| `permission_level` | ENUM | `VIEW`, `MAINTENANCE`, `FULL` |
| `expires_at` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |

**UNIQUE:** `(vehicle_id, grantee_user_id)`

**Extensibility:** Maps to `permissions` checks in authorization service.

---

### 3.17 `api_tokens` (future — mobile / API)

**Purpose:** Bearer tokens for REST `/api/v1` and mobile apps.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `user_id` | TEXT FK | |
| `name` | TEXT | e.g. "iPhone", "Home Assistant" |
| `token_hash` | TEXT UNIQUE | SHA-256 of secret |
| `scopes` | TEXT[] | `vehicles:read`, etc. |
| `last_used_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | |
| `revoked_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

---

### 3.18 `integration_connections` (future — plugins)

**Purpose:** Registered external integrations per instance or user.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `user_id` | TEXT FK | Nullable for instance-wide |
| `provider` | TEXT | `home_assistant`, `obd`, `webhook`, … |
| `display_name` | TEXT | |
| `config` | JSONB | Encrypted secrets reference |
| `is_enabled` | BOOLEAN | |
| `last_sync_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

---

### 3.19 `webhook_subscriptions` (future)

**Purpose:** Outbound event delivery for plugins and automation.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `connection_id` | TEXT FK | |
| `event_types` | TEXT[] | `maintenance.due`, `vehicle.created`, … |
| `url` | TEXT | HTTPS endpoint |
| `secret_hash` | TEXT | HMAC verification |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |

---

### 3.20 `fuel_entries` (future)

**Purpose:** Fuel fill-up log for consumption analytics.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | |
| `vehicle_id` | TEXT FK | |
| `filled_at` | TIMESTAMPTZ | |
| `odometer_km` | INT | |
| `volume_ml` | INT | Metric storage |
| `price_per_liter_cents` | BIGINT | Optional |
| `total_cost_cents` | BIGINT | |
| `currency` | CHAR(3) | |
| `is_full_tank` | BOOLEAN | For consumption calc |
| `fuel_type` | ENUM | Match vehicle or override |
| `station_name` | TEXT | |
| `created_by_user_id` | TEXT FK | |
| `created_at` | TIMESTAMPTZ | |

**Relationships:** Auto-create `expenses` row with category `FUEL`.

---

### 3.21 `obd_devices` / `obd_readings` (future)

**Purpose:** OBD-II adapter pairing and telemetry (mileage, DTC codes).

**`obd_devices`:** `id`, `vehicle_id`, `integration_connection_id`, `adapter_id`, `name`, `last_seen_at`, …

**`obd_readings`:** `id`, `device_id`, `recorded_at`, `odometer_km`, `dtc_codes JSONB`, `raw_payload JSONB`, …

**Extensibility:** Readings can propose `current_odometer_km` updates with user confirmation.

---

## 4. Internationalization in the database

| Content type | Storage | Example |
|--------------|---------|---------|
| Static UI labels | `frontend/messages/en.json`, `de.json` | "Save", "Dashboard" |
| System maintenance names | `maintenance_template_translations` | Oil change / Ölwechsel |
| User-generated text | Original language in entity field | Notes, descriptions |
| Notification templates | i18n keys in `notifications.title_key` | `notification.maintenance.due` |
| Enum display | UI maps enum → message key | `fuel_type.PETROL` |

**Rules:**

- Default locale: **`en`**
- V1 locales: **`en`**, **`de`**
- No hardcoded UI strings in components
- User locale in `user_preferences.locale`; resolved on each request (cookie + DB)

---

## 5. Regional & metric defaults

| Setting | Default | Storage |
|---------|---------|---------|
| Distance | Kilometers | `vehicles.current_odometer_km`; display via `distance_unit` |
| Volume | Liters | `fuel_entries.volume_ml` (future) |
| Currency | EUR | `user_preferences.currency` (override per expense) |
| Timezone | `Europe/Berlin` or detect | `user_preferences.timezone` |
| Date format | From locale | `date_format` override optional |
| Power | kW primary | `power_kw`; PS optional derived |

Imperial support is a **display-layer** concern backed by `unit_system` — storage remains metric.

---

## 6. Implementation phases (schema)

| Phase | Tables |
|-------|--------|
| **V1 core** | users, roles, permissions, role_permissions, user_preferences, sessions, vehicles, files, maintenance_templates, maintenance_template_translations, vehicle_maintenance_schedules, maintenance_records, expenses |
| **V1.1** | reminders, notifications |
| **V2** | vehicle_access_grants, api_tokens, fuel_entries |
| **V3** | integration_connections, webhook_subscriptions, obd_devices, obd_readings |

---

## 7. Key indexes (summary)

```sql
-- Vehicles
CREATE INDEX idx_vehicles_owner ON vehicles (owner_user_id) WHERE deleted_at IS NULL;

-- Schedules dashboard
CREATE INDEX idx_schedules_status ON vehicle_maintenance_schedules (status, next_due_at)
  WHERE enabled = true;

-- Records history
CREATE INDEX idx_records_vehicle_date ON maintenance_records (vehicle_id, performed_at DESC);

-- Expenses reporting
CREATE INDEX idx_expenses_vehicle_date ON expenses (vehicle_id, occurred_at DESC);

-- Notifications inbox
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- Files
CREATE INDEX idx_files_vehicle ON files (vehicle_id) WHERE deleted_at IS NULL;
```

---

## 8. Migration from prior DATABASE.md model

| Old table | New table |
|-----------|-----------|
| `maintenance_types` | `maintenance_templates` + `maintenance_template_translations` |
| `maintenance_intervals` | `vehicle_maintenance_schedules` |
| `maintenances` | `maintenance_records` |
| `user.role` enum | `users.role_id` → `roles` |
| `user_preferences.locale` default `de` | default **`en`** |

No application code exists yet — adopt new names in initial Prisma migration.

---

*Operational PostgreSQL guidance: [DATABASE.md](./DATABASE.md) · System context: [ARCHITECTURE.md](./ARCHITECTURE.md)*
