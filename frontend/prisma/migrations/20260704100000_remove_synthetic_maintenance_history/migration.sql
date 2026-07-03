-- Remove synthetic maintenance-history rows created from schedule baseline
-- fields. Real service logs remain intact: rows are only removed when they are
-- empty, match the schedule's cached baseline, and have no linked items,
-- expenses, documents, or notes.
DELETE FROM "MaintenanceRecord"
WHERE "id" IN (
  SELECT r."id"
  FROM "MaintenanceRecord" r
  JOIN "VehicleMaintenanceSchedule" s ON s."id" = r."scheduleId"
  LEFT JOIN "MaintenanceTemplate" t ON t."id" = s."templateId"
  WHERE r."costCents" = 0
    AND r."vendorName" IS NULL
    AND r."note" IS NULL
    AND r."performedAt" = s."lastPerformedAt"
    AND (
      (r."odometerKm" IS NULL AND s."lastOdometerKm" IS NULL)
      OR r."odometerKm" = s."lastOdometerKm"
    )
    AND (
      r."title" IS NULL
      OR r."title" = COALESCE(NULLIF(TRIM(s."customName"), ''), t."nameEn", 'Maintenance')
      OR r."title" = COALESCE(NULLIF(TRIM(s."customName"), ''), t."nameDe", 'Wartung')
    )
    AND NOT EXISTS (
      SELECT 1 FROM "MaintenanceItem" item WHERE item."recordId" = r."id"
    )
    AND NOT EXISTS (
      SELECT 1 FROM "Expense" e WHERE e."maintenanceRecordId" = r."id"
    )
    AND NOT EXISTS (
      SELECT 1 FROM "Document" d WHERE d."maintenanceRecordId" = r."id"
    )
    AND NOT EXISTS (
      SELECT 1 FROM "Note" n WHERE n."maintenanceRecordId" = r."id"
    )
);
