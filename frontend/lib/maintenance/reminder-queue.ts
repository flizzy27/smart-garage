import type { SerializedSchedule } from "@/lib/repositories/maintenance";

const statusOrder = { OVERDUE: 0, DUE_SOON: 1, OK: 2 } as const;

export function scheduleNeedsSetup(schedule: SerializedSchedule): boolean {
  return schedule.dueStatus !== "OK" || schedule.lastPerformedAt == null;
}

export function sortSchedulesForSetup(
  schedules: SerializedSchedule[],
): SerializedSchedule[] {
  return [...schedules]
    .filter(scheduleNeedsSetup)
    .sort((a, b) => {
      const statusDiff = statusOrder[a.dueStatus] - statusOrder[b.dueStatus];
      if (statusDiff !== 0) return statusDiff;
      return (a.dueInDays ?? 9999) - (b.dueInDays ?? 9999);
    });
}

export function sortDueSchedules(schedules: SerializedSchedule[]): SerializedSchedule[] {
  return [...schedules]
    .filter((s) => s.dueStatus !== "OK")
    .sort((a, b) => {
      const statusDiff = statusOrder[a.dueStatus] - statusOrder[b.dueStatus];
      if (statusDiff !== 0) return statusDiff;
      return (a.dueInDays ?? 9999) - (b.dueInDays ?? 9999);
    });
}
