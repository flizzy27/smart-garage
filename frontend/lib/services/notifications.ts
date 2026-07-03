import { getCurrentUserId } from "@/lib/auth/current-user";
import {
  dispatchToEnabledChannels,
  getEnabledChannels,
} from "@/lib/notifications/dispatch";
import {
  canDeliverNow,
  minIntervalElapsed,
} from "@/lib/notifications/schedule";
import { sendPushoverNotification, validatePushoverUser } from "@/lib/notifications/pushover";
import { sendTelegramNotification } from "@/lib/notifications/telegram";
import {
  findNotificationSettings,
  listUsersForNotificationScheduling,
  touchMaintenanceAlertSent,
  touchOdometerReminderSent,
  upsertNotificationSettings,
  type NotificationSettingsRecord,
} from "@/lib/repositories/notifications";
import { getUpcomingSchedulesForOwner } from "@/lib/repositories/maintenance";
import { findPreferencesForUser } from "@/lib/repositories/preferences";
import { formatDistance } from "@/lib/regional/distance";
import { listEditableVehiclesForOdometerReminder } from "@/lib/repositories/vehicles";
import type { NotificationSettingsInput } from "@/lib/validations/notifications";

export async function getNotificationSettingsForCurrentUser(): Promise<NotificationSettingsRecord | null> {
  const userId = await getCurrentUserId();
  return findNotificationSettings(userId);
}

export async function saveNotificationSettings(input: NotificationSettingsInput) {
  const userId = await getCurrentUserId();

  if (input.pushoverEnabled) {
    if (!input.pushoverUserKey?.trim() || !input.pushoverAppToken?.trim()) {
      throw new Error("Pushover user key and app token are required");
    }
    const validation = await validatePushoverUser(
      input.pushoverUserKey.trim(),
      input.pushoverAppToken.trim(),
    );
    if (!validation.ok) {
      throw new Error(validation.error);
    }
  }

  if (input.telegramEnabled) {
    if (!input.telegramBotToken?.trim() || !input.telegramChatId?.trim()) {
      throw new Error("Telegram bot token and chat ID are required");
    }
  }

  if (!input.deliveryImmediate && !input.deliveryScheduled) {
    throw new Error("Select at least one delivery option");
  }

  if (
    !input.eventMaintenanceOverdue &&
    !input.eventMaintenanceDueSoon &&
    !input.eventMaintenanceLogged &&
    !input.eventExpenseAdded &&
    !input.eventOdometerReminder
  ) {
    throw new Error("Select at least one notification event");
  }

  return upsertNotificationSettings(userId, {
    pushoverEnabled: input.pushoverEnabled,
    pushoverUserKey: input.pushoverUserKey?.trim() || null,
    pushoverAppToken: input.pushoverAppToken?.trim() || null,
    telegramEnabled: input.telegramEnabled,
    telegramBotToken: input.telegramBotToken?.trim() || null,
    telegramChatId: input.telegramChatId?.trim() || null,
    eventMaintenanceOverdue: input.eventMaintenanceOverdue,
    eventMaintenanceDueSoon: input.eventMaintenanceDueSoon,
    eventMaintenanceLogged: input.eventMaintenanceLogged,
    eventExpenseAdded: input.eventExpenseAdded,
    eventOdometerReminder: input.eventOdometerReminder,
    odometerReminderDays: input.odometerReminderDays,
    deliveryImmediate: input.deliveryImmediate,
    deliveryScheduled: input.deliveryScheduled,
    scheduledTime: input.scheduledTime ?? "08:00",
    scheduledDays: input.scheduledDays ?? "MO,TU,WE,TH,FR,SA,SU",
    minIntervalHours: input.minIntervalHours,
    quietHoursEnabled: input.quietHoursEnabled,
    quietHoursStart: input.quietHoursStart ?? "22:00",
    quietHoursEnd: input.quietHoursEnd ?? "07:00",
    timezone: input.timezone,
  });
}

export async function testAllNotificationChannels(
  settings: NotificationSettingsRecord,
  locale: "en" | "de",
) {
  const channels = getEnabledChannels(settings);
  if (channels.length === 0) {
    return { ok: false as const, error: "No notification channel enabled" };
  }

  const title = locale === "de" ? "Smart Garage Test" : "Smart Garage test";
  const message =
    locale === "de"
      ? "Testbenachrichtigung — alle aktivierten Kanäle sollten diese Nachricht erhalten."
      : "Test notification — all enabled channels should receive this message.";
  const telegramHtml =
    locale === "de"
      ? "<b>Smart Garage Test</b>\nTestbenachrichtigung an alle aktivierten Kanäle."
      : "<b>Smart Garage test</b>\nTest notification to all enabled channels.";

  const result = await dispatchToEnabledChannels(settings, {
    title,
    message,
    telegramHtml,
  });

  if (result.sentChannels.length === 0) {
    return { ok: false as const, error: result.errors.join("; ") };
  }

  return {
    ok: true as const,
    sentChannels: result.sentChannels,
    errors: result.errors,
  };
}

