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

/**
 * Minimal shape of a maintenance-history row needed to decide which service
 * counts as the most recent one. Kept framework-free so it can be unit tested
 * without Prisma.
 */
export type ServiceRecordLike = {
  id: string;
  performedAt: Date;
  odometerKm: number | null;
  createdAt: Date;
};

/**
 * Compares two service records by real-world recency. Returns a positive
 * number when `a` was performed *later* than `b`, negative when `b` is later,
 * and 0 only when they are genuinely indistinguishable.
 *
 * Priority (per product spec, most significant first):
 *   1. odometer reading — a service at a higher km is the more recent one
 *   2. performed date
 *   3. stable DB tie-breaker: row `createdAt`, then `id`
 *
 * The row's own `createdAt` is used *only* as a last-resort tie-breaker — never
 * to decide which service is newest. This is what lets a user back-date an old
 * service without it hijacking the "last service" just because its row was
 * inserted most recently. Records without an odometer sort below those that
 * have one (they cannot advance a km-based interval).
 */
export function compareServiceRecency(
  a: ServiceRecordLike,
  b: ServiceRecordLike,
): number {
  const aKm = a.odometerKm ?? Number.NEGATIVE_INFINITY;
  const bKm = b.odometerKm ?? Number.NEGATIVE_INFINITY;
  if (aKm !== bKm) return aKm - bKm;

  const aTime = a.performedAt.getTime();
  const bTime = b.performedAt.getTime();
  if (aTime !== bTime) return aTime - bTime;

  const aCreated = a.createdAt.getTime();
  const bCreated = b.createdAt.getTime();
  if (aCreated !== bCreated) return aCreated - bCreated;

  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/**
 * Picks the record that represents the actual last service from a schedule's
 * full history. Returns `null` when there are no records. This — not the DB
 * insertion order — is the single source of truth for "last service".
 */
export function pickLastService<T extends ServiceRecordLike>(
  records: readonly T[],
): T | null {
  let best: T | null = null;
  for (const record of records) {
    if (best === null || compareServiceRecency(record, best) > 0) {
      best = record;
    }
  }
  return best;
}
