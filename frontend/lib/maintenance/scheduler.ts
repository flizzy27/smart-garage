import type { MaintenanceDueStatus } from "@prisma/client";

export type ScheduleInterval = {
  intervalKm: number | null;
  intervalMonths: number | null;
};

export type LastService = {
  performedAt: Date | null;
  odometerKm: number | null;
};

export type ComputedDue = {
  nextDueAt: Date | null;
  nextDueOdometerKm: number | null;
  dueStatus: MaintenanceDueStatus;
  dueInDays: number | null;
  dueInKm: number | null;
};

/** Warning window before a service becomes overdue. Configurable per user. */
export type MaintenanceThresholds = {
  dueSoonDays: number;
  dueSoonKm: number;
};

export const DEFAULT_MAINTENANCE_THRESHOLDS: MaintenanceThresholds = {
  dueSoonDays: 30,
  dueSoonKm: 1500,
};

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function computeNextDue(
  interval: ScheduleInterval,
  last: LastService,
  currentOdometerKm: number,
  referenceDate: Date = new Date(),
  thresholds: MaintenanceThresholds = DEFAULT_MAINTENANCE_THRESHOLDS,
): ComputedDue {
  let nextDueAt: Date | null = null;
  let nextDueOdometerKm: number | null = null;

  if (interval.intervalMonths && last.performedAt) {
    nextDueAt = addMonths(last.performedAt, interval.intervalMonths);
  } else if (interval.intervalMonths && !last.performedAt) {
    nextDueAt = addMonths(referenceDate, interval.intervalMonths);
  }

  if (interval.intervalKm != null) {
    const baseKm = last.odometerKm ?? currentOdometerKm;
    nextDueOdometerKm = baseKm + interval.intervalKm;
  }

  const dueInDays =
    nextDueAt != null
      ? Math.ceil((nextDueAt.getTime() - referenceDate.getTime()) / 86_400_000)
      : null;

  const dueInKm =
    nextDueOdometerKm != null
      ? nextDueOdometerKm - currentOdometerKm
      : null;

  const dueStatus = resolveDueStatus(dueInDays, dueInKm, thresholds);

  return {
    nextDueAt,
    nextDueOdometerKm,
    dueStatus,
    dueInDays,
    dueInKm,
  };
}

export function resolveDueStatus(
  dueInDays: number | null,
  dueInKm: number | null,
  thresholds: MaintenanceThresholds = DEFAULT_MAINTENANCE_THRESHOLDS,
): MaintenanceDueStatus {
  const timeOverdue = dueInDays != null && dueInDays < 0;
  const timeDueSoon =
    dueInDays != null && dueInDays >= 0 && dueInDays <= thresholds.dueSoonDays;
  const kmOverdue = dueInKm != null && dueInKm < 0;
  const kmDueSoon =
    dueInKm != null && dueInKm >= 0 && dueInKm <= thresholds.dueSoonKm;

  if (timeOverdue || kmOverdue) return "OVERDUE";
  if (timeDueSoon || kmDueSoon) return "DUE_SOON";
  return "OK";
}

export function pickSoonestDue(a: ComputedDue, b: ComputedDue): ComputedDue {
  const aDays = a.dueInDays ?? Number.POSITIVE_INFINITY;
  const bDays = b.dueInDays ?? Number.POSITIVE_INFINITY;
  const aKm = a.dueInKm ?? Number.POSITIVE_INFINITY;
  const bKm = b.dueInKm ?? Number.POSITIVE_INFINITY;

  if (aDays !== bDays) return aDays <= bDays ? a : b;
  return aKm <= bKm ? a : b;
}
