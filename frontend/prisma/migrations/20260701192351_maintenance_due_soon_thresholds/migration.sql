-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserPreferences" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "locale" TEXT NOT NULL DEFAULT 'de',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "designPreset" TEXT NOT NULL DEFAULT 'default',
    "backgroundBlurPx" INTEGER NOT NULL DEFAULT 8,
    "backgroundImageKey" TEXT,
    "backgroundMimeType" TEXT,
    "maintenanceDueSoonKm" INTEGER NOT NULL DEFAULT 1500,
    "maintenanceDueSoonDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserPreferences" ("backgroundBlurPx", "backgroundImageKey", "backgroundMimeType", "currency", "designPreset", "locale", "theme", "timezone", "updatedAt", "userId") SELECT "backgroundBlurPx", "backgroundImageKey", "backgroundMimeType", "currency", "designPreset", "locale", "theme", "timezone", "updatedAt", "userId" FROM "UserPreferences";
DROP TABLE "UserPreferences";
ALTER TABLE "new_UserPreferences" RENAME TO "UserPreferences";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
