-- v0.10.0
--
-- Purely additive migration: only new columns (all with defaults or nullable)
-- and new tables. Nothing is dropped, renamed or rewritten, so an existing
-- install can apply this on container start without touching user data.

-- Preferred volume unit for fuel entries: 'l' (litres) or 'gal' (US gallons).
-- Storage stays in litres; this only controls input parsing and display.
ALTER TABLE "UserPreferences" ADD COLUMN "volumeUnit" TEXT NOT NULL DEFAULT 'l';

-- Comma-separated ids of optional vehicle fields the user chose to hide
-- (e.g. "hsn,tsn" for users outside Germany). Empty means "show everything".
ALTER TABLE "UserPreferences" ADD COLUMN "hiddenVehicleFields" TEXT NOT NULL DEFAULT '';

-- Optional OIDC identity link. NULL for every existing (local-password) account,
-- so current logins keep working exactly as before.
ALTER TABLE "User" ADD COLUMN "oidcSubject" TEXT;
ALTER TABLE "User" ADD COLUMN "oidcIssuer" TEXT;
CREATE UNIQUE INDEX "User_oidcSubject_key" ON "User"("oidcSubject");

-- Optional free-text note on a manual odometer reading.
ALTER TABLE "OdometerLog" ADD COLUMN "note" TEXT;

-- User-defined vehicle fields (definition + per-vehicle value).
CREATE TABLE "VehicleCustomField" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "fieldType" TEXT NOT NULL DEFAULT 'TEXT',
  "unit" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "VehicleCustomField_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "VehicleCustomField_userId_idx" ON "VehicleCustomField"("userId");

CREATE TABLE "VehicleCustomFieldValue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fieldId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "VehicleCustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "VehicleCustomField" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VehicleCustomFieldValue_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VehicleCustomFieldValue_fieldId_vehicleId_key" ON "VehicleCustomFieldValue"("fieldId", "vehicleId");
CREATE INDEX "VehicleCustomFieldValue_vehicleId_idx" ON "VehicleCustomFieldValue"("vehicleId");
