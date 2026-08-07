import type { DistanceUnit, VolumeUnit } from "@/lib/settings/types";
import {
  kmToPreferred,
  preferredToKm,
  ratePerDistanceToPerKm,
  ratePerKmToPerDistance,
} from "@/lib/regional/distance";
import {
  consumptionToLPer100Km,
  convertConsumption,
  litersToPreferred,
  preferredToLiters,
  pricePerVolumeUnit,
  pricePerVolumeUnitToPerLiter,
} from "@/lib/regional/volume";

/**
 * State of the fuel cost calculator.
 *
 * Values are kept as **strings in the unit the user sees**, because that is
 * what an `<input>` holds — an empty field must stay empty, and "1.7" must not
 * become "1.7000000000000002" while typing. Conversion into metric happens
 * once, when a number is actually calculated with.
 *
 * The consequence is that the saved state is only meaningful together with the
 * units it was entered in, so both are stored and {@link migrateCalculatorValues}
 * rewrites the numbers when the user later switches km ↔ mi or L ↔ gal.
 */

export type CalculatorUnits = {
  distanceUnit: DistanceUnit;
  volumeUnit: VolumeUnit;
};

export type CalculatorValues = {
  // Basis
  distance: string;
  roundTrip: boolean;
  consumption: string;
  price: string;
  extraCost: string;
  passengers: string;
  // Tank
  tankSize: string;
  tankLevel: string;
  // Budget
  budget: string;
  // Commute
  commuteDistance: string;
  commuteReturn: boolean;
  commuteDaysPerWeek: string;
  commuteWeeksPerYear: string;
  // Comparison
  compareConsumption: string;
  comparePrice: string;
  compareAnnualDistance: string;
  compareSwitchCost: string;
  // Detour
  detourVolume: string;
  detourPrice: string;
  detourDistance: string;
  detourReturn: boolean;
  // Reimbursement
  reimbursementRate: string;
};

export type CalculatorValueKey = keyof CalculatorValues;

/**
 * How a stored number has to be rewritten when the unit preference changes.
 * `plain` covers counts, percentages and money — none of which depend on a
 * distance or volume unit.
 */
type FieldKind =
  | "plain"
  | "distance"
  | "volume"
  | "consumption"
  | "pricePerVolume"
  | "ratePerDistance";

const FIELD_KINDS: Record<string, FieldKind> = {
  distance: "distance",
  consumption: "consumption",
  price: "pricePerVolume",
  extraCost: "plain",
  passengers: "plain",
  tankSize: "volume",
  tankLevel: "plain",
  budget: "plain",
  commuteDistance: "distance",
  commuteDaysPerWeek: "plain",
  commuteWeeksPerYear: "plain",
  compareConsumption: "consumption",
  comparePrice: "pricePerVolume",
  compareAnnualDistance: "distance",
  compareSwitchCost: "plain",
  detourVolume: "volume",
  detourPrice: "pricePerVolume",
  detourDistance: "distance",
  reimbursementRate: "ratePerDistance",
};

/** Decimal places a converted field keeps — a distance of "100.00000001" helps nobody. */
const FIELD_DECIMALS: Record<FieldKind, number> = {
  plain: 2,
  distance: 0,
  volume: 1,
  consumption: 1,
  pricePerVolume: 3,
  ratePerDistance: 3,
};

/**
 * Defaults in metric storage units. They are converted into the user's units
 * on first use, so a US driver starts with round-ish miles and gallons instead
 * of the metric numbers translated to four decimal places.
 */
const METRIC_DEFAULTS = {
  distanceKm: 100,
  consumptionLPer100Km: 7.5,
  pricePerLiter: 1.75,
  tankLiters: 50,
  commuteKm: 20,
  compareConsumptionLPer100Km: 6,
  compareAnnualKm: 15_000,
  detourLiters: 40,
  /** Small discount at the cheaper pump — the case worth calculating. */
  detourDiscountPerLiter: 0.1,
  detourKm: 5,
  reimbursementRatePerKm: 0.3,
} as const;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toField(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "";
  return String(roundTo(value, decimals));
}

/** Nice round starting numbers instead of an intimidating empty form. */
export function createDefaultCalculatorValues(
  units: CalculatorUnits,
): CalculatorValues {
  const { distanceUnit, volumeUnit } = units;
  const distance = (km: number) => toField(kmToPreferred(km, distanceUnit), 0);
  const volume = (liters: number) =>
    toField(litersToPreferred(liters, volumeUnit), 1);
  const consumption = (lPer100Km: number) =>
    toField(convertConsumption(lPer100Km, distanceUnit, volumeUnit).value, 1);
  const price = (perLiter: number) =>
    toField(pricePerVolumeUnit(perLiter, volumeUnit), 2);

  return {
    distance: distance(METRIC_DEFAULTS.distanceKm),
    roundTrip: false,
    consumption: consumption(METRIC_DEFAULTS.consumptionLPer100Km),
    price: price(METRIC_DEFAULTS.pricePerLiter),
    extraCost: "",
    passengers: "1",
    tankSize: volume(METRIC_DEFAULTS.tankLiters),
    tankLevel: "25",
    budget: "50",
    commuteDistance: distance(METRIC_DEFAULTS.commuteKm),
    commuteReturn: true,
    commuteDaysPerWeek: "5",
    commuteWeeksPerYear: "46",
    compareConsumption: consumption(
      METRIC_DEFAULTS.compareConsumptionLPer100Km,
    ),
    comparePrice: price(METRIC_DEFAULTS.pricePerLiter),
    compareAnnualDistance: distance(METRIC_DEFAULTS.compareAnnualKm),
    compareSwitchCost: "",
    detourVolume: volume(METRIC_DEFAULTS.detourLiters),
    detourPrice: price(
      METRIC_DEFAULTS.pricePerLiter - METRIC_DEFAULTS.detourDiscountPerLiter,
    ),
    detourDistance: distance(METRIC_DEFAULTS.detourKm),
    detourReturn: true,
    reimbursementRate: toField(
      ratePerKmToPerDistance(
        METRIC_DEFAULTS.reimbursementRatePerKm,
        distanceUnit,
      ),
      2,
    ),
  };
}