export async function testAllNotificationsForCurrentUser(locale: "en" | "de") {
  const userId = await getCurrentUserId();
  const settings = await findNotificationSettings(userId);

  if (!settings) {
    return { ok: false as const, error: "Save notification settings first" };
  }

  return testAllNotificationChannels(settings, locale);
}

export async function maybeSendMaintenanceAlerts(userId: string, locale: "en" | "de") {
  const settings = await findNotificationSettings(userId);
  if (!settings) return;

  if (getEnabledChannels(settings).length === 0) return;
  if (!canDeliverNow(settings)) return;

  if (minIntervalElapsed(settings.lastMaintenanceAlertAt, settings.minIntervalHours)) {
    await sendMaintenanceDueAlerts(userId, locale, settings);
  }

  if (
    settings.eventOdometerReminder &&
    minIntervalElapsed(
      settings.lastOdometerReminderAt,
      settings.odometerReminderDays * 24,
    )
  ) {
    await sendOdometerReminder(userId, locale, settings);
  }
}

/**
 * Background-worker entry point: iterates every user with notification
 * settings + at least one enabled channel and fires their due/overdue /
 * odometer alerts if delivery rules allow. Called on a schedule by the
 * instrumentation worker — NOT on page requests.
 */
export async function runMaintenanceAlertsForAllUsers() {
  const users = await listUsersForNotificationScheduling();
  for (const { userId, locale, settings } of users) {
    try {
      if (!canDeliverNow(settings)) continue;

      if (
        minIntervalElapsed(settings.lastMaintenanceAlertAt, settings.minIntervalHours)
      ) {
        await sendMaintenanceDueAlerts(userId, locale, settings);
      }

      if (
        settings.eventOdometerReminder &&
        minIntervalElapsed(
          settings.lastOdometerReminderAt,
          settings.odometerReminderDays * 24,
        )
      ) {
        await sendOdometerReminder(userId, locale, settings);
      }
    } catch {
      // Keep the worker resilient — one user failing must not stop others.
    }
  }
}

async function sendMaintenanceDueAlerts(
  userId: string,
  locale: "en" | "de",
  settings: NotificationSettingsRecord,
) {
  const upcoming = await getUpcomingSchedulesForOwner(userId, locale, 30);
  const matched = upcoming.filter((item) => {
    if (item.dueStatus === "OVERDUE") return settings.eventMaintenanceOverdue;
    if (item.dueStatus === "DUE_SOON") return settings.eventMaintenanceDueSoon;
    return false;
  });

  if (matched.length === 0) return;

  const title =
    locale === "de"
      ? `${matched.length} Wartung${matched.length === 1 ? "" : "en"}`
      : `${matched.length} maintenance item${matched.length === 1 ? "" : "s"}`;

  const lines = matched.slice(0, 8).map((item) => {
    const status =
      item.dueStatus === "OVERDUE"
        ? locale === "de"
          ? "überfällig"
          : "overdue"
        : locale === "de"
          ? "bald fällig"
          : "due soon";

    const detailParts: string[] = [];
    if (item.dueInDays != null) {
      const days = item.dueInDays;
      const daysLabel =
        locale === "de"
          ? days < 0
            ? `${Math.abs(days)} Tage drüber`
            : days === 0
              ? "heute"
              : `noch ${days} Tage`
          : days < 0
            ? `${Math.abs(days)} days past`
            : days === 0
              ? "today"
              : `${days} days left`;
      detailParts.push(daysLabel);
    }
    if (item.dueInKm != null) {
      const km = item.dueInKm;
      const kmLabel =
        locale === "de"
          ? km < 0
            ? `${Math.abs(km).toLocaleString("de-DE")} km drüber`
            : `noch ${km.toLocaleString("de-DE")} km`
          : km < 0
            ? `${Math.abs(km).toLocaleString("en-US")} km past`
            : `${km.toLocaleString("en-US")} km left`;
      detailParts.push(kmLabel);
    }

    const detail = detailParts.length > 0 ? ` (${detailParts.join(", ")})` : "";
    return `• ${item.vehicleName}: ${item.name} — ${status}${detail}`;
  });

  const message = lines.join("\n");
  const telegramText = `<b>${title}</b>\n${lines.join("\n")}`;

  const result = await dispatchToEnabledChannels(settings, {
    title,
    message,
    telegramHtml: telegramText,
    priority: matched.some((item) => item.dueStatus === "OVERDUE") ? 1 : 0,
  });

  if (result.sentChannels.length === 0) return;

  await touchMaintenanceAlertSent(userId);
}

