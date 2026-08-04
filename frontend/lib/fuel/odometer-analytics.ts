import type { FuelChartPoint } from "@/lib/fuel/analytics";
import type { SerializedOdometerLog } from "@/lib/repositories/odometer";

export type OdometerSegment = {
  id: string;
  fromDate: string;
  toDate: string;
  distanceKm: number;
  days: number;
  kmPerDay: number;
};

export type OdometerAnalytics = {
  totalEntries: number;
  firstReadingKm: number | null;
  latestReadingKm: number | null;
  latestReadingAt: string | null;
  /** Distance covered between the first and last reading. */
  trackedDistanceKm: number;
  avgKmPerDay: number | null;
  avgKmPerMonth: number | null;
  projectedAnnualKm: number | null;
  segments: OdometerSegment[];
  /** Odometer value over time. */
  readingHistory: FuelChartPoint[];
  /** Distance driven per calendar month. */
  monthlyDistanceHistory: FuelChartPoint[];
};

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 365 / 12;

function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

function daysBetween(startIso: string, endIso: string): number {
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
  return diff / MS_PER_DAY;
}

const EMPTY: OdometerAnalytics = {
  totalEntries: 0,
  firstReadingKm: null,
  latestReadingKm: null,
  latestReadingAt: null,
  trackedDistanceKm: 0,
  avgKmPerDay: null,
  avgKmPerMonth: null,
  projectedAnnualKm: null,
  segments: [],
  readingHistory: [],
  monthlyDistanceHistory: [],
};

/**
 * Turns raw odometer readings into the stats and chart series behind the
 * odometer page (issue #6).
 *
 * Readings are grouped per vehicle before differencing: two vehicles' odometers
 * are unrelated, and subtracting one from the other would invent huge negative
 * or positive jumps. Readings that go *backwards* for a vehicle (a correction,
 * or an engine/cluster swap) are skipped rather than counted as distance.
 */
export function computeOdometerAnalytics(
  logs: SerializedOdometerLog[],
): OdometerAnalytics {
  if (logs.length === 0) return EMPTY;

  const sorted = [...logs].sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime() ||
      a.odometerKm - b.odometerKm,
  );

  const byVehicle = new Map<string, SerializedOdometerLog[]>();
  for (const log of sorted) {
    const list = byVehicle.get(log.vehicleId) ?? [];
    list.push(log);
    byVehicle.set(log.vehicleId, list);
  }

  const segments: OdometerSegment[] = [];
  const monthlyDistance = new Map<string, number>();

  for (const vehicleLogs of byVehicle.values()) {
    for (let i = 1; i < vehicleLogs.length; i += 1) {
      const previous = vehicleLogs[i - 1];
      const current = vehicleLogs[i];
      const distanceKm = current.odometerKm - previous.odometerKm;
      if (distanceKm <= 0) continue;

      const days = Math.max(daysBetween(previous.recordedAt, current.recordedAt), 0);
      segments.push({
        id: current.id,
        fromDate: previous.recordedAt,
        toDate: current.recordedAt,
        distanceKm,
        days,
        kmPerDay: days > 0 ? distanceKm / days : 0,
      });

      const monthKey = current.recordedAt.slice(0, 7);
      monthlyDistance.set(monthKey, (monthlyDistance.get(monthKey) ?? 0) + distanceKm);
    }
  }

  segments.sort(
    (a, b) => new Date(a.toDate).getTime() - new Date(b.toDate).getTime(),
  );

  const trackedDistanceKm = segments.reduce((sum, s) => sum + s.distanceKm, 0);
  const trackedDays = segments.reduce((sum, s) => sum + s.days, 0);

  const avgKmPerDay =
    trackedDays > 0 && trackedDistanceKm > 0 ? trackedDistanceKm / trackedDays : null;

  const latest = sorted[sorted.length - 1];

  return {
    totalEntries: logs.length,
    firstReadingKm: sorted[0]?.odometerKm ?? null,
    latestReadingKm: latest?.odometerKm ?? null,
    latestReadingAt: latest?.recordedAt ?? null,
    trackedDistanceKm,
    avgKmPerDay,
    avgKmPerMonth: avgKmPerDay != null ? avgKmPerDay * DAYS_PER_MONTH : null,
    projectedAnnualKm: avgKmPerDay != null ? avgKmPerDay * 365 : null,
    segments,
    readingHistory: sorted.map((log) => ({
      label: shortDate(log.recordedAt),
      value: log.odometerKm,
      date: log.recordedAt,
    })),
    monthlyDistanceHistory: [...monthlyDistance.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, distance]) => ({
        label: month,
        value: distance,
        date: `${month}-01`,
      })),
  };
}
