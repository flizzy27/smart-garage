-- CreateTable
CREATE TABLE "MaintenanceItemDefault" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "name" TEXT,
    "brand" TEXT,
    "productName" TEXT,
    "partNumber" TEXT,
    "specification" TEXT,
    "quantity" REAL,
    "unit" TEXT,
    "customUnit" TEXT,
    "costCents" BIGINT,
    "currency" TEXT,
    "supplierName" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceItemDefault_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "VehicleMaintenanceSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenanceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "name" TEXT,
    "brand" TEXT,
    "productName" TEXT,
    "partNumber" TEXT,
    "specification" TEXT,
    "quantity" REAL,
    "unit" TEXT,
    "customUnit" TEXT,
    "costCents" BIGINT,
    "currency" TEXT,
    "supplierName" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceItem_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MaintenanceRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "vehicleId" TEXT,
    "maintenanceTemplateId" TEXT,
    "maintenanceRecordId" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Note_maintenanceTemplateId_fkey" FOREIGN KEY ("maintenanceTemplateId") REFERENCES "MaintenanceTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Note_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "MaintenanceRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoteTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoteTag_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_NoteToNoteTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_NoteToNoteTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_NoteToNoteTag_B_fkey" FOREIGN KEY ("B") REFERENCES "NoteTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MaintenanceItemDefault_scheduleId_idx" ON "MaintenanceItemDefault"("scheduleId");

-- CreateIndex
CREATE INDEX "MaintenanceItem_recordId_idx" ON "MaintenanceItem"("recordId");

-- CreateIndex
CREATE INDEX "Note_ownerUserId_idx" ON "Note"("ownerUserId");

-- CreateIndex
CREATE INDEX "Note_vehicleId_idx" ON "Note"("vehicleId");

-- CreateIndex
CREATE INDEX "Note_maintenanceTemplateId_idx" ON "Note"("maintenanceTemplateId");

-- CreateIndex
CREATE INDEX "Note_maintenanceRecordId_idx" ON "Note"("maintenanceRecordId");

-- CreateIndex
CREATE INDEX "Note_isPinned_idx" ON "Note"("isPinned");

-- CreateIndex
CREATE INDEX "NoteTag_ownerUserId_idx" ON "NoteTag"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteTag_ownerUserId_name_key" ON "NoteTag"("ownerUserId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "_NoteToNoteTag_AB_unique" ON "_NoteToNoteTag"("A", "B");

-- CreateIndex
CREATE INDEX "_NoteToNoteTag_B_index" ON "_NoteToNoteTag"("B");
