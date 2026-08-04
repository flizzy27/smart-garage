import { describe, expect, it } from "vitest";
import {
  sanitizeHiddenVehicleFields,
  serializeHiddenVehicleFields,
  sanitizeVolumeUnit,
} from "@/lib/settings/sanitize";

describe("sanitizeVolumeUnit", () => {
  it("accepts the known units", () => {
    expect(sanitizeVolumeUnit("l")).toBe("l");
    expect(sanitizeVolumeUnit("gal")).toBe("gal");
  });

  it("falls back to litres for anything unexpected", () => {
    expect(sanitizeVolumeUnit("imperial-gallon")).toBe("l");
    expect(sanitizeVolumeUnit(undefined)).toBe("l");
    expect(sanitizeVolumeUnit(7)).toBe("l");
  });
});

describe("hidden vehicle fields", () => {
  it("parses the comma-separated database column", () => {
    expect(sanitizeHiddenVehicleFields("hsn,tsn")).toEqual(["hsn", "tsn"]);
  });

  it("accepts an already-parsed array", () => {
    expect(sanitizeHiddenVehicleFields(["vin"])).toEqual(["vin"]);
  });

  it("drops unknown ids rather than hiding a field that does not exist", () => {
    expect(sanitizeHiddenVehicleFields("hsn,notAField,make")).toEqual(["hsn"]);
  });

  it("de-duplicates and trims", () => {
    expect(sanitizeHiddenVehicleFields(" hsn , hsn ,tsn")).toEqual(["hsn", "tsn"]);
  });

  it("treats empty and malformed input as nothing hidden", () => {
    expect(sanitizeHiddenVehicleFields("")).toEqual([]);
    expect(sanitizeHiddenVehicleFields(null)).toEqual([]);
    expect(sanitizeHiddenVehicleFields(42)).toEqual([]);
  });

  it("round-trips through the column format", () => {
    const value = serializeHiddenVehicleFields(["tsn", "hsn", "bogus"]);
    expect(value).toBe("tsn,hsn");
    expect(sanitizeHiddenVehicleFields(value)).toEqual(["tsn", "hsn"]);
  });
});
