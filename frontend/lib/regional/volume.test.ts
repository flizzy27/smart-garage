import { describe, expect, it } from "vitest";
import {
  LITERS_PER_US_GALLON,
  consumptionUnitLabel,
  convertConsumption,
  formVolumeValue,
  litersToPreferred,
  parseFormVolumeToLiters,
  preferredToLiters,
  pricePerVolumeUnit,
  volumeUnitLabel,
} from "@/lib/regional/volume";

describe("volume conversion", () => {
  it("leaves litres untouched", () => {
    expect(litersToPreferred(42, "l")).toBe(42);
    expect(preferredToLiters(42, "l")).toBe(42);
    expect(volumeUnitLabel("l")).toBe("L");
  });

  it("converts to and from US gallons", () => {
    expect(litersToPreferred(LITERS_PER_US_GALLON, "gal")).toBeCloseTo(1, 10);
    expect(preferredToLiters(1, "gal")).toBeCloseTo(LITERS_PER_US_GALLON, 10);
    expect(volumeUnitLabel("gal")).toBe("gal");
  });

  it("round-trips a value without drift", () => {
    const liters = 57.3;
    expect(preferredToLiters(litersToPreferred(liters, "gal"), "gal")).toBeCloseTo(
      liters,
      10,
    );
  });
});

describe("parseFormVolumeToLiters", () => {
  it("stores gallons entered by the user as litres", () => {
    expect(parseFormVolumeToLiters("10", "gal")).toBeCloseTo(37.85411784, 6);
  });

  it("passes litres straight through", () => {
    expect(parseFormVolumeToLiters("10", "l")).toBe(10);
  });

  it("treats empty and invalid input as absent instead of zero", () => {
    expect(parseFormVolumeToLiters("", "l")).toBeUndefined();
    expect(parseFormVolumeToLiters(null, "l")).toBeUndefined();
    expect(parseFormVolumeToLiters("abc", "l")).toBeUndefined();
    expect(parseFormVolumeToLiters("-5", "l")).toBeUndefined();
  });

  it("prefills a form field in the user's unit", () => {
    expect(formVolumeValue(null, "gal")).toBe("");
    expect(formVolumeValue(LITERS_PER_US_GALLON, "gal")).toBe("1");
  });
});

describe("fuel economy", () => {
  it("reports MPG for the gallons + miles pair", () => {
    // 9.4 L/100km is roughly 25 MPG — the figure a US driver expects to see.
    const result = convertConsumption(9.4, "mi", "gal");
    expect(result.unit).toBe("MPG");
    expect(result.higherIsBetter).toBe(true);
    expect(result.value).toBeCloseTo(25.02, 1);
  });

  it("keeps L/100 km for the metric pair", () => {
    const result = convertConsumption(7.5, "km", "l");
    expect(result.unit).toBe("L/100 km");
    expect(result.higherIsBetter).toBe(false);
    expect(result.value).toBeCloseTo(7.5, 10);
  });

  it("converts the distance base for mixed unit pairs", () => {
    // Litres per 100 miles: 100 mi is 160.9344 km, so 7.5 L/100km becomes ~12.07.
    const result = convertConsumption(7.5, "mi", "l");
    expect(result.unit).toBe("L/100 mi");
    expect(result.value).toBeCloseTo(12.07, 2);
  });

  it("never divides by zero when no consumption is known", () => {
    expect(convertConsumption(0, "mi", "gal").value).toBe(0);
  });

  it("labels the unit pair consistently", () => {
    expect(consumptionUnitLabel("mi", "gal")).toBe("MPG");
    expect(consumptionUnitLabel("km", "gal")).toBe("gal/100 km");
    expect(consumptionUnitLabel("km", "l")).toBe("L/100 km");
  });
});

describe("pricePerVolumeUnit", () => {
  it("scales a per-litre price to a per-gallon price", () => {
    expect(pricePerVolumeUnit(1, "gal")).toBeCloseTo(LITERS_PER_US_GALLON, 10);
    expect(pricePerVolumeUnit(1.8, "l")).toBe(1.8);
  });
});
