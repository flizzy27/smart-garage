import type { ScheduleInterval } from "@/lib/maintenance/scheduler";

export const CIRCA_MONTHS_OPTIONS = [3, 6, 12, 24] as const;

export function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

export function circaLastPerformedDate(monthsAgo: number, reference = new Date()): Date {
  return subtractMonths(reference, monthsAgo);
}

/** When the owner is unsure — assume service was halfway through the interval ago. */
export function estimateLastService(
  interval: ScheduleInterval,
  currentOdometerKm: number,
  reference = new Date(),
): { lastPerformedAt: Date | null; lastOdometerKm: number | null } {
  if (interval.intervalMonths) {
    const monthsAgo = Math.max(1, Math.round(interval.intervalMonths / 2));
    const lastPerformedAt = subtractMonths(reference, monthsAgo);
    let lastOdometerKm: number | null = null;
    if (interval.intervalKm != null) {
      const kmAgo = Math.round(interval.intervalKm / 2);
      lastOdometerKm = Math.max(0, currentOdometerKm - kmAgo);
    }
    return { lastPerformedAt, lastOdometerKm };
  }

  if (interval.intervalKm != null) {
    const kmAgo = Math.round(interval.intervalKm / 2);
    return {
      lastPerformedAt: reference,
      lastOdometerKm: Math.max(0, currentOdometerKm - kmAgo),
    };
  }

  return { lastPerformedAt: null, lastOdometerKm: null };
}

export function formatDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
