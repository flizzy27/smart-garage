# Smart Garage — Database Strategy

**Status:** Proposed (pre-implementation)  
**Audience:** Contributors, DBAs, self-hosters (overview)  
**Complete data model:** [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)  
**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 0. Repository audit

### Current state

- PostgreSQL 16 available locally via `docker/docker-compose.dev.yml`
- **No Prisma schema or migrations** committed yet
- Prior version of this file described a V1-only schema (`maintenance_types`, German-default locale)
- Comprehensive entity design now lives in **[DATABASE_DESIGN.md](./DATABASE_DESIGN.md)**

### What changed

| Topic | Before | After |
|-------|--------|-------|
| Default locale | `de` | **`en`** |
| Maintenance model | `maintenance_types` + `intervals` | `templates` + `schedules` + `records` |
| Authorization | `role` enum on user | `roles` + `permissions` tables |
| Costs | Only on maintenance rows | `expenses` + maintenance costs |
| i18n in DB | Single `label` column | `maintenance_template_translations` |
| Future features | Mentioned in prose | Tables specified (nullable phase) |

This file covers **why PostgreSQL** and **how we operate it**. All table definitions are in DATABASE_DESIGN.md.

---

## 1. Why PostgreSQL

| Requirement | PostgreSQL fit |
|-------------|----------------|
| Relational integrity | FK constraints; transactional schedule updates |
| Multi-user households | Concurrent connections; row-level locking |
| Decades of history | Stable, proven at rest |
| Self-hosted Docker | `postgres:16-alpine`; Unraid standard |
| Prisma ORM | First-class adapter |
| Analytics | CTEs, window functions for cost dashboards |
| i18n data | Translation rows with UNIQUE (entity, locale) |
| Future JSON | JSONB for `metadata`, integration config |

### Rejected alternatives

| Option | Why not |
|--------|---------|
| SQLite | Write contention; fragile NAS backups under load |
| MySQL | Weaker self-host + Prisma ecosystem vs Postgres |
| MongoDB | Poor fit for relational vehicle → schedule → record chain |

### Version & extensions

- **PostgreSQL 16** (Alpine in Docker)
- **V1 extensions:** none
- **Future:** `pg_trgm` (search), `citext` (email)

---

## 2. Design principles

| Principle | Application |
|-----------|-------------|
| Integer money | `amount_cents BIGINT` — never float |
| UTC storage | `TIMESTAMPTZ`; display in user timezone |
| Opaque IDs | CUID `TEXT` primary keys |
| Metric storage | km, ml; imperial is display-only |
| Translatable system data | `*_translations` tables |
| Denormalized schedule state | `next_due_*`, `status` on schedules — updated on write |
| Authorization scope | `owner_user_id` + future `vehicle_access_grants` |
| Forward-only migrations | Prisma migrate; no `down` in production |
| API-stable columns | Names match future JSON fields |

---

## 3. Schema overview

See full ER diagram and field lists in [DATABASE_DESIGN.md](./DATABASE_DESIGN.md).

### V1 core tables

`users` · `roles` · `permissions` · `role_permissions` · `user_preferences` · `sessions` · `vehicles` · `files` · `maintenance_templates` · `maintenance_template_translations` · `vehicle_maintenance_schedules` · `maintenance_records` · `expenses`

### V1.1

`reminders` · `notifications`

### V2+

`vehicle_access_grants` · `api_tokens` · `fuel_entries`

### V3+

`integration_connections` · `webhook_subscriptions` · `obd_devices` · `obd_readings`

---

## 4. Maintenance scheduling (business rules)

Implemented in `lib/services/maintenance-scheduler.ts`; results persisted on `vehicle_maintenance_schedules`.

**On maintenance record insert/update:**

1. Validate odometer and date
2. Update `vehicles.current_odometer_km` if higher
3. Update schedule: `last_performed_at`, `last_odometer_km`
4. Compute `next_due_at` (+ months) and `next_due_odometer_km` (+ km)
5. Set `status`: `OVERDUE` | `DUE_SOON` | `OK` | `UNKNOWN`

Dual trigger: whichever threshold (time or distance) is exceeded first marks overdue.

User thresholds: `user_preferences.due_soon_days` / `due_soon_km`.

---

## 5. Query patterns

### Dashboard — overdue / due soon

```sql
SELECT s.*, v.make, v.model
FROM vehicle_maintenance_schedules s
JOIN vehicles v ON v.id = s.vehicle_id
WHERE v.owner_user_id = $1
  AND s.enabled = true
  AND s.status IN ('DUE_SOON', 'OVERDUE')
ORDER BY CASE s.status WHEN 'OVERDUE' THEN 0 ELSE 1 END, s.next_due_at;
```

### Cost report (maintenance + expenses)

```sql
SELECT date_trunc('month', occurred_at) AS month, SUM(amount_cents) AS total
FROM (
  SELECT performed_at AS occurred_at, cost_cents AS amount_cents
  FROM maintenance_records mr
  JOIN vehicles v ON v.id = mr.vehicle_id
  WHERE v.owner_user_id = $1
  UNION ALL
  SELECT occurred_at, amount_cents FROM expenses e
  JOIN vehicles v ON v.id = e.vehicle_id
  WHERE v.owner_user_id = $1
) combined
GROUP BY 1 ORDER BY 1;
```

---

## 6. Migration strategy

| Rule | Detail |
|------|--------|
| Tool | Prisma Migrate |
| Development | `npx prisma migrate dev` |
| Production | `prisma migrate deploy` in container entrypoint |
| Seed | Idempotent: roles, permissions, system templates + EN/DE translations |
| Breaking changes | Major semver only + upgrade guide |

### Recommended initial migration order

1. Enums
2. roles, permissions, role_permissions
3. users, user_preferences
4. Auth.js tables
5. files
6. vehicles
7. maintenance_templates, maintenance_template_translations
8. vehicle_maintenance_schedules
9. maintenance_records
10. expenses

---

## 7. Backup & privacy

| Asset | Method |
|-------|--------|
| PostgreSQL | `pg_dump -Fc` |
| Files | Archive upload volume |
| Consistency | Stop app or filesystem snapshot — see [DEPLOYMENT.md](./DEPLOYMENT.md) |

**PII:** email, VIN, license plate, invoices — access-controlled; GDPR erasure = cascade delete user + files (future admin action).

---

## 8. Evolution path

| Version | Schema addition |
|---------|-----------------|
| V1.1 | reminders, notifications; soft delete on vehicles/files |
| V2 | vehicle_access_grants, api_tokens, fuel_entries |
| V3 | integration_connections, webhooks, OBD tables |
| V3 | `files.storage_backend` for S3 migration |

Add nullable columns and new tables — avoid renames without major version.

---

## 9. Summary

**PostgreSQL 16** backs a **normalized, i18n-ready, metric-first** schema defined in [DATABASE_DESIGN.md](./DATABASE_DESIGN.md). Prisma manages migrations; domain services own scheduling logic; indexes target dashboard and cost queries.

---

*Entity reference: [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) · Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)*
