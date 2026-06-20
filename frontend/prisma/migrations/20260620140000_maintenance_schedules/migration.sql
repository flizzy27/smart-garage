-- CreateTable
CREATE TABLE "MaintenanceTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameDe" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionDe" TEXT,
    "defaultIntervalKm" INTEGER,
    "defaultIntervalMonths" INTEGER,
    "defaultCostCentsMin" BIGINT,
    "defaultCostCentsMax" BIGINT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VehicleMaintenanceSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "templateId" TEXT,
    "customName" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "intervalKm" INTEGER,
    "intervalMonths" INTEGER,
    "lastPerformedAt" DATETIME,
    "lastOdometerKm" INTEGER,
    "nextDueAt" DATETIME,
    "nextDueOdometerKm" INTEGER,
    "estimatedCostCents" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dueStatus" TEXT NOT NULL DEFAULT 'OK',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleMaintenanceSchedule_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VehicleMaintenanceSchedule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenanceTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Redefine MaintenanceRecord with scheduleId
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MaintenanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "performedAt" DATETIME NOT NULL,
    "odometerKm" INTEGER,
    "costCents" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vendorName" TEXT,
    "title" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceRecord_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "VehicleMaintenanceSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceRecord_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MaintenanceRecord" ("id", "vehicleId", "performedAt", "odometerKm", "costCents", "currency", "vendorName", "title", "note", "createdByUserId", "createdAt", "updatedAt")
SELECT "id", "vehicleId", "performedAt", "odometerKm", "costCents", "currency", "vendorName", "title", "note", "createdByUserId", "createdAt", "updatedAt" FROM "MaintenanceRecord";
DROP TABLE "MaintenanceRecord";
ALTER TABLE "new_MaintenanceRecord" RENAME TO "MaintenanceRecord";
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTemplate_slug_key" ON "MaintenanceTemplate"("slug");
CREATE INDEX "MaintenanceTemplate_category_idx" ON "MaintenanceTemplate"("category");
CREATE INDEX "VehicleMaintenanceSchedule_vehicleId_idx" ON "VehicleMaintenanceSchedule"("vehicleId");
CREATE INDEX "VehicleMaintenanceSchedule_nextDueAt_idx" ON "VehicleMaintenanceSchedule"("nextDueAt");
CREATE INDEX "VehicleMaintenanceSchedule_dueStatus_idx" ON "VehicleMaintenanceSchedule"("dueStatus");
CREATE INDEX "MaintenanceRecord_scheduleId_idx" ON "MaintenanceRecord"("scheduleId");