async function sendOdometerReminder(
  userId: string,
  locale: "en" | "de",
  settings: NotificationSettingsRecord,
) {
  const vehicles = await listEditableVehiclesForOdometerReminder(userId);
  if (vehicles.length === 0) return;
  const preferences = await findPreferencesForUser(userId);

  const title =
    locale === "de" ? "Kilometerstand aktualisieren" : "Update odometer";
  const intro =
    locale === "de"
      ? "Bitte trage deinen aktuellen Kilometerstand ein."
      : "Please enter your current odometer reading.";
  const fallbackVehicle = locale === "de" ? "Fahrzeug" : "Vehicle";
  const lines = vehicles.slice(0, 6).map((vehicle) => {
    const label =
      [vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
      vehicle.licensePlate ||
      fallbackVehicle;
    return `- ${label}: ${formatDistance(
      vehicle.currentOdometerKm,
      locale,
      preferences.distanceUnit,
    )}`;
  });
  const more =
    vehicles.length > 6
      ? locale === "de"
        ? `\n+ ${vehicles.length - 6} weitere`
        : `\n+ ${vehicles.length - 6} more`
      : "";
  const message = `${intro}\n${lines.join("\n")}${more}`;

  const result = await dispatchToEnabledChannels(settings, {
    title,
    message,
    telegramHtml: `<b>${title}</b>\n${message}`,
  });

  if (result.sentChannels.length === 0) return;

  await touchOdometerReminderSent(userId);
}

export async function notifyMaintenanceLogged(
  userId: string,
  input: {
    title: string;
    vehicleLabel: string;
    performedAt: Date;
    costCents: number;
    currency: string;
  },
  locale: "en" | "de" = "de",
) {
  const settings = await findNotificationSettings(userId);
  if (!settings?.eventMaintenanceLogged) return;
  if (getEnabledChannels(settings).length === 0) return;
  if (!canDeliverNow(settings)) return;

  const date = input.performedAt.toLocaleDateString(locale === "de" ? "de-DE" : "en-US");
  const cost =
    input.costCents > 0
      ? `${(input.costCents / 100).toFixed(2)} ${input.currency}`
      : locale === "de"
        ? "keine Kosten"
        : "no cost";

  const title =
    locale === "de" ? "Service protokolliert" : "Service logged";
  const message =
    locale === "de"
      ? `${input.title} · ${input.vehicleLabel} · ${date} · ${cost}`
      : `${input.title} · ${input.vehicleLabel} · ${date} · ${cost}`;

  await dispatchToEnabledChannels(settings, {
    title,
    message,
    telegramHtml: `<b>${title}</b>\n${message}`,
  });
}

export async function notifyExpenseAdded(
  userId: string,
  expense: {
    description: string | null;
    amountCents: bigint | number;
    currency: string;
    vehicle: { make: string | null; model: string | null; licensePlate: string | null };
  },
  locale: "en" | "de" = "de",
) {
  const settings = await findNotificationSettings(userId);
  if (!settings?.eventExpenseAdded) return;
  if (getEnabledChannels(settings).length === 0) return;
  if (!canDeliverNow(settings)) return;

  const vehicleLabel =
    [expense.vehicle.make, expense.vehicle.model].filter(Boolean).join(" ") ||
    expense.vehicle.licensePlate ||
    (locale === "de" ? "Fahrzeug" : "Vehicle");
  const amount = (Number(expense.amountCents) / 100).toFixed(2);
  const label = expense.description || (locale === "de" ? "Ausgabe" : "Expense");

  const title = locale === "de" ? "Neue Ausgabe" : "New expense";
  const message = `${label} · ${vehicleLabel} · ${amount} ${expense.currency}`;

  await dispatchToEnabledChannels(settings, {
    title,
    message,
    telegramHtml: `<b>${title}</b>\n${message}`,
  });
}

// Keep individual channel tests for optional per-channel debugging
export async function testPushoverSettings(
  userKey: string,
  appToken: string,
  locale: "en" | "de",
) {
  const validation = await validatePushoverUser(userKey.trim(), appToken.trim());
  if (!validation.ok) return validation;

  const title = locale === "de" ? "Smart Garage Test" : "Smart Garage test";
  const message =
    locale === "de"
      ? "Pushover-Benachrichtigungen funktionieren."
      : "Pushover notifications are working.";

  return sendPushoverNotification({
    userKey: userKey.trim(),
    appToken: appToken.trim(),
    title,
    message,
  });
}

export async function testTelegramSettings(
  botToken: string,
  chatId: string,
  locale: "en" | "de",
) {
  const text =
    locale === "de"
      ? "<b>Smart Garage</b>\nTelegram-Benachrichtigungen funktionieren."
      : "<b>Smart Garage</b>\nTelegram notifications are working.";

  return sendTelegramNotification({
    botToken: botToken.trim(),
    chatId: chatId.trim(),
    text,
  });
}
