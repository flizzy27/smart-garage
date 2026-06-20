import type { NotificationSettingsRecord } from "@/lib/repositories/notifications";

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function parseTime(value: string | null | undefined): { hours: number; minutes: number } | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const weekdayMap: Record<string, string> = {
    Sun: "SU",
    Mon: "MO",
    Tue: "TU",
    Wed: "WE",
    Thu: "TH",
    Fri: "FR",
    Sat: "SA",
  };
  return {
    weekday: weekdayMap[weekday] ?? "MO",
    minutesOfDay: hour * 60 + minute,
  };
}

function minutesFromTime(time: { hours: number; minutes: number }) {
  return time.hours * 60 + time.minutes;
}

function isWithinRange(minutes: number, start: number, end: number) {
  if (start === end) return false;
  if (start < end) {
    return minutes >= start && minutes < end;
  }
  return minutes >= start || minutes < end;
}

export function isQuietHoursActive(
  settings: Pick<
    NotificationSettingsRecord,
    "quietHoursEnabled" | "quietHoursStart" | "quietHoursEnd" | "timezone"
  >,
  at: Date = new Date(),
): boolean {
  if (!settings.quietHoursEnabled) return false;
  const start = parseTime(settings.quietHoursStart);
  const end = parseTime(settings.quietHoursEnd);
  if (!start || !end) return false;
  const { minutesOfDay } = getZonedParts(at, settings.timezone);
  return isWithinRange(minutesOfDay, minutesFromTime(start), minutesFromTime(end));
}

export function isScheduledWindowOpen(
  settings: Pick<
    NotificationSettingsRecord,
    | "deliveryScheduled"
    | "scheduledTime"
    | "scheduledDays"
    | "timezone"
  >,
  at: Date = new Date(),
): boolean {
  if (!settings.deliveryScheduled) return true;
  const scheduledTime = parseTime(settings.scheduledTime);
  if (!scheduledTime) return false;

  const allowedDays = (settings.scheduledDays ?? "MO,TU,WE,TH,FR,SA,SU")
    .split(",")
    .map((day) => day.trim().toUpperCase())
    .filter((day): day is (typeof WEEKDAYS)[number] =>
      WEEKDAYS.includes(day as (typeof WEEKDAYS)[number]),
    );

  const { weekday, minutesOfDay } = getZonedParts(at, settings.timezone);
  if (!allowedDays.includes(weekday as (typeof WEEKDAYS)[number])) return false;

  const target = minutesFromTime(scheduledTime);
  return Math.abs(minutesOfDay - target) <= 30;
}

export function canDeliverNow(
  settings: NotificationSettingsRecord,
  at: Date = new Date(),
): boolean {
  if (isQuietHoursActive(settings, at)) return false;

  const immediateAllowed = settings.deliveryImmediate;
  const scheduledAllowed =
    settings.deliveryScheduled && isScheduledWindowOpen(settings, at);

  if (!settings.deliveryImmediate && !settings.deliveryScheduled) {
    return false;
  }

  if (settings.deliveryImmediate && settings.deliveryScheduled) {
    return immediateAllowed || scheduledAllowed;
  }

  if (settings.deliveryImmediate) return true;
  return scheduledAllowed;
}

export function minIntervalElapsed(
  lastSent: Date | null | undefined,
  minIntervalHours: number,
  at: Date = new Date(),
): boolean {
  if (!lastSent) return true;
  const elapsedMs = at.getTime() - lastSent.getTime();
  return elapsedMs >= minIntervalHours * 60 * 60 * 1000;
}
