import { describe, expect, it } from "vitest";
import { computeFuelAnalytics } from "@/lib/fuel/analytics";
import type { SerializedFuelEntry } from "@/lib/repositories/fuel";

function entry(
  id: string,
  filledAt: string,
  odometerKm: number | null,
  liters: number | null,
  totalCostCents: number,
): SerializedFuelEntry {
  return {
    id,
    vehicleId: "v1",
    vehicleName: "Test",
    filledAt: new Date(filledAt).toISOString(),
    odometerKm,
    liters,
    totalCostCents,
    currency: "EUR",
    stationName: null,
    note: null,
  };
}

describe("computeFuelAnalytics", () => {
  it("computes consumption from the distance between two fill-ups", () => {
    const result = computeFuelAnalytics([
      entry("a", "2026-01-01", 10_000, 40, 6_000),
      entry("b", "2026-01-15", 10_500, 40, 6_000),
    ]);

    // 40 L over 500 km.
    expect(result.avgConsumptionLPer100Km).toBeCloseTo(8, 5);
    expect(result.totalDistanceKm).toBe(500);
  });

  it("reports cost per 100 km in cents, not per kilometre", () => {
    const result = computeFuelAnalytics([
      entry("a", "2026-01-01", 10_000, 50, 7_500),
      entry("b", "2026-01-15", 10_500, 50, 7_500),
    ]);

    // 50 L / 500 km = 10 L/100km at 1.50 €/L = 15.00 € per 100 km.
    expect(result.avgCostPer100KmCents).toBe(1_500);
  });

  it("ignores a fill-up without an odometer reading for consumption", () => {
    const result = computeFuelAnalytics([
      entry("a", "2026-01-01", 10_000, 40, 6_000),
      entry("b", "2026-01-10", null, 40, 6_000),
    ]);

    expect(result.segments).toHaveLength(0);
    expect(result.avgConsumptionLPer100Km).toBeNull();
  });

  it("skips a backwards odometer instead of producing negative distance", () => {
    const result = computeFuelAnalytics([
      entry("a", "2026-01-01", 10_500, 40, 6_000),
      entry("b", "2026-01-10", 10_000, 40, 6_000),
    ]);

    expect(result.totalDistanceKm).toBe(0);
    expect(result.segments).toHaveLength(0);
  });

  it("still totals volume and cost when no odometer is tracked", () => {
    const result = computeFuelAnalytics([
      entry("a", "2026-01-01", null, 30, 4_500),
      entry("b", "2026-02-01", null, 30, 4_500),
    ]);

    expect(result.totalLiters).toBe(60);
    expect(result.totalCostCents).toBe(9_000);
    expect(result.avgPricePerLiter).toBeCloseTo(1.5, 5);
  });

  it("returns an empty analysis for no entries", () => {
    const result = computeFuelAnalytics([]);
    expect(result.totalEntries).toBe(0);
    expect(result.avgPricePerLiter).toBeNull();
    expect(result.projectedAnnualLiters).toBeNull();
  });
});
