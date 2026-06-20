-- CreateTable
CREATE TABLE "UserNotificationSettings" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "pushoverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushoverUserKey" TEXT,
    "pushoverAppToken" TEXT,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT false,
    "telegramBotToken" TEXT,
    "telegramChatId" TEXT,
    "maintenanceAlerts" BOOLEAN NOT NULL DEFAULT true,
    "lastMaintenanceAlertAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
