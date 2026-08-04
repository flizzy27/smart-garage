import type { DistanceUnit, VolumeUnit } from "@/lib/settings/types";
import { KM_PER_MILE } from "@/lib/regional/distance";

/**
 * Volume is always **stored in litres** (`FuelEntry.liters`), exactly like
 * distance is always stored in kilometres. These helpers convert at the UI
 * boundary only, so switching the preference never rewrites existing data.
 *
 * "gal" means the **US liquid gallon** — the unit the feature was requested
 * for. The imperial gallon is deliberately not offered: silently mixing the
 * two would make fuel economy figures wrong by ~20%.
 */
export const LITERS_PER_US_GALLON = 3.785411784;

/** Conventional constant to turn L/100 km into US MPG. */
const MPG_FACTOR = 235.214583;

export function volumeUnitLabel(unit: VolumeUnit): string {
  return unit === "gal" ? "gal" : "L";
}

export function litersToPreferred(liters: number, unit: VolumeUnit): number {
  return unit === "gal" ? liters / LITERS_PER_US_GALLON : liters;
}

export function preferredToLiters(value: number, unit: VolumeUnit): number {
  return unit === "gal" ? value * LITERS_PER_US_GALLON : value;
}

export function formatVolumeValue(
  liters: number,
  locale: string,
  unit: VolumeUnit,
  fractionDigits = 2,
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(litersToPreferred(liters, unit));
}

export function formatVolume(
  liters: number,
  locale: string,
  unit: VolumeUnit,
  fractionDigits = 2,
): string {
  return `${formatVolumeValue(liters, locale, unit, fractionDigits)} ${volumeUnitLabel(unit)}`;
}

/** Prefill value for a volume form input, in the user's unit. */
export function formVolumeValue(
  liters: number | null | undefined,
  unit: VolumeUnit,
): string {
  if (liters == null) return "";
  return String(Math.round(litersToPreferred(liters, unit) * 1000) / 1000);
}

export function parseFormVolumeToLiters(
  value: FormDataEntryValue | null,
  unit: VolumeUnit,
): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return preferredToLiters(parsed, unit);
}

/**
 * Fuel economy is the one place where the unit pair changes the *shape* of the
 * number, not just its scale: gallons + miles is conventionally expressed as
 * miles per gallon (higher = better), everything else as volume per 100
 * distance (lower = better). Callers must therefore render the label this
 * returns instead of hardcoding "L/100km".
 */
export type ConsumptionDisplay = {
  /** Numeric value already converted into the target unit pair. */
  value: number;
  /** Unit suffix, e.g. "MPG" or "L/100 km". */
  unit: string;
  /** True when a *higher* number is better (MPG). */
  higherIsBetter: boolean;
};

export function consumptionUnitLabel(
  distanceUnit: DistanceUnit,
  volumeUnit: VolumeUnit,
): string {
  if (volumeUnit === "gal" && distanceUnit === "mi") return "MPG";
  return `${volumeUnitLabel(volumeUnit)}/100 ${distanceUnit}`;
}

export function convertConsumption(
  litersPer100Km: number,
  distanceUnit: DistanceUnit,
  volumeUnit: VolumeUnit,
): ConsumptionDisplay {
  if (volumeUnit === "gal" && distanceUnit === "mi") {
    return {
      value: litersPer100Km > 0 ? MPG_FACTOR / litersPer100Km : 0,
      unit: "MPG",
      higherIsBetter: true,
    };
  }

  // Volume consumed over 100 units of the preferred distance.
  const kmPer100Units = distanceUnit === "mi" ? 100 * KM_PER_MILE : 100;
  const liters = (litersPer100Km / 100) * kmPer100Units;

  return {
    value: litersToPreferred(liters, volumeUnit),
    unit: consumptionUnitLabel(distanceUnit, volumeUnit),
    higherIsBetter: false,
  };
}

export function formatConsumption(
  litersPer100Km: number,
  locale: string,
  distanceUnit: DistanceUnit,
  volumeUnit: VolumeUnit,
): string {
  const { value, unit } = convertConsumption(litersPer100Km, distanceUnit, volumeUnit);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted} ${unit}`;
}

/** Price per litre → price per preferred volume unit (same currency). */
export function pricePerVolumeUnit(
  pricePerLiter: number,
  unit: VolumeUnit,
): number {
  return unit === "gal" ? pricePerLiter * LITERS_PER_US_GALLON : pricePerLiter;
}
