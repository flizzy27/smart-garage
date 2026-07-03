-- Backfill: turn each schedule's stored "last service" into a real history row.
--
-- Before this release the last performed date/odometer lived only on
-- VehicleMaintenanceSchedule (lastPerformedAt / lastOdometerKm) and was never
-- written to the maintenance history. The app now derives the last service
-- from MaintenanceRecord, so existing installs need those values promoted into
-- real records — otherwise their history would look empty.
--
-- Safety:
--   * Idempotent — a schedule that already has ANY record is skipped, so this
--     migration (or a re-run) never creates duplicate history entries.
--   * Non-destructive — inserts only; no existing row is modified or deleted.
--   * DateTime-encoding safe — createdAt/updatedAt reuse the already-correctly
--     encoded lastPerformedAt value instead of a synthesized literal, so no
--     assumption is made about how Prisma stores DateTime in SQLite.
--   * Due status / next-due are intentionally left untouched here; every read
--     path recomputes them from the (now-present) records on first load.
INSERT INTO "MaintenanceRecord" (
  "id",
  "vehicleId",
  "scheduleId",
  "performedAt",
  "odometerKm",
  "costCents",
  "currency",
  "title",
  "createdByUserId",
  "createdAt",
  "updatedAt"
)
SELECT
  lower(hex(randomblob(16))),
  s."vehicleId",
  s."id",
  s."lastPerformedAt",
  s."lastOdometerKm",
  0,
  s."currency",
  COALESCE(NULLIF(TRIM(s."customName"), ''), t."nameEn", 'Maintenance'),
  v."ownerUserId",
  s."lastPerformedAt",
  s."lastPerformedAt"
FROM "VehicleMaintenanceSchedule" s
JOIN "Vehicle" v ON v."id" = s."vehicleId"
LEFT JOIN "MaintenanceTemplate" t ON t."id" = s."templateId"
WHERE s."lastPerformedAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "MaintenanceRecord" r WHERE r."scheduleId" = s."id"
  );
