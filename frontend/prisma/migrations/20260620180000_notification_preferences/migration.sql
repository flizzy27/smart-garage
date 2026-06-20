-- Redesign notification preferences (granular events + delivery rules)
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_UserNotificationSettings" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "pushoverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushoverUserKey" TEXT,
    "pushoverAppToken" TEXT,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT false,
    "telegramBotToken" TEXT,
    "telegramChatId" TEXT,
    "eventMaintenanceOverdue" BOOLEAN NOT NULL DEFAULT true,
    "eventMaintenanceDueSoon" BOOLEAN NOT NULL DEFAULT true,
    "eventMaintenanceLogged" BOOLEAN NOT NULL DEFAULT false,
    "eventExpenseAdded" BOOLEAN NOT NULL DEFAULT false,
    "deliveryImmediate" BOOLEAN NOT NULL DEFAULT true,
    "deliveryScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduledTime" TEXT DEFAULT '08:00',
    "scheduledDays" TEXT DEFAULT 'MO,TU,WE,TH,FR,SA,SU',
    "minIntervalHours" INTEGER NOT NULL DEFAULT 6,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT DEFAULT '22:00',
    "quietHoursEnd" TEXT DEFAULT '07:00',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "lastMaintenanceAlertAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_UserNotificationSettings" (
    "userId",
    "pushoverEnabled",
    "pushoverUserKey",
    "pushoverAppToken",
    "telegramEnabled",
    "telegramBotToken",
    "telegramChatId",
    "eventMaintenanceOverdue",
    "eventMaintenanceDueSoon",
    "lastMaintenanceAlertAt",
    "updatedAt"
)
SELECT
    "userId",
    "pushoverEnabled",
    "pushoverUserKey",
    "pushoverAppToken",
    "telegramEnabled",
    "telegramBotToken",
    "telegramChatId",
    COALESCE("maintenanceAlerts", 1),
    COALESCE("maintenanceAlerts", 1),
    "lastMaintenanceAlertAt",
    "updatedAt"
FROM "UserNotificationSettings";

DROP TABLE "UserNotificationSettings";
ALTER TABLE "new_UserNotificationSettings" RENAME TO "UserNotificationSettings";

PRAGMA foreign_keys=ON;
