CREATE TABLE "OdometerLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vehicleId" TEXT NOT NULL,
  "odometerKm" INTEGER NOT NULL,
  "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "OdometerLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OdometerLog_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "OdometerLog_vehicleId_idx" ON "OdometerLog"("vehicleId");
CREATE INDEX "OdometerLog_recordedAt_idx" ON "OdometerLog"("recordedAt");
CREATE INDEX "OdometerLog_createdByUserId_idx" ON "OdometerLog"("createdByUserId");
