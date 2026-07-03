import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/db/retry";
import { getEnabledChannels } from "@/lib/notifications/dispatch";

export type NotificationSettingsRecord = {
  pushoverEnabled: boolean;
  pushoverUserKey: string | null;
  pushoverAppToken: string | null;
  telegramEnabled: boolean;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  eventMaintenanceOverdue: boolean;
  eventMaintenanceDueSoon: boolean;
  eventMaintenanceLogged: boolean;
  eventExpenseAdded: boolean;
  eventOdometerReminder: boolean;
  odometerReminderDays: number;
  deliveryImmediate: boolean;
  deliveryScheduled: boolean;
  scheduledTime: string | null;
  scheduledDays: string | null;
  minIntervalHours: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  lastMaintenanceAlertAt: Date | null;
  lastOdometerReminderAt: Date | null;
};

const selectFields = {
  pushoverEnabled: true,
  pushoverUserKey: true,
  pushoverAppToken: true,
  telegramEnabled: true,
  telegramBotToken: true,
  telegramChatId: true,
  eventMaintenanceOverdue: true,
  eventMaintenanceDueSoon: true,
  eventMaintenanceLogged: true,
  eventExpenseAdded: true,
  eventOdometerReminder: true,
  odometerReminderDays: true,
  deliveryImmediate: true,
  deliveryScheduled: true,
  scheduledTime: true,
  scheduledDays: true,
  minIntervalHours: true,
  quietHoursEnabled: true,
  quietHoursStart: true,
  quietHoursEnd: true,
  timezone: true,
  lastMaintenanceAlertAt: true,
  lastOdometerReminderAt: true,
} as const;

export async function findNotificationSettings(
  userId: string,
): Promise<NotificationSettingsRecord | null> {
  return prisma.userNotificationSettings.findUnique({
    where: { userId },
    select: selectFields,
  });
}

/**
 * Returns the userId + locale (via preferences) + notification settings for
 * every user that has notification settings with at least one channel enabled.
 * Used by the background scheduler to deliver alerts without a page request.
 */
export async function listUsersForNotificationScheduling(): Promise<
  Array<{
    userId: string;
    locale: "en" | "de";
    settings: NotificationSettingsRecord;
  }>
> {
  const rows = await prisma.userNotificationSettings.findMany({
    select: {
      userId: true,
      ...selectFields,
      user: {
        select: {
          preferences: { select: { locale: true } },
        },
      },
    },
  });

  const result: Array<{
    userId: string;
    locale: "en" | "de";
    settings: NotificationSettingsRecord;
  }> = [];

  for (const row of rows) {
    const settings: NotificationSettingsRecord = {
      pushoverEnabled: row.pushoverEnabled,
      pushoverUserKey: row.pushoverUserKey,
      pushoverAppToken: row.pushoverAppToken,
      telegramEnabled: row.telegramEnabled,
      telegramBotToken: row.telegramBotToken,
      telegramChatId: row.telegramChatId,
      eventMaintenanceOverdue: row.eventMaintenanceOverdue,
      eventMaintenanceDueSoon: row.eventMaintenanceDueSoon,
      eventMaintenanceLogged: row.eventMaintenanceLogged,
      eventExpenseAdded: row.eventExpenseAdded,
      eventOdometerReminder: row.eventOdometerReminder,
      odometerReminderDays: row.odometerReminderDays,
      deliveryImmediate: row.deliveryImmediate,
      deliveryScheduled: row.deliveryScheduled,
      scheduledTime: row.scheduledTime,
      scheduledDays: row.scheduledDays,
      minIntervalHours: row.minIntervalHours,
      quietHoursEnabled: row.quietHoursEnabled,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      timezone: row.timezone,
      lastMaintenanceAlertAt: row.lastMaintenanceAlertAt,
      lastOdometerReminderAt: row.lastOdometerReminderAt,
    };

    if (getEnabledChannels(settings).length === 0) continue;
    if (
      !settings.eventMaintenanceOverdue &&
      !settings.eventMaintenanceDueSoon &&
      !settings.eventOdometerReminder
    ) {
      continue;
    }

    const localeRaw = row.user?.preferences?.locale;
    const locale: "en" | "de" = localeRaw === "en" ? "en" : "de";
    result.push({ userId: row.userId, locale, settings });
  }

  return result;
}

export async function upsertNotificationSettings(
  userId: string,
  data: Omit<
    NotificationSettingsRecord,
    "lastMaintenanceAlertAt" | "lastOdometerReminderAt"
  >,
) {
  return withDbRetry(() =>
    prisma.userNotificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    }),
  );
}

export async function touchMaintenanceAlertSent(userId: string) {
  return withDbRetry(() =>
    prisma.userNotificationSettings.update({
      where: { userId },
      data: { lastMaintenanceAlertAt: new Date() },
    }),
  );
}

export async function touchOdometerReminderSent(userId: string) {
  return withDbRetry(() =>
    prisma.userNotificationSettings.update({
      where: { userId },
      data: { lastOdometerReminderAt: new Date() },
    }),
  );
}