/** Accepts a comma as decimal separator — half of Europe types it that way. */
export function parseNumberInput(value: string): number | null {
  const raw = value.trim().replace(",", ".");
  if (raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function convertField(
  value: string,
  kind: FieldKind,
  from: CalculatorUnits,
  to: CalculatorUnits,
): string {
  const parsed = parseNumberInput(value);
  if (parsed == null) return value;

  const decimals = FIELD_DECIMALS[kind];

  switch (kind) {
    case "distance":
      return toField(
        kmToPreferred(preferredToKm(parsed, from.distanceUnit), to.distanceUnit),
        decimals,
      );
    case "volume":
      return toField(
        litersToPreferred(
          preferredToLiters(parsed, from.volumeUnit),
          to.volumeUnit,
        ),
        decimals,
      );
    case "consumption":
      return toField(
        convertConsumption(
          consumptionToLPer100Km(parsed, from.distanceUnit, from.volumeUnit),
          to.distanceUnit,
          to.volumeUnit,
        ).value,
        decimals,
      );
    case "pricePerVolume":
      return toField(
        pricePerVolumeUnit(
          pricePerVolumeUnitToPerLiter(parsed, from.volumeUnit),
          to.volumeUnit,
        ),
        decimals,
      );
    case "ratePerDistance":
      return toField(
        ratePerKmToPerDistance(
          ratePerDistanceToPerKm(parsed, from.distanceUnit),
          to.distanceUnit,
        ),
        decimals,
      );
    case "plain":
    default:
      return value;
  }
}

/**
 * Rewrites saved values after a unit preference change so "100" does not turn
 * from 100 km into 100 mi behind the user's back.
 */
export function migrateCalculatorValues(
  values: CalculatorValues,
  from: CalculatorUnits,
  to: CalculatorUnits,
): CalculatorValues {
  if (
    from.distanceUnit === to.distanceUnit &&
    from.volumeUnit === to.volumeUnit
  ) {
    return values;
  }

  const migrated = { ...values };
  for (const [key, kind] of Object.entries(FIELD_KINDS)) {
    const current = migrated[key as CalculatorValueKey];
    if (typeof current !== "string") continue;
    migrated[key as CalculatorValueKey] = convertField(
      current,
      kind,
      from,
      to,
    ) as never;
  }
  return migrated;
}

/**
 * Keeps only the keys we know about and enforces the right primitive type, so
 * a stale or hand-edited localStorage entry can never crash the page.
 */
export function sanitizeCalculatorValues(
  raw: unknown,
  units: CalculatorUnits,
): CalculatorValues {
  const defaults = createDefaultCalculatorValues(units);
  if (raw == null || typeof raw !== "object") return defaults;

  const source = raw as Record<string, unknown>;
  const result = { ...defaults };

  for (const key of Object.keys(defaults) as CalculatorValueKey[]) {
    const value = source[key];
    const fallback = defaults[key];
    if (typeof fallback === "boolean") {
      if (typeof value === "boolean") result[key] = value as never;
    } else if (typeof value === "string") {
      result[key] = value as never;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = String(value) as never;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export const CALCULATOR_SECTIONS = [
  "vehicle",
  "route",
  "trip",
  "split",
  "tank",
  "budget",
  "commute",
  "compare",
  "detour",
  "reimbursement",
] as const;

export type CalculatorSectionId = (typeof CALCULATOR_SECTIONS)[number];

export type CalculatorSectionState = Record<CalculatorSectionId, boolean>;

/**
 * Only the trip section starts open. Everything else is one tap away, which is
 * what keeps the page usable on a phone despite the number of tools on it.
 */
export const DEFAULT_SECTION_STATE: CalculatorSectionState = {
  vehicle: false,
  route: false,
  trip: true,
  split: false,
  tank: false,
  budget: false,
  commute: false,
  compare: false,
  detour: false,
  reimbursement: false,
};

export function sanitizeSectionState(raw: unknown): CalculatorSectionState {
  const result = { ...DEFAULT_SECTION_STATE };
  if (raw == null || typeof raw !== "object") return result;

  const source = raw as Record<string, unknown>;
  for (const id of CALCULATOR_SECTIONS) {
    if (typeof source[id] === "boolean") result[id] = source[id] as boolean;
  }
  return result;
}
