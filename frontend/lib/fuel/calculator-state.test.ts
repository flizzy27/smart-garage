import { describe, expect, it } from "vitest";
import {
  createDefaultCalculatorValues,
  migrateCalculatorValues,
  parseNumberInput,
  sanitizeCalculatorValues,
  sanitizeSectionState,
  DEFAULT_SECTION_STATE,
  type CalculatorUnits,
} from "@/lib/fuel/calculator-state";

const METRIC: CalculatorUnits = { distanceUnit: "km", volumeUnit: "l" };
const IMPERIAL: CalculatorUnits = { distanceUnit: "mi", volumeUnit: "gal" };

describe("parseNumberInput", () => {
  it("accepts a comma as decimal separator", () => {
    expect(parseNumberInput("7,5")).toBe(7.5);
    expect(parseNumberInput("7.5")).toBe(7.5);
  });

  it("treats an empty or broken field as absent, not as zero", () => {
    expect(parseNumberInput("")).toBeNull();
    expect(parseNumberInput("   ")).toBeNull();
    expect(parseNumberInput("abc")).toBeNull();
  });
});

describe("createDefaultCalculatorValues", () => {
  it("seeds metric defaults", () => {
    const values = createDefaultCalculatorValues(METRIC);
    expect(values.distance).toBe("100");
    expect(values.consumption).toBe("7.5");
    expect(values.tankSize).toBe("50");
    expect(values.reimbursementRate).toBe("0.3");
  });

  it("seeds imperial defaults in the units a US driver reads", () => {
    const values = createDefaultCalculatorValues(IMPERIAL);
    // 100 km ≈ 62 mi, 7.5 L/100 km ≈ 31.4 MPG, 50 L ≈ 13.2 gal.
    expect(values.distance).toBe("62");
    expect(Number(values.consumption)).toBeCloseTo(31.4, 1);
    expect(Number(values.tankSize)).toBeCloseTo(13.2, 1);
    // 0.30 €/km is 0.48 €/mi — a rate scales the other way from a distance.
    expect(Number(values.reimbursementRate)).toBeCloseTo(0.48, 2);
  });
});

describe("migrateCalculatorValues", () => {
  it("leaves everything alone when the units did not change", () => {
    const values = createDefaultCalculatorValues(METRIC);
    expect(migrateCalculatorValues(values, METRIC, METRIC)).toBe(values);
  });

  it("rewrites distances, volumes, consumption and prices", () => {
    const values = {
      ...createDefaultCalculatorValues(METRIC),
      distance: "100",
      consumption: "7.5",
      price: "1.8",
      tankSize: "50",
    };

    const migrated = migrateCalculatorValues(values, METRIC, IMPERIAL);

    expect(Number(migrated.distance)).toBeCloseTo(62, 0);
    expect(Number(migrated.consumption)).toBeCloseTo(31.4, 1);
    // A per-litre price becomes a per-gallon price — it goes up, not down.
    expect(Number(migrated.price)).toBeCloseTo(6.814, 2);
    expect(Number(migrated.tankSize)).toBeCloseTo(13.2, 1);
  });

  it("does not touch counts, percentages or money", () => {
    const values = {
      ...createDefaultCalculatorValues(METRIC),
      passengers: "3",
      tankLevel: "25",
      budget: "50",
      commuteDaysPerWeek: "5",
    };

    const migrated = migrateCalculatorValues(values, METRIC, IMPERIAL);

    expect(migrated.passengers).toBe("3");
    expect(migrated.tankLevel).toBe("25");
    expect(migrated.budget).toBe("50");
    expect(migrated.commuteDaysPerWeek).toBe("5");
  });

  it("keeps an empty field empty instead of turning it into a number", () => {
    const values = {
      ...createDefaultCalculatorValues(METRIC),
      extraCost: "",
      compareSwitchCost: "",
    };
    const migrated = migrateCalculatorValues(values, METRIC, IMPERIAL);
    expect(migrated.extraCost).toBe("");
    expect(migrated.compareSwitchCost).toBe("");
  });

  it("survives a round trip without meaningful drift", () => {
    const values = {
      ...createDefaultCalculatorValues(METRIC),
      distance: "250",
      tankSize: "60",
    };

    const back = migrateCalculatorValues(
      migrateCalculatorValues(values, METRIC, IMPERIAL),
      IMPERIAL,
      METRIC,
    );

    // Distances are shown as whole units, so a km → mi → km round trip can
    // lose up to one mile (1.6 km). That is the price of not showing the user
    // "155.3428 mi" in an input field.
    expect(Number(back.distance)).toBeGreaterThan(248);
    expect(Number(back.distance)).toBeLessThan(252);
    expect(Number(back.tankSize)).toBeCloseTo(60, 0);
  });

  it("preserves the boolean toggles", () => {
    const values = {
      ...createDefaultCalculatorValues(METRIC),
      roundTrip: true,
      commuteReturn: false,
    };
    const migrated = migrateCalculatorValues(values, METRIC, IMPERIAL);
    expect(migrated.roundTrip).toBe(true);
    expect(migrated.commuteReturn).toBe(false);
  });
});

describe("sanitizeCalculatorValues", () => {
  it("falls back to defaults for anything that is not an object", () => {
    expect(sanitizeCalculatorValues(null, METRIC)).toEqual(
      createDefaultCalculatorValues(METRIC),
    );
    expect(sanitizeCalculatorValues("nope", METRIC)).toEqual(
      createDefaultCalculatorValues(METRIC),
    );
  });

  it("keeps known fields and drops unknown ones", () => {
    const result = sanitizeCalculatorValues(
      { distance: "42", nonsense: "x", roundTrip: true },
      METRIC,
    ) as Record<string, unknown>;

    expect(result.distance).toBe("42");
    expect(result.roundTrip).toBe(true);
    expect(result.nonsense).toBeUndefined();
  });

  it("refuses a value of the wrong type", () => {
    const defaults = createDefaultCalculatorValues(METRIC);
    const result = sanitizeCalculatorValues(
      { distance: { evil: true }, roundTrip: "yes" },
      METRIC,
    );

    expect(result.distance).toBe(defaults.distance);
    expect(result.roundTrip).toBe(defaults.roundTrip);
  });

  it("accepts a number where a field is stored as a string", () => {
    expect(sanitizeCalculatorValues({ distance: 42 }, METRIC).distance).toBe(
      "42",
    );
  });
});

describe("sanitizeSectionState", () => {
  it("opens only the trip section by default", () => {
    expect(sanitizeSectionState(null)).toEqual(DEFAULT_SECTION_STATE);
    expect(DEFAULT_SECTION_STATE.trip).toBe(true);
    expect(DEFAULT_SECTION_STATE.tank).toBe(false);
  });

  it("restores saved open sections and ignores junk", () => {
    const result = sanitizeSectionState({
      tank: true,
      trip: false,
      unknown: true,
      commute: "yes",
    });

    expect(result.tank).toBe(true);
    expect(result.trip).toBe(false);
    expect(result.commute).toBe(false);
    expect("unknown" in result).toBe(false);
  });
});
