"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import {
  saveNotificationSettings,
  testAllNotificationsForCurrentUser,
} from "@/lib/services/notifications";
import {
  notificationSettingsSchema,
  parseScheduledDays,
} from "@/lib/validations/notifications";

export type NotificationActionResult = {
  ok: boolean;
  error?: string;
  sentChannels?: string[];
  partialErrors?: string[];
};

function parseSettingsForm(formData: FormData) {
  return notificationSettingsSchema.parse({
    pushoverEnabled: formData.get("pushoverEnabled") === "on",
    pushoverUserKey: formData.get("pushoverUserKey") || null,
    pushoverAppToken: formData.get("pushoverAppToken") || null,
    telegramEnabled: formData.get("telegramEnabled") === "on",
    telegramBotToken: formData.get("telegramBotToken") || null,
    telegramChatId: formData.get("telegramChatId") || null,
    eventMaintenanceOverdue: formData.get("eventMaintenanceOverdue") === "on",
    eventMaintenanceDueSoon: formData.get("eventMaintenanceDueSoon") === "on",
    eventMaintenanceLogged: formData.get("eventMaintenanceLogged") === "on",
    eventExpenseAdded: formData.get("eventExpenseAdded") === "on",
    deliveryImmediate: formData.get("deliveryImmediate") === "on",
    deliveryScheduled: formData.get("deliveryScheduled") === "on",
    scheduledTime: formData.get("scheduledTime") || null,
    scheduledDays: parseScheduledDays(formData),
    minIntervalHours: formData.get("minIntervalHours") || 6,
    quietHoursEnabled: formData.get("quietHoursEnabled") === "on",
    quietHoursStart: formData.get("quietHoursStart") || null,
    quietHoursEnd: formData.get("quietHoursEnd") || null,
    timezone: formData.get("timezone") || "Europe/Berlin",
  });
}

function revalidateSettingsPaths() {
  revalidatePath("/settings");
  revalidatePath("/settings/notifications");
}

export async function saveNotificationSettingsAction(
  _prev: NotificationActionResult | null,
  formData: FormData,
): Promise<NotificationActionResult> {
  try {
    const parsed = parseSettingsForm(formData);
    await saveNotificationSettings(parsed);
    revalidateSettingsPaths();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}

export async function testAllNotificationsAction(
  _prev: NotificationActionResult | null,
): Promise<NotificationActionResult> {
  try {
    const locale = (await getLocale()) as Locale;
    const result = await testAllNotificationsForCurrentUser(locale);

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      sentChannels: result.sentChannels,
      partialErrors: result.errors.length > 0 ? result.errors : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Test notification failed",
    };
  }
}
