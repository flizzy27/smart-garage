import { prisma } from "@/lib/prisma";

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
} as const;

export async function findNotificationSettings(
  userId: string,
): Promise<NotificationSettingsRecord | null> {
  return prisma.userNotificationSettings.findUnique({
    where: { userId },
    select: selectFields,
  });
}

export async function upsertNotificationSettings(
  userId: string,
  data: Omit<NotificationSettingsRecord, "lastMaintenanceAlertAt">,
) {
  return prisma.userNotificationSettings.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
    },
    update: data,
  });
}

export async function touchMaintenanceAlertSent(userId: string) {
  return prisma.userNotificationSettings.update({
    where: { userId },
    data: { lastMaintenanceAlertAt: new Date() },
  });
}
