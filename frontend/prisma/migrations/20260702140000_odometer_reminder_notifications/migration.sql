-- Add configurable odometer update reminders to notification settings.
ALTER TABLE "UserNotificationSettings" ADD COLUMN "eventOdometerReminder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserNotificationSettings" ADD COLUMN "odometerReminderDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "UserNotificationSettings" ADD COLUMN "lastOdometerReminderAt" DATETIME;
