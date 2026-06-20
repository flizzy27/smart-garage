-- DropIndex
DROP INDEX "Manufacturer_slug_key";

-- DropIndex
DROP INDEX "Manufacturer_name_key";

-- DropIndex
DROP INDEX "VehicleModel_manufacturerId_name_key";

-- DropIndex
DROP INDEX "VehicleModel_manufacturerId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Manufacturer";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "VehicleModel";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CatalogSyncState" (
    "source" TEXT NOT NULL PRIMARY KEY,
    "lastSyncAt" DATETIME,
    "datasetVersion" TEXT,
    "cursorJson" JSONB,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CatalogImportRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "metadata" JSONB
);

-- CreateTable
CREATE TABLE "CatalogManufacturer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'NHTSA_VPIC',
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CatalogSeries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "manufacturerId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CatalogSeries_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "CatalogManufacturer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogGeneration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seriesId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "yearFrom" INTEGER NOT NULL,
    "yearTo" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'NHTSA_VPIC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CatalogGeneration_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CatalogSeries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trim" TEXT,
    "bodyType" TEXT,
    "driveType" TEXT,
    "source" TEXT NOT NULL DEFAULT 'NHTSA_VPIC',
    "externalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CatalogVariant_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "CatalogGeneration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogEngine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variantId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "displacementCc" INTEGER,
    "fuelType" TEXT,
    "powerKw" INTEGER,
    "powerPs" INTEGER,
    "torqueNm" INTEGER,
    "transmissionTypes" JSONB,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'NHTSA_VPIC',
    "externalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CatalogEngine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "CatalogVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogModelYear" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variantId" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'NHTSA_VPIC',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CatalogModelYear_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "CatalogVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CatalogModelYear_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "CatalogEngine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehicleFactorySpec" (
    "vehicleId" TEXT NOT NULL PRIMARY KEY,
    "engineCode" TEXT,
    "engineDescription" TEXT,
    "powerKw" INTEGER,
    "powerPs" INTEGER,
    "torqueNm" INTEGER,
    "fuelType" TEXT,
    "displacementCc" INTEGER,
    "bodyType" TEXT,
    "driveType" TEXT,
    "transmissionTypes" JSONB,
    "productionYearFrom" INTEGER,
    "productionYearTo" INTEGER,
    "rawCatalog" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleFactorySpec_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehicleCurrentSpec" (
    "vehicleId" TEXT NOT NULL PRIMARY KEY,
    "engineCode" TEXT,
    "engineDescription" TEXT,
    "powerKw" INTEGER,
    "powerPs" INTEGER,
    "torqueNm" INTEGER,
    "fuelType" TEXT,
    "displacementCc" INTEGER,
    "bodyType" TEXT,
    "driveType" TEXT,
    "transmissionTypes" JSONB,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleCurrentSpec_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehicleModification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "installedAt" DATETIME,
    "costCents" BIGINT,
    "currency" TEXT DEFAULT 'EUR',
    "addedPowerKw" INTEGER,
    "addedPowerPs" INTEGER,
    "addedTorqueNm" INTEGER,
    "notes" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleModification_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "catalogModelYearId" TEXT,
    "manufacturerId" TEXT,
    "make" TEXT,
    "model" TEXT,
    "productionYear" INTEGER,
    "year" INTEGER,
    "vin" TEXT,
    "hsn" TEXT,
    "tsn" TEXT,
    "licensePlate" TEXT,
    "color" TEXT,
    "currentOdometerKm" INTEGER NOT NULL DEFAULT 0,
    "purchaseDate" DATETIME,
    "purchasePriceCents" BIGINT,
    "purchaseCurrency" TEXT DEFAULT 'EUR',
    "notes" TEXT,
    "metadata" JSONB,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_catalogModelYearId_fkey" FOREIGN KEY ("catalogModelYearId") REFERENCES "CatalogModelYear" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "CatalogManufacturer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Vehicle" ("createdAt", "currentOdometerKm", "deletedAt", "hsn", "id", "licensePlate", "make", "manufacturerId", "metadata", "model", "notes", "ownerUserId", "purchaseCurrency", "purchaseDate", "purchasePriceCents", "tsn", "updatedAt", "vin", "year") SELECT "createdAt", "currentOdometerKm", "deletedAt", "hsn", "id", "licensePlate", "make", "manufacturerId", "metadata", "model", "notes", "ownerUserId", "purchaseCurrency", "purchaseDate", "purchasePriceCents", "tsn", "updatedAt", "vin", "year" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE INDEX "Vehicle_ownerUserId_idx" ON "Vehicle"("ownerUserId");
CREATE INDEX "Vehicle_catalogModelYearId_idx" ON "Vehicle"("catalogModelYearId");
CREATE INDEX "Vehicle_manufacturerId_idx" ON "Vehicle"("manufacturerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CatalogManufacturer_slug_key" ON "CatalogManufacturer"("slug");

-- CreateIndex
CREATE INDEX "CatalogManufacturer_name_idx" ON "CatalogManufacturer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogManufacturer_source_externalId_key" ON "CatalogManufacturer"("source", "externalId");

-- CreateIndex
CREATE INDEX "CatalogSeries_manufacturerId_idx" ON "CatalogSeries"("manufacturerId");

-- CreateIndex
CREATE INDEX "CatalogSeries_name_idx" ON "CatalogSeries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogSeries_manufacturerId_slug_key" ON "CatalogSeries"("manufacturerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogSeries_manufacturerId_externalId_key" ON "CatalogSeries"("manufacturerId", "externalId");

-- CreateIndex
CREATE INDEX "CatalogGeneration_seriesId_idx" ON "CatalogGeneration"("seriesId");

-- CreateIndex
CREATE INDEX "CatalogGeneration_yearFrom_yearTo_idx" ON "CatalogGeneration"("yearFrom", "yearTo");

-- CreateIndex
CREATE INDEX "CatalogVariant_generationId_idx" ON "CatalogVariant"("generationId");

-- CreateIndex
CREATE INDEX "CatalogVariant_name_idx" ON "CatalogVariant"("name");

-- CreateIndex
CREATE INDEX "CatalogEngine_variantId_idx" ON "CatalogEngine"("variantId");

-- CreateIndex
CREATE INDEX "CatalogEngine_name_idx" ON "CatalogEngine"("name");

-- CreateIndex
CREATE INDEX "CatalogModelYear_year_idx" ON "CatalogModelYear"("year");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogModelYear_variantId_engineId_year_key" ON "CatalogModelYear"("variantId", "engineId", "year");

-- CreateIndex
CREATE INDEX "VehicleModification_vehicleId_idx" ON "VehicleModification"("vehicleId");

