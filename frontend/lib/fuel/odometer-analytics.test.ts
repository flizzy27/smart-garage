import { describe, expect, it } from "vitest";
import { computeOdometerAnalytics } from "@/lib/fuel/odometer-analytics";
import type { SerializedOdometerLog } from "@/lib/repositories/odometer";

function log(
  id: string,
  vehicleId: string,
  odometerKm: number,
  recordedAt: string,
): SerializedOdometerLog {
  return {
    id,
    vehicleId,
    vehicleName: vehicleId,
    odometerKm,
    recordedAt: new Date(recordedAt).toISOString(),
    source: "manual",
    note: null,
  };
}

describe("computeOdometerAnalytics", () => {
  it("returns an empty result for no readings", () => {
    const result = computeOdometerAnalytics([]);
    expect(result.totalEntries).toBe(0);
    expect(result.avgKmPerDay).toBeNull();
    expect(result.readingHistory).toEqual([]);
  });

  it("derives distance and daily average from consecutive readings", () => {
    const result = computeOdometerAnalytics([
      log("a", "v1", 10_000, "2026-01-01"),
      log("b", "v1", 10_300, "2026-01-11"),
    ]);

    expect(result.trackedDistanceKm).toBe(300);
    expect(result.avgKmPerDay).toBeCloseTo(30, 5);
    expect(result.projectedAnnualKm).toBeCloseTo(30 * 365, 5);
    expect(result.latestReadingKm).toBe(10_300);
  });

  it("never subtracts one vehicle's odometer from another's", () => {
    // Without per-vehicle grouping this would report a 90,000 km "trip".
    const result = computeOdometerAnalytics([
      log("a", "v1", 10_000, "2026-01-01"),
      log("b", "v2", 100_000, "2026-01-02"),
      log("c", "v1", 10_100, "2026-01-03"),
    ]);

    expect(result.trackedDistanceKm).toBe(100);
    expect(result.segments).toHaveLength(1);
  });

  it("ignores a reading that goes backwards instead of counting it", () => {
    const result = computeOdometerAnalytics([
      log("a", "v1", 10_000, "2026-01-01"),
      log("b", "v1", 9_000, "2026-01-02"),
      log("c", "v1", 10_500, "2026-01-03"),
    ]);

    // Only the 9,000 → 10,500 step is a real forward move.
    expect(result.trackedDistanceKm).toBe(1_500);
    expect(result.segments).toHaveLength(1);
  });

  it("aggregates distance per calendar month", () => {
    const result = computeOdometerAnalytics([
      log("a", "v1", 1_000, "2026-01-01"),
      log("b", "v1", 1_500, "2026-01-20"),
      log("c", "v1", 2_000, "2026-02-10"),
    ]);

    expect(result.monthlyDistanceHistory).toEqual([
      { label: "2026-01", value: 500, date: "2026-01-01" },
      { label: "2026-02", value: 500, date: "2026-02-01" },
    ]);
  });
});
