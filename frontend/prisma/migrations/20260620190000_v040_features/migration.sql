-- AlterTable UserPreferences
ALTER TABLE "UserPreferences" ADD COLUMN "designPreset" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "UserPreferences" ADD COLUMN "backgroundBlurPx" INTEGER NOT NULL DEFAULT 8;

-- CreateTable VehicleShare
CREATE TABLE "VehicleShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleShare_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VehicleShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VehicleShare_vehicleId_userId_key" ON "VehicleShare"("vehicleId", "userId");
CREATE INDEX "VehicleShare_userId_idx" ON "VehicleShare"("userId");
CREATE INDEX "VehicleShare_vehicleId_idx" ON "VehicleShare"("vehicleId");

-- CreateTable VehicleInspection
CREATE TABLE "VehicleInspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nextDueAt" DATETIME NOT NULL,
    "lastPerformedAt" DATETIME,
    "reminderWeeksBefore" INTEGER NOT NULL DEFAULT 4,
    "stickerNumber" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleInspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VehicleInspection_vehicleId_type_key" ON "VehicleInspection"("vehicleId", "type");
CREATE INDEX "VehicleInspection_vehicleId_idx" ON "VehicleInspection"("vehicleId");
CREATE INDEX "VehicleInspection_nextDueAt_idx" ON "VehicleInspection"("nextDueAt");

-- CreateTable InsurancePolicy
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "policyNumber" TEXT,
    "premiumCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "sfClass" TEXT,
    "coverageType" TEXT NOT NULL DEFAULT 'LIABILITY',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InsurancePolicy_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "InsurancePolicy_vehicleId_idx" ON "InsurancePolicy"("vehicleId");
CREATE INDEX "InsurancePolicy_endDate_idx" ON "InsurancePolicy"("endDate");

-- CreateTable WishlistItem
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "status" TEXT NOT NULL DEFAULT 'IDEA',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "targetDate" DATETIME,
    "url" TEXT,
    "estimatedCostCents" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "plannedMake" TEXT,
    "plannedModel" TEXT,
    "plannedYear" INTEGER,
    "plannedBudgetCents" BIGINT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WishlistItem_userId_idx" ON "WishlistItem"("userId");
CREATE INDEX "WishlistItem_status_idx" ON "WishlistItem"("status");
