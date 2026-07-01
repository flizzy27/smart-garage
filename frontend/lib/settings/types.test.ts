import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAINTENANCE_DUE_SOON_DAYS,
  DEFAULT_MAINTENANCE_DUE_SOON_KM,
  clampMaintenanceDueSoonDays,
  clampMaintenanceDueSoonKm,
} from "./types";

describe("maintenance threshold clamping (defensive fallback for corrupted values)", () => {
  it("keeps in-range values unchanged", () => {
    expect(clampMaintenanceDueSoonKm(500)).toBe(500);
    expect(clampMaintenanceDueSoonDays(14)).toBe(14);
  });

  it("clamps out-of-range values", () => {
    expect(clampMaintenanceDueSoonKm(-10)).toBe(0);
    expect(clampMaintenanceDueSoonKm(999_999)).toBe(50_000);
    expect(clampMaintenanceDueSoonDays(-5)).toBe(0);
    expect(clampMaintenanceDueSoonDays(10_000)).toBe(365);
  });

  it("falls back to defaults for non-finite/NaN values (e.g. corrupted storage)", () => {
    expect(clampMaintenanceDueSoonKm(NaN)).toBe(DEFAULT_MAINTENANCE_DUE_SOON_KM);
    expect(clampMaintenanceDueSoonKm(Infinity)).toBe(DEFAULT_MAINTENANCE_DUE_SOON_KM);
    expect(clampMaintenanceDueSoonDays(NaN)).toBe(DEFAULT_MAINTENANCE_DUE_SOON_DAYS);
  });
});
